# Google Cloud Vision API Setup Guide

## Quick Setup for Architecture Diagram Analyzer

Follow these steps to enable Google Cloud Vision API for accurate architecture diagram analysis.

### Step 1: Enable Vision API

```bash
# Set your project ID
export GCP_PROJECT_ID="your-project-id"

# Enable Vision API
gcloud services enable vision.googleapis.com --project=$GCP_PROJECT_ID
```

Or via GCP Console:
1. Go to [API Library](https://console.cloud.google.com/apis/library)
2. Search for "Cloud Vision API"
3. Click "Enable"

### Step 2: Create API Key

#### Option A: Via GCP Console (Recommended)

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" > "API Key"
3. Copy the API key
4. (Optional) Restrict the API key:
   - Click "Restrict Key"
   - Under "API restrictions", select "Restrict key"
   - Choose "Cloud Vision API"
   - Click "Save"

#### Option B: Via gcloud CLI

```bash
# Create API key
gcloud alpha services api-keys create \
  --display-name="Vision API Key" \
  --api-target=service=vision.googleapis.com \
  --project=$GCP_PROJECT_ID

# Get the key value
gcloud alpha services api-keys list --project=$GCP_PROJECT_ID
```

### Step 3: Configure Environment Variable

#### For Development (Local)

Create a `.env` file in the `tco-calculator` directory:

```bash
# .env
REACT_APP_GOOGLE_VISION_API_KEY=your-api-key-here
```

**Important**: Add `.env` to `.gitignore` to keep your API key secure:

```bash
echo ".env" >> .gitignore
```

#### For Production

Set the environment variable in your deployment platform:

**Vercel:**
```bash
vercel env add REACT_APP_GOOGLE_VISION_API_KEY
```

**Netlify:**
- Go to Site Settings > Environment Variables
- Add `REACT_APP_GOOGLE_VISION_API_KEY`

**Docker:**
```dockerfile
ENV REACT_APP_GOOGLE_VISION_API_KEY=your-api-key
```

**Kubernetes:**
```yaml
env:
  - name: REACT_APP_GOOGLE_VISION_API_KEY
    valueFrom:
      secretKeyRef:
        name: vision-api-key
        key: api-key
```

### Step 4: Restart Development Server

After adding the environment variable:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm start
```

### Step 5: Verify Setup

1. Open the application
2. Navigate to "Architecture Analyzer" tab
3. Upload a test diagram
4. Check browser console - you should see:
   - "Using Google Cloud Vision API" message
   - No "Vision API unavailable" warnings

### Testing the Setup

Create a test image with text labels like:
- "Web Server"
- "Database"
- "Load Balancer"

Upload it and verify components are detected correctly.

### Security Best Practices

1. **Restrict API Key**: Limit to Vision API only
2. **Add HTTP Referrer Restrictions** (for web apps):
   - In API key settings, add your domain
   - Example: `https://yourdomain.com/*`
3. **Set Usage Quotas**: Limit requests per day
4. **Rotate Keys Regularly**: Change API keys periodically
5. **Monitor Usage**: Check [API Dashboard](https://console.cloud.google.com/apis/dashboard)

### Cost Considerations

- **Free Tier**: First 1,000 units/month free
- **Pricing**: $1.50 per 1,000 units after free tier
- **Vision API Units**:
  - TEXT_DETECTION: 1 unit per image
  - LABEL_DETECTION: 1 unit per image
  - OBJECT_LOCALIZATION: 5 units per image

**Estimated Cost**: ~$0.0015 per architecture diagram analysis

### Troubleshooting

#### "Vision API error: API key not valid"
- Verify API key is correct
- Check API key restrictions
- Ensure Vision API is enabled

#### "CORS error"
- Vision API is called directly from browser
- No CORS issues expected
- If issues occur, check API key restrictions

#### "No components detected"
- Check if image has clear text labels
- Try a simpler diagram first
- Check browser console for errors

#### Environment variable not loading
- Restart development server after adding `.env`
- Verify variable name starts with `REACT_APP_`
- Check `.env` file is in correct location (`tco-calculator/.env`)

### API Key Restrictions Example

For production, restrict your API key:

```json
{
  "restrictions": {
    "apiTargets": [
      {
        "service": "vision.googleapis.com"
      }
    ],
    "browserKeyRestrictions": {
      "allowedReferrers": [
        "https://yourdomain.com/*",
        "https://*.yourdomain.com/*"
      ]
    }
  }
}
```

### Alternative: Service Account (For Backend)

If you prefer server-side processing:

1. Create Service Account:
```bash
gcloud iam service-accounts create vision-api-sa \
  --display-name="Vision API Service Account"
```

2. Grant Role:
```bash
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:vision-api-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/ml.developer"
```

3. Create Key:
```bash
gcloud iam service-accounts keys create key.json \
  --iam-account=vision-api-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com
```

Note: Service account requires backend API server implementation.

### Next Steps

Once configured:
1. Test with sample architecture diagrams
2. Review detected components
3. Adjust component specifications if needed
4. Use calculated costs in TCO comparisons

### Support

For issues:
- Check [Vision API Documentation](https://cloud.google.com/vision/docs)
- Review [API Quotas](https://console.cloud.google.com/apis/api/vision.googleapis.com/quotas)
- Check [Billing](https://console.cloud.google.com/billing)
