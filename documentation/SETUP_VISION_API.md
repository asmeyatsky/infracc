# Quick Setup: Google Cloud Vision API

## 🚀 3-Step Setup

### Step 1: Enable Vision API

**Via GCP Console:**
1. Go to https://console.cloud.google.com/apis/library
2. Search for "Cloud Vision API"
3. Click **Enable**

**Via CLI:**
```bash
gcloud services enable vision.googleapis.com --project=YOUR_PROJECT_ID
```

### Step 2: Create API Key

1. Go to https://console.cloud.google.com/apis/credentials
2. Click **"Create Credentials"** > **"API Key"**
3. Copy the API key
4. (Optional) Click **"Restrict Key"** and select **"Cloud Vision API"**

### Step 3: Configure Environment Variable

**Create `.env` file** in `tco-calculator` directory:

```bash
cd tco-calculator
cp .env.example .env
```

**Edit `.env`** and add your API key:

```
REACT_APP_GOOGLE_VISION_API_KEY=your-actual-api-key-here
```

**Restart the dev server:**
```bash
npm start
```

## ✅ Verify Setup

1. Open the app
2. Go to **"Architecture Analyzer"** tab
3. You should see: **"✓ Google Cloud Vision API Configured"**

## 💰 Cost

- **Free**: First 1,000 requests/month
- **Paid**: $1.50 per 1,000 requests after free tier
- **Per diagram**: ~$0.0015

## 🆘 Troubleshooting

**"Vision API key not configured"**
- Check `.env` file exists in `tco-calculator/` directory
- Verify variable name: `REACT_APP_GOOGLE_VISION_API_KEY`
- Restart dev server after adding `.env`

**"API key not valid"**
- Verify API key is correct
- Check Vision API is enabled
- Verify API key restrictions allow Vision API

For detailed setup, see `VISION_API_SETUP.md`
