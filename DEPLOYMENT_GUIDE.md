# DermaScan AI – Production Deployment Guide

This guide walks you through deploying DermaScan across **MongoDB Atlas**, **Render**, and **Vercel** without losing any existing data, models, or functionality.

---

## Architecture Overview

| Component | Technology | Target Host | Root Directory |
| :--- | :--- | :--- | :--- |
| **Database** | MongoDB Atlas Cluster0 | Cloud MongoDB | *(Managed)* |
| **AI Service** | FastAPI + ONNX Runtime | Render Web Service | `dermascan_ai_service` |
| **Backend API** | Node.js + Express | Render Web Service | `dermascan_backend` |
| **Frontend UI** | React + Vite + Tailwind | Vercel Static Hosting | `dermascan_frontend` |

---

## Step 1: MongoDB Atlas Network Access (Cluster0)

Because cloud platforms like Render allocate dynamic outgoing IP addresses across cloud regions, your existing MongoDB Atlas cluster must allow incoming connections from Render:

1. Log in to your [MongoDB Atlas Console](https://cloud.mongodb.com).
2. In the left navigation menu under **Security**, select **Network Access**.
3. Check your **IP Access List**:
   - If `0.0.0.0/0` (Allow Access from Anywhere) is already present, no change is needed.
   - If not, click **+ Add IP Address** -> click **Allow Access from Anywhere** (`0.0.0.0/0`) -> enter a comment (e.g. `Render Backend Service`) -> click **Confirm**.
4. In the left menu under **Security**, select **Database Access**:
   - Confirm your database user has read/write permissions for your database.
5. In the left menu under **Deployment**, select **Database**:
   - Click **Connect** on `Cluster0` -> select **Drivers** (Node.js).
   - Copy your connection string (format: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/dermascan?retryWrites=true&w=majority`).
   - Keep this string ready for Step 2. *(Never commit this string to GitHub)*.

> [!NOTE]
> No database migration, table creation, or script execution is needed. The backend will connect to your existing collections seamlessly upon startup.

---

## Step 2: Deploy Backend & AI Service to Render

You can deploy using Render Blueprints (recommended) or create each web service manually.

### Method A: Deploy using Render Blueprint (Recommended)

1. Commit and push the latest changes to your GitHub repository:
   ```bash
   git add .
   git commit -m "Configure deployment for Render and Vercel"
   git push origin master
   ```
2. Log in to [dashboard.render.com](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository (`mannalsingh/Dermascan`).
5. Render will automatically detect [`render.yaml`](render.yaml) and configure both services:
   - `dermascan-ai-service`
   - `dermascan-backend`
6. Click **Apply**.
7. Once created, configure the remaining environment variables in each service (see below).

---

### Method B: Manual Service Creation on Render

If you prefer to configure each service manually:

#### 1. Deploy the AI Service (`dermascan-ai-service`)
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your repository: `mannalsingh/Dermascan`.
3. Fill in the service details:
   - **Name**: `dermascan-ai-service`
   - **Region**: Oregon (or nearest to you)
   - **Root Directory**: `dermascan_ai_service`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
4. Under **Environment Variables**, add:
   - `PYTHON_VERSION` = `3.11.6`
   - `BASE_URL` = `https://<your-ai-service-name>.onrender.com` *(Fill this with your actual Render service URL once generated)*
5. Click **Create Web Service**.
6. Wait for the build to finish and verify: visit `https://<your-ai-service-name>.onrender.com/health` in your browser. You should receive `{"status":"ok","message":"AI service is ready","stub_mode":false}`.

#### 2. Deploy the Backend (`dermascan-backend`)
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your repository: `mannalsingh/Dermascan`.
3. Fill in the service details:
   - **Name**: `dermascan-backend`
   - **Region**: Oregon (same region as AI Service)
   - **Root Directory**: `dermascan_backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Under **Environment Variables**, add:
   - `NODE_VERSION` = `18.18.0`
   - `MONGODB_URI` = `<Your MongoDB Atlas connection string from Step 1>`
   - `JWT_SECRET` = `<Generate a long random alphanumeric string>`
   - `JWT_EXPIRES_IN` = `7d`
   - `AI_SERVICE_URL` = `https://<your-ai-service-name>.onrender.com`
   - `AI_SERVICE_PUBLIC_URL` = `https://<your-ai-service-name>.onrender.com`
   - `CLIENT_URL` = `https://<your-frontend-app>.vercel.app` *(Leave empty initially or add after Step 3)*
5. Click **Create Web Service**.
6. Verify deployment: visit `https://<your-backend-name>.onrender.com/health`. You should receive `{"status":"ok","message":"DermaScan AI backend is running"}`.

---

## Step 3: Deploy Frontend to Vercel

1. Log in to [vercel.com](https://vercel.com) using your GitHub account.
2. Click **Add New...** -> **Project**.
3. Select your repository: `mannalsingh/Dermascan`.
4. In the configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and choose `dermascan_frontend`
   - **Build Command**: `npm run build` *(Default)*
   - **Output Directory**: `dist` *(Default)*
   - **Install Command**: `npm install` *(Default)*
5. Expand **Environment Variables** and add:
   - `VITE_API_URL` = `https://<your-backend-name>.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID` = `<Optional: your Google OAuth Client ID if enabled>`
6. Click **Deploy**.
7. Vercel will build and deploy your frontend within 1–2 minutes. You will receive a URL like `https://dermascan-frontend-xxxx.vercel.app`.

---

## Step 4: Final Linkage

1. Copy your live Vercel URL (e.g. `https://dermascan-frontend-xxxx.vercel.app`).
2. Go back to Render -> `dermascan-backend` -> **Environment**.
3. Set `CLIENT_URL` = `https://dermascan-frontend-xxxx.vercel.app`.
4. Click **Save Changes** (Render will automatically redeploy the backend with the new setting).

---

## Step 5: Verification Checklist

1. **AI Service Health**: Visit `https://<ai-service>.onrender.com/health` -> verify `has_session: true` and `stub_mode: false`.
2. **Backend Health**: Visit `https://<backend>.onrender.com/health` -> verify `status: "ok"`.
3. **Frontend Landing Page**: Open your Vercel URL -> verify the landing page renders smoothly.
4. **Registration / Login**: Register a test account or log in with an existing account to confirm MongoDB Atlas read/write access.
5. **Image Screening**:
   - Upload a test skin lesion image.
   - Verify the AI prediction (Benign / Malignant) and confidence score are computed.
   - Verify Grad-CAM heatmap loads correctly.
6. **Download Report**: Click **Download Clinical Report (PDF)** to verify PDFKit generation and download.
