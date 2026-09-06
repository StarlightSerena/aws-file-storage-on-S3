require('dotenv').config();
const express = require('express');
const AWS     = require('aws-sdk');
const multer  = require('multer');
const cors    = require('cors');
const path    = require('path');

const app = express();

// Enable CORS & JSON Parsing
app.use(cors());
app.use(express.json());

// Helper function to resolve environment variables
function getEnv(key1, key2, fallback = '') {
  return process.env[key1] || process.env[key2] || fallback;
}

// Multer Configuration (50MB Limit)
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

// Helper to format AWS SDK errors into clear, actionable messages
function formatAWSError(err, bucketName) {
  if (!err) return 'An unexpected error occurred.';
  if (err.code === 'NoSuchBucket' || (err.message && err.message.includes('The specified bucket does not exist'))) {
    return `S3 Bucket "${bucketName}" does not exist. Please update S3_BUCKET_NAME in Vercel Environment Variables.`;
  }
  if (err.code === 'AccessDenied') {
    return `Access Denied for bucket "${bucketName}". Check IAM user permissions in AWS Console.`;
  }
  if (err.code === 'InvalidAccessKeyId') {
    return `Invalid AWS Access Key ID. Please verify AWS_ACCESS_KEY_ID in Vercel Environment Variables.`;
  }
  if (err.code === 'SignatureDoesNotMatch') {
    return `AWS Secret Key mismatch. Please verify AWS_SECRET_ACCESS_KEY in Vercel Environment Variables.`;
  }
  return err.message || 'AWS S3 Error';
}

// Helper to create S3 instance per request/invocation
function getS3Client() {
  const accessKeyId     = getEnv('AWS_ACCESS_KEY_ID', 'ACCESS_KEY');
  const secretAccessKey = getEnv('AWS_SECRET_ACCESS_KEY', 'SECRET_KEY');
  const region          = getEnv('AWS_REGION', 'REGION', 'ap-south-1');
  const bucketName      = getEnv('S3_BUCKET_NAME', 'BUCKET');

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials missing. Please set AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY in Vercel environment variables.');
  }
  if (!bucketName) {
    throw new Error('S3 Bucket name missing. Please set S3_BUCKET_NAME in Vercel environment variables.');
  }

  const s3 = new AWS.S3({
    accessKeyId,
    secretAccessKey,
    region
  });

  return { s3, bucketName };
}

/* =========================================================
   0. REAL S3 HEALTH CHECK ENDPOINT (GET /api/health)
========================================================= */
const handleHealth = async (req, res) => {
  try {
    const { s3, bucketName } = getS3Client();
    await s3.headBucket({ Bucket: bucketName }).promise();
    res.json({
      connected: true,
      bucket: bucketName,
      status: 'S3 Connection Verified'
    });
  } catch (err) {
    const bucketName = getEnv('S3_BUCKET_NAME', 'BUCKET', 'Unspecified');
    const formattedMsg = formatAWSError(err, bucketName);
    console.error('[S3 HEALTH CHECK FAILED]', err.message);
    res.status(200).json({
      connected: false,
      bucket: bucketName,
      error: formattedMsg
    });
  }
};

app.get('/api/health', handleHealth);
app.get('/health', handleHealth);

/* =========================================================
   1. UPLOAD FILE TO AMAZON S3 (POST /api/upload & POST /upload)
========================================================= */
const handleUpload = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file selected for upload' });
    }

    const { s3, bucketName } = getS3Client();

    let folder = 'others';
    if (file.mimetype.startsWith('image/'))       folder = 'images';
    else if (file.mimetype === 'application/pdf') folder = 'pdf';

    const s3Key = `${folder}/${file.originalname}`;

    await s3.upload({
      Bucket:      bucketName,
      Key:         s3Key,
      Body:        file.buffer,
      ContentType: file.mimetype
    }).promise();

    console.log(`[S3 UPLOAD SUCCESS] Key: ${s3Key} | Size: ${file.size} bytes`);
    res.json({
      message: 'Upload Successful',
      key: s3Key,
      filename: file.originalname,
      size: file.size,
      folder: folder
    });

  } catch (err) {
    const bucketName = getEnv('S3_BUCKET_NAME', 'BUCKET', 'Unspecified');
    const formattedMsg = formatAWSError(err, bucketName);
    console.error('[S3 UPLOAD ERROR]', err.message);
    res.status(500).json({ error: formattedMsg });
  }
};

