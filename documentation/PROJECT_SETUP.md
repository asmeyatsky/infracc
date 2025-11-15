# InfraCC Project Setup - infracc-477905

## 🚀 Quick Start

Run the automated setup script:

```bash
bash scripts/setup-infracc.sh
```

This will:
1. ✅ Enable all required Google Cloud APIs
2. ✅ Create service account (`infracc-sa@infracc-477905.iam.gserviceaccount.com`)
3. ✅ Prompt you to create secrets (Gemini API key, etc.)
4. ✅ Grant secret access permissions
5. ✅ Download service account key
6. ✅ Create `.env` file with project configuration

## 📋 Project Information

- **Project ID**: `infracc-477905`
- **Service Account**: `infracc-sa@infracc-477905.iam.gserviceaccount.com`
- **Secrets Created**:
  - `gemini-api-key` - Gemini AI API key
  - `gcp-project-id` - Project ID (infracc-477905)
  - `gcp-api-key` - GCP API key (optional)

## 🔑 Creating Secrets

### Option 1: Use Setup Script (Recommended)

```bash
bash scripts/setup-infracc.sh
```

Follow the prompts to enter your API keys.

### Option 2: Manual Creation

#### Create Gemini API Key Secret

```bash
# Get your API key from: https://makersuite.google.com/app/apikey
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --project=infracc-477905
```

#### Create Project ID Secret

```bash
echo -n "infracc-477905" | gcloud secrets create gcp-project-id \
  --data-file=- \
  --project=infracc-477905
```

#### Create GCP API Key Secret (Optional)

```bash
echo -n "YOUR_GCP_API_KEY" | gcloud secrets create gcp-api-key \
  --data-file=- \
  --project=infracc-477905
```

## 🔐 Granting Access

The setup script automatically grants access. To do it manually:

```bash
SA_EMAIL="infracc-sa@infracc-477905.iam.gserviceaccount.com"

gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=infracc-477905

gcloud secrets add-iam-policy-binding gcp-project-id \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=infracc-477905

gcloud secrets add-iam-policy-binding gcp-api-key \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=infracc-477905
```

## ✅ Verification

### Check APIs are Enabled

```bash
gcloud services list --enabled --project=infracc-477905 | grep -E "secretmanager|cloudbilling|recommender"
```

### Check Secrets Exist

```bash
gcloud secrets list --project=infracc-477905
```

### Check Service Account

```bash
gcloud iam service-accounts describe infracc-sa@infracc-477905.iam.gserviceaccount.com \
  --project=infracc-477905
```

### Test Secret Access

```bash
gcloud secrets versions access latest \
  --secret=gemini-api-key \
  --project=infracc-477905
```

## 🔄 Updating Secrets

### Update Gemini API Key

```bash
echo -n "NEW_GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key \
  --data-file=- \
  --project=infracc-477905
```

### Update GCP API Key

```bash
echo -n "NEW_GCP_API_KEY" | gcloud secrets versions add gcp-api-key \
  --data-file=- \
  --project=infracc-477905
```

## 📝 Environment Variables

The setup script creates a `.env` file with:

```bash
REACT_APP_GCP_PROJECT_ID=infracc-477905
REACT_APP_SECRET_MANAGER_BACKEND=http://localhost:3001/api/secrets
REACT_APP_GCP_PRICING_BACKEND=http://localhost:3001/api/gcp/pricing
REACT_APP_GCP_BILLING_BACKEND=http://localhost:3001/api/gcp/billing
REACT_APP_GCP_RECOMMENDER_BACKEND=http://localhost:3001/api/gcp/recommender
```

## 🎯 Next Steps

1. ✅ Run setup script: `bash scripts/setup-infracc.sh`
2. ✅ Enter your Gemini API key when prompted
3. ✅ Set up backend proxy (see SECRET_MANAGER_SETUP.md)
4. ✅ Start application: `npm start`

## 📚 Additional Resources

- [Secret Manager Setup](./SECRET_MANAGER_SETUP.md) - Detailed Secret Manager guide
- [Quick Setup](./QUICK_SETUP.md) - Quick reference
- [Gemini Integration](./GEMINI_AND_PRICING_INTEGRATION.md) - API integration details
