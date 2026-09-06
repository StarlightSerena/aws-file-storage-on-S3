# Complete Test Results & Performance Matrix (Week 7 — Days 46–52)

This document contains the empirical testing records for the **Cloud-Based File Storage System**.

---

## 1. File Format Testing Matrix (Days 47 & 48)

| File Format | Category | File Size | Upload Result | S3 Storage Verification | Download Result | Overall Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `sample-image.jpg` | Image | 1.2 MB | Passed (200 OK) | Saved in `images/` | File opens cleanly | **PASS** |
| `logo.png` | Image | 850 KB | Passed (200 OK) | Saved in `images/` | File opens cleanly | **PASS** |
| `banner.webp` | Image | 420 KB | Passed (200 OK) | Saved in `images/` | File opens cleanly | **PASS** |
| `report.pdf` | Document | 3.4 MB | Passed (200 OK) | Saved in `pdf/` | PDF renders intact | **PASS** |
| `notes.txt` | Document | 15 KB | Passed (200 OK) | Saved in `others/` | Text content intact | **PASS** |
| `dataset.docx` | Document | 2.1 MB | Passed (200 OK) | Saved in `others/` | Word doc opens intact | **PASS** |

---

## 2. Performance & Response Time Matrix (Day 50)

| Payload Test Case | Transfer Size | Avg Upload Latency | Avg Download Latency | Backend Memory Overhead | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Small File** | < 500 KB | 140 ms | 65 ms | 28 MB | **OPTIMAL** |
| **Medium File** | 1 MB – 5 MB | 420 ms | 190 ms | 32 MB | **OPTIMAL** |
| **Large File** | 10 MB – 50 MB | 1,850 ms | 820 ms | 45 MB | **OPTIMAL** |
| **Batch (5 Files)** | 8.5 MB total | 1,120 ms | N/A (Sequential) | 38 MB | **OPTIMAL** |

---

## 3. Cross-Browser Compatibility Matrix (Day 51)

| Browser | OS | Drag & Drop | File Upload | Progress Bar | S3 Download | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Chrome v122+** | Windows / Linux | Supported | Passed | Smooth | Passed | **PASS** |
| **Microsoft Edge v122+** | Windows | Supported | Passed | Smooth | Passed | **PASS** |
| **Mozilla Firefox v123+** | Windows / Linux | Supported | Passed | Smooth | Passed | **PASS** |

---

## 4. Responsive Device Testing Matrix (Day 52)

| Target Viewport | Screen Width | Layout Behavior | Navigation Bar | Dropzone Scaling | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Desktop** | > 1024 px | 2-Column Grid (Sidebar + Main) | Full Sidebar | Expanded | **PASS** |
| **Tablet** | 700 px – 1024 px | Compact Grid | Collapsed Sidebar | Scaled | **PASS** |
| **Mobile** | < 700 px | 1-Column Stack | Horizontal Top Bar | Mobile Optimized | **PASS** |
