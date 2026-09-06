require('dotenv').config();
const express = require('express');
const AWS     = require('aws-sdk');
const multer  = require('multer');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve index.html at root
app.use(express.static(path.join(__dirname)));

// AWS CONFIG
AWS.config.update({
  accessKeyId:     process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
  region:          process.env.REGION
});

const s3     = new AWS.S3();
const upload = multer({ storage: multer.memoryStorage() });

/* =======================
   UPLOAD
   POST /upload
======================= */
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).send('No file provided');

    let folder = 'others';
    if (file.mimetype.startsWith('image/'))       folder = 'images';
    else if (file.mimetype === 'application/pdf') folder = 'pdf';

    await s3.upload({
      Bucket:      process.env.BUCKET,
      Key:         `${folder}/${file.originalname}`,
      Body:        file.buffer,
      ContentType: file.mimetype
    }).promise();

    console.log(`[UPLOAD] ${folder}/${file.originalname}`);
    res.send('Upload Success');

  } catch (err) {
    console.error('[UPLOAD ERROR]', err.message);
    res.status(500).send(err.message);
  }
});

/* =======================
   LIST FILES
   GET /files
   Returns: string[]
======================= */
app.get('/files', async (req, res) => {
  try {
    const data  = await s3.listObjectsV2({ Bucket: process.env.BUCKET }).promise();
    const files = (data.Contents || []).map(f => f.Key);
    console.log(`[LIST] ${files.length} file(s)`);
    res.json(files);
  } catch (err) {
    console.error('[LIST ERROR]', err.message);
    res.status(500).send(err.message);
  }
});

/* =======================
   DOWNLOAD
   GET /download/*filepath
   Express 5 wildcard syntax: *name
======================= */
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

    console.log(`[DOWNLOAD] ${key}`);

  } catch (err) {
    console.error('[DOWNLOAD ERROR]', err.message);
    if (err.code === 'NoSuchKey') return res.status(404).send('File not found');
    res.status(500).send(err.message);
  }
});

/* =======================
   DELETE
   DELETE /delete/*filepath
   Express 5 wildcard syntax: *name
======================= */
app.delete('/delete/*filepath', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.filepath);

    await s3.deleteObject({
      Bucket: process.env.BUCKET,
      Key:    key
    }).promise();

    console.log(`[DELETE] ${key}`);
    res.send('Deleted');

  } catch (err) {
    console.error('[DELETE ERROR]', err.message);
    res.status(500).send(err.message);
  }
});

/* =======================
   START
======================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  ✅ Server running → http://localhost:${PORT}`);
  console.log(`  📦 Bucket : ${process.env.BUCKET}`);
  console.log(`  🌍 Region : ${process.env.REGION}\n`);
});
