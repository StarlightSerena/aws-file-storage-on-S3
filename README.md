# Cloud-Based File Storage System (Vercel & AWS S3)

A secure web-based cloud file storage application built with **HTML5, CSS3, JavaScript, Node.js, AWS SDK (v2), and Amazon S3**, optimized for **Vercel Serverless Deployment**.

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
├── frontend/                  # Presentation Layer
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
└── README.md                  # Comprehensive Documentation
```

---

## 🚀 How to Deploy on Vercel (Step-by-Step)

### Step 1: Push Code to GitHub
1. Create a repository on **GitHub** (e.g. `cloud-file-storage`).
2. Push your project files:
   ```bash
   git init
   git add .
   git commit -m "Deploy to Vercel"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/cloud-file-storage.git
   git push -u origin main
   ```

---

### Step 2: Import Project in Vercel
1. Log in to your **[Vercel Dashboard](https://vercel.com/)**.
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`cloud-file-storage`).
4. **Project Settings**:
   - **Framework Preset**: `Other` (or `Other / Node.js`)
   - **Root Directory**: `./` (Leave as default)
   - **Build Command**: *(Leave empty)*
   - **Output Directory**: *(Leave empty)*

---

### Step 3: Configure Vercel Environment Variables
Under **Environment Variables** in Vercel Project Settings, add the following 4 variables:

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `AWS_ACCESS_KEY_ID` | Your AWS IAM User Access Key | `AKIA33OIEF...` |
| `AWS_SECRET_ACCESS_KEY` | Your AWS IAM User Secret Key | `V/RWxOe8...` |
| `AWS_REGION` | AWS S3 Bucket Region | `ap-south-1` |
| `S3_BUCKET_NAME` | Name of your S3 Bucket | `yourname-file-storage` |

*(Note: The application also supports legacy variable names `ACCESS_KEY`, `SECRET_KEY`, `REGION`, `BUCKET` as automatic fallbacks).*

---

### Step 4: Click Deploy!
1. Click **Deploy**.
2. Once complete, Vercel will generate your live public URL, e.g.:
   👉 **`https://cloud-file-storage-username.vercel.app`**

---

## 🔒 Security Compliance Matrix

- ✅ **Zero Secret Keys in Source Code**: AWS credentials are stored strictly in Vercel Environment Variables or local `.env`.
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
