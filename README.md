# Cloud-Based File Storage System (Amazon S3 + AWS SDK + Vercel)

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?style=for-the-badge&logo=vercel)](https://aws-file-storage-s31.vercel.app)
[![AWS S3](https://img.shields.io/badge/AWS-S3_Cloud_Storage-orange?style=for-the-badge&logo=amazons3)](https://aws.amazon.com/s3/)

A secure, web-based cloud file storage application built with **HTML5, CSS3, JavaScript, Node.js, AWS SDK (v2), and Amazon S3**, hosted publicly on **Vercel Serverless Platform**.

---

## 🌐 Live Production Application

👉 **Live Public URL**: **[https://aws-file-storage-s31.vercel.app](https://aws-file-storage-s31.vercel.app)**

---

## 🏗 System & Vercel Architecture

```text
                 PUBLIC USER
                      │
                      ▼
             ┌────────────────┐
             │     VERCEL     │
             │    FRONTEND    │
             │ (HTML/CSS/JS)  │
             └───────┬────────┘
                     │
              /api/ Relative Calls
                     │
                     ▼
             ┌────────────────┐
             │ VERCEL NODE.JS │
             │ SERVERLESS API │
             │  (api/index)   │
             └───────┬────────┘
                     │
                  AWS SDK
                     │
                     ▼
             ┌────────────────┐
             │    AWS IAM     │
             │ Least Privilege│
             └───────┬────────┘
                     │
                     ▼
             ┌────────────────┐
             │   AMAZON S3    │
             │  FILE STORAGE  │
             └────────────────┘
```

---

## 📁 Repository Directory Structure

```text
aws-file-storage/
├── frontend/                  # Presentation Layer (HTML / CSS / JS)
│   ├── index.html             # Dashboard UI & Drag-and-Drop Dropzone
│   ├── style.css              # Custom Styling Tokens & Responsive Breakpoints
│   └── script.js              # Client Logic & Relative API Calls (/api/*)
│
├── api/                       # Vercel Serverless API Functions
│   └── index.js               # Exported Express Serverless Handler (/api/upload, /api/files, etc.)
│
├── vercel.json                # Vercel Routing & Rewrites Configuration
├── package.json               # Dependencies Manifest
├── .gitignore                 # Protected Secrets & Build Exclusions
├── setup-ec2.sh               # Optional EC2 Deployment Script
└── README.md                  # Comprehensive Documentation & Live Link
```

---

## 🔒 Security Compliance Matrix

- ✅ **Zero Secret Keys in Source Code**: AWS credentials are stored strictly in Vercel Environment Variables.
- ✅ **S3 Block Public Access = ENABLED**: S3 Bucket keeps public access blocked. Files are retrieved through controlled API streams.
- ✅ **IAM Least Privilege**: User restricted to `s3:ListBucket`, `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`.
- ✅ **CORS Protection**: CORS enabled on backend APIs and S3 bucket.

---

## ⚡ How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Run local server
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your web browser.
