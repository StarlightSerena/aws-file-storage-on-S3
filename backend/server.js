require('dotenv').config();
const express = require('express');
const AWS     = require('aws-sdk');
const multer  = require('multer');
const cors    = require('cors');
const path    = require('path');

const app = express();

// Security: Enable CORS & JSON Body Parsing
app.use(cors());
app.use(express.json());

// Telemetry & Performance Middleware (Day 50 Performance Analysis)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP ${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Serve static frontend files from ../frontend directory (Day 34 UI)
app.use(express.static(path.join(__dirname, '../frontend')));

// AWS SDK Configuration (Kept strictly on Backend — Day 40 Security)
AWS.config.update({
  accessKeyId:     process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
  region:          process.env.REGION
});

const s3 = new AWS.S3();

// File Validation & Multer Configuration (Day 36 Validation)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB Limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!file.originalname) {
      return cb(new Error('Invalid file payload'), false);
    }
    cb(null, true);
  }
});

/* =========================================================
   1. UPLOAD FILE TO AMAZON S3 (POST /upload) - Day 41
   Categorizes into images/, pdf/, or others/
========================================================= */
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file selected for upload' });
    }

    let folder = 'others';
    if (file.mimetype.startsWith('image/'))       folder = 'images';
    else if (file.mimetype === 'application/pdf') folder = 'pdf';

    const s3Key = `${folder}/${file.originalname}`;

    await s3.upload({
      Bucket:      process.env.BUCKET,
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
    console.error('[S3 UPLOAD ERROR]', err.message);
    // Day 43: User-friendly error response without exposing AWS secrets or stack traces
    res.status(500).json({ error: 'Upload failed: ' + (err.message || 'Server error') });
  }
});

/* =========================================================
   2. LIST STORED FILES FROM AMAZON S3 (GET /files) - Day 46
========================================================= */
app.get('/files', async (req, res) => {
  try {
    const data  = await s3.listObjectsV2({ Bucket: process.env.BUCKET }).promise();
    const files = (data.Contents || []).map(f => ({
      key: f.Key,
      size: f.Size,
      lastModified: f.LastModified
    }));

    console.log(`[S3 LIST SUCCESS] ${files.length} object(s) fetched`);
    res.json(files);
  } catch (err) {
    console.error('[S3 LIST ERROR]', err.message);
    res.status(500).json({ error: 'Failed to retrieve files from S3' });
  }
});

/* =========================================================
   3. DOWNLOAD FILE FROM AMAZON S3 (GET /download/*filepath) - Day 42
========================================================= */
app.get('/download/*filepath', async (req, res) => {
  try {
    const key      = decodeURIComponent(req.params.filepath);
    const filename = key.split('/').pop();

    const data = await s3.getObject({
      Bucket: process.env.BUCKET,
      Key:    key
    }).promise();

    res.setHeader('Content-Type', data.ContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data.Body);

    console.log(`[S3 DOWNLOAD SUCCESS] ${key}`);
  } catch (err) {
    console.error('[S3 DOWNLOAD ERROR]', err.message);
    if (err.code === 'NoSuchKey') {
      return res.status(404).json({ error: 'File not found in S3 storage' });
    }
    res.status(500).json({ error: 'Download failed. Please check the file path.' });
  }
});

/* =========================================================
   4. DELETE FILE FROM AMAZON S3 (DELETE /delete/*filepath)
========================================================= */
app.delete('/delete/*filepath', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.filepath);

    await s3.deleteObject({
      Bucket: process.env.BUCKET,
      Key:    key
    }).promise();

    console.log(`[S3 DELETE SUCCESS] ${key}`);
    res.json({ message: 'File deleted from S3 successfully' });
  } catch (err) {
    console.error('[S3 DELETE ERROR]', err.message);
    res.status(500).json({ error: 'Delete failed. Unable to remove object from S3.' });
  }
});

// Multer Error Handling Middleware
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

/* =========================================================
   SERVER START
========================================================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n========================================================`);
  console.log(`🚀 S3 Vault Server Active → http://localhost:${PORT}`);
  console.log(`📦 AWS S3 Bucket          : ${process.env.BUCKET}`);
  console.log(`🌍 AWS Region             : ${process.env.REGION}`);
  console.log(`========================================================\n`);
});