app.post('/api/upload', upload.single('file'), handleUpload);
app.post('/upload', upload.single('file'), handleUpload);

/* =========================================================
   2. LIST STORED FILES FROM AMAZON S3 (GET /api/files & GET /files)
========================================================= */
const handleList = async (req, res) => {
  try {
    const { s3, bucketName } = getS3Client();
    const data  = await s3.listObjectsV2({ Bucket: bucketName }).promise();
    const files = (data.Contents || []).map(f => ({
      key: f.Key,
      size: f.Size,
      lastModified: f.LastModified
    }));

    console.log(`[S3 LIST SUCCESS] ${files.length} object(s) fetched`);
    res.json(files);
  } catch (err) {
    const bucketName = getEnv('S3_BUCKET_NAME', 'BUCKET', 'Unspecified');
    const formattedMsg = formatAWSError(err, bucketName);
    console.error('[S3 LIST ERROR]', err.message);
    res.status(500).json({ error: formattedMsg });
  }
};

app.get('/api/files', handleList);
app.get('/files', handleList);

// Helper to reliably extract S3 object key from request URL/params regardless of nested slashes
function extractS3Key(req, prefix) {
  let key = req.params.filepath || req.params[0] || '';
  if (!key || key.length === 0) {
    const urlPath = (req.path || req.url || '').split('?')[0];
    const match = urlPath.match(new RegExp('(?:/api)?/' + prefix + '/(.*)'));
    if (match && match[1]) {
      key = match[1];
    }
  }
  try {
    return decodeURIComponent(key);
  } catch (e) {
    return key;
  }
}

/* =========================================================
   3. DOWNLOAD FILE FROM AMAZON S3
========================================================= */
const handleDownload = async (req, res) => {
  try {
    const key = extractS3Key(req, 'download');
    const filename = key.split('/').pop() || 'download';

    if (!key) {
      return res.status(400).json({ error: 'Filepath is required' });
    }

    const { s3, bucketName } = getS3Client();
    const data = await s3.getObject({
      Bucket: bucketName,
      Key:    key
    }).promise();

    res.setHeader('Content-Type', data.ContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data.Body);

    console.log(`[S3 DOWNLOAD SUCCESS] ${key}`);
  } catch (err) {
    const bucketName = getEnv('S3_BUCKET_NAME', 'BUCKET', 'Unspecified');
    console.error('[S3 DOWNLOAD ERROR]', err.message);
    if (err.code === 'NoSuchKey') {
      return res.status(404).json({ error: 'File not found in S3 storage' });
    }
    const formattedMsg = formatAWSError(err, bucketName);
    res.status(500).json({ error: formattedMsg });
  }
};

app.get(['/api/download/*filepath', '/api/download/*', '/api/download', '/download/*filepath', '/download/*', '/download'], handleDownload);

/* =========================================================
   4. DELETE FILE FROM AMAZON S3
========================================================= */
const handleDelete = async (req, res) => {
  try {
    const key = extractS3Key(req, 'delete');

    if (!key) {
      return res.status(400).json({ error: 'Filepath is required' });
    }

    const { s3, bucketName } = getS3Client();
    await s3.deleteObject({
      Bucket: bucketName,
      Key:    key
    }).promise();

    console.log(`[S3 DELETE SUCCESS] ${key}`);
    res.json({ message: 'File deleted from S3 successfully' });
  } catch (err) {
    const bucketName = getEnv('S3_BUCKET_NAME', 'BUCKET', 'Unspecified');
    const formattedMsg = formatAWSError(err, bucketName);
    console.error('[S3 DELETE ERROR]', err.message);
    res.status(500).json({ error: formattedMsg });
  }
};

app.delete(['/api/delete/*filepath', '/api/delete/*', '/api/delete', '/delete/*filepath', '/delete/*', '/delete'], handleDelete);

// Multer Error Handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds maximum allowed limit (50MB).' });
    }
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  if (err) {
    return res.status(500).json({ error: err.message || 'An unexpected error occurred.' });
  }
  next();
});

// Local Development Server Listener
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.use(express.static(path.join(__dirname, '../frontend')));
  app.listen(PORT, () => {
    console.log(`🚀 S3 Vault Local Server running on http://localhost:${PORT}`);
  });
}

// Export Express app for Vercel Serverless Function Execution
module.exports = app;
