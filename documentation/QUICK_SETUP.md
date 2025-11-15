# Quick Setup Guide - InfraCC

## 🚀 One-Command Setup

Run the complete setup script to enable all APIs and set up Secret Manager:

```bash
bash scripts/setup-complete.sh [PROJECT_ID]
```

Or if you have a default project set:

```bash
bash scripts/setup-complete.sh
```

This script will:
1. ✅ Enable all required Google Cloud APIs
2. ✅ Create service account
3. ✅ Guide you through creating secrets
4. ✅ Grant secret access permissions
5. ✅ Download service account key

## 📝 Step-by-Step Manual Setup

### Step 1: Enable APIs

```bash
bash scripts/enable-gcp-apis.sh [PROJECT_ID]
```

This enables:
- Secret Manager API
- Cloud Billing API
- Cloud Pricing API
- Recommender API
- Service Usage API
- And more...

### Step 2: Create Secrets

```bash
bash scripts/create-secrets.sh [PROJECT_ID]
```

This will prompt you to create:
- `gemini-api-key` - Your Gemini API key
- `gcp-api-key` - Your GCP API key (optional)
- `gcp-project-id` - Your GCP Project ID

**To get your Gemini API key:**
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

### Step 3: Grant Access

```bash
bash scripts/grant-secret-access.sh [PROJECT_ID] [SERVICE_ACCOUNT_EMAIL]
```

This grants your service account access to read secrets.

### Step 4: Configure Frontend

Create a `.env` file:

```bash
REACT_APP_SECRET_MANAGER_BACKEND=http://localhost:3001/api/secrets
REACT_APP_GCP_PROJECT_ID=your-project-id
```

## 🔐 Secret Manager Commands

### View All Secrets

```bash
gcloud secrets list --project=YOUR_PROJECT_ID
```

### View Secret Value

```bash
gcloud secrets versions access latest \
  --secret=gemini-api-key \
  --project=YOUR_PROJECT_ID
```

### Update Secret

```bash
echo -n "NEW_API_KEY" | gcloud secrets versions add gemini-api-key \
  --data-file=- \
  --project=YOUR_PROJECT_ID
```

### Delete Secret

```bash
gcloud secrets delete gemini-api-key --project=YOUR_PROJECT_ID
```

## ✅ Verification

### Check APIs are Enabled

```bash
gcloud services list --enabled --project=YOUR_PROJECT_ID | grep -E "secretmanager|cloudbilling|recommender"
```

### Check Secrets Exist

```bash
gcloud secrets list --project=YOUR_PROJECT_ID --filter="name:gemini-api-key OR name:gcp-api-key OR name:gcp-project-id"
```

### Check Service Account Permissions

```bash
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:infracc-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com"
```

## 🎯 What Gets Created

### APIs Enabled
- `secretmanager.googleapis.com` - Secret Manager
- `cloudbilling.googleapis.com` - Cloud Billing
- `recommender.googleapis.com` - Recommender
- `serviceusage.googleapis.com` - Service Usage
- `monitoring.googleapis.com` - Cloud Monitoring
- `logging.googleapis.com` - Cloud Logging
- `compute.googleapis.com` - Compute Engine
- `storage-component.googleapis.com` - Cloud Storage
- `sqladmin.googleapis.com` - Cloud SQL
- `cloudfunctions.googleapis.com` - Cloud Functions
- `run.googleapis.com` - Cloud Run
- `container.googleapis.com` - GKE
- `iam.googleapis.com` - IAM
- `iamcredentials.googleapis.com` - Service Account Credentials

### Secrets Created
- `gemini-api-key` - Gemini AI API key
- `gcp-api-key` - GCP API key (optional)
- `gcp-project-id` - GCP Project ID

### Service Account Created
- `infracc-sa@PROJECT_ID.iam.gserviceaccount.com`
- Permissions: `roles/secretmanager.secretAccessor`

## 🔄 Updating Secrets

To update a secret value:

```bash
# Interactive update
echo -n "NEW_VALUE" | gcloud secrets versions add SECRET_NAME \
  --data-file=- \
  --project=YOUR_PROJECT_ID

# Or use the create script again (it will update if exists)
bash scripts/create-secrets.sh YOUR_PROJECT_ID
```

## 🛠️ Troubleshooting

### Secret Not Found
- Verify secret name: `gcloud secrets list`
- Check project ID matches

### Permission Denied
- Verify service account has access: `gcloud secrets get-iam-policy SECRET_NAME`
- Grant access: `bash scripts/grant-secret-access.sh`

### API Not Enabled
- Enable manually: `gcloud services enable API_NAME`
- Or run: `bash scripts/enable-gcp-apis.sh`

## 📚 Additional Resources

- [Secret Manager Setup Guide](./SECRET_MANAGER_SETUP.md) - Detailed setup
- [Gemini & Pricing Integration](./GEMINI_AND_PRICING_INTEGRATION.md) - API integration details

## 🎉 You're All Set!

Once setup is complete:
1. Your API keys are securely stored in Secret Manager
2. All required APIs are enabled
3. Service account has proper permissions
4. Application can access secrets via backend proxy

Start your application and it will automatically use Secret Manager!
