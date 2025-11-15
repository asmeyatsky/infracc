# Secret Manager Setup Guide

## Overview

InfraCC uses Google Cloud Secret Manager to securely store API keys and sensitive configuration. This provides:

- **Secure Storage**: API keys encrypted at rest
- **Access Control**: IAM-based access management
- **Audit Logging**: All secret access is logged
- **Versioning**: Track secret changes over time
- **Rotation**: Easy secret rotation without code changes

## Prerequisites

1. Google Cloud Project with billing enabled
2. `gcloud` CLI installed and authenticated
3. Appropriate permissions (Project Owner or Security Admin)

## Step 1: Enable Required APIs

Run the provided script to enable all required APIs:

```bash
bash scripts/enable-gcp-apis.sh [PROJECT_ID]
```

Or manually enable Secret Manager API:

```bash
gcloud services enable secretmanager.googleapis.com --project=YOUR_PROJECT_ID
```

## Step 2: Create Secrets

### Create Gemini API Key Secret

```bash
# Option 1: Create from file
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --project=YOUR_PROJECT_ID

# Option 2: Create from stdin (interactive)
gcloud secrets create gemini-api-key \
  --data-file=- \
  --project=YOUR_PROJECT_ID
# Then paste your API key and press Ctrl+D
```

### Create GCP API Key Secret

```bash
echo -n "YOUR_GCP_API_KEY" | gcloud secrets create gcp-api-key \
  --data-file=- \
  --project=YOUR_PROJECT_ID
```

### Create GCP Project ID Secret

```bash
echo -n "YOUR_PROJECT_ID" | gcloud secrets create gcp-project-id \
  --data-file=- \
  --project=YOUR_PROJECT_ID
```

## Step 3: Set Up Service Account

### Create Service Account

```bash
gcloud iam service-accounts create infracc-sa \
  --display-name="InfraCC Service Account" \
  --project=YOUR_PROJECT_ID
```

### Grant Secret Manager Access

```bash
# Grant access to all secrets
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:infracc-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=YOUR_PROJECT_ID

gcloud secrets add-iam-policy-binding gcp-api-key \
  --member="serviceAccount:infracc-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=YOUR_PROJECT_ID

gcloud secrets add-iam-policy-binding gcp-project-id \
  --member="serviceAccount:infracc-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=YOUR_PROJECT_ID
```

### Grant Additional Permissions (if needed)

```bash
# For Cloud Billing API access
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:infracc-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/billing.viewer"

# For Recommender API access
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:infracc-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/recommender.viewer"
```

### Download Service Account Key

```bash
gcloud iam service-accounts keys create infracc-sa-key.json \
  --iam-account=infracc-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --project=YOUR_PROJECT_ID
```

**Important**: Store this key securely and never commit it to version control!

## Step 4: Set Up Backend Proxy

Due to CORS restrictions, the frontend requires a backend proxy to access Secret Manager.

### Option A: Use Existing Backend

If you have a backend server, add these endpoints:

```javascript
// GET /api/secrets/health
app.get('/api/secrets/health', (req, res) => {
  res.json({ status: 'ok' });
});

// POST /api/secrets/get
app.post('/api/secrets/get', async (req, res) => {
  const { secretName, version = 'latest', projectId } = req.body;
  
  const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
  const client = new SecretManagerServiceClient();
  
  try {
    const name = `projects/${projectId}/secrets/${secretName}/versions/${version}`;
    const [secret] = await client.accessSecretVersion({ name });
    const payload = secret.payload.data.toString();
    
    res.json({ payload: { data: payload } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Option B: Use Cloud Functions

Create a Cloud Function to proxy Secret Manager requests:

```javascript
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

exports.getSecret = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { secretName, version = 'latest', projectId } = req.body;

  try {
    const name = `projects/${projectId}/secrets/${secretName}/versions/${version}`;
    const [secret] = await client.accessSecretVersion({ name });
    const payload = secret.payload.data.toString();

    res.json({ payload: { data: payload } });
  } catch (error) {
    console.error('Error accessing secret:', error);
    res.status(500).json({ error: error.message });
  }
};
```

## Step 5: Configure Frontend

Set environment variables for the backend endpoint:

```bash
# .env file
REACT_APP_SECRET_MANAGER_BACKEND=http://localhost:3001/api/secrets
REACT_APP_GCP_PROJECT_ID=YOUR_PROJECT_ID
```

## Step 6: Verify Setup

### List Secrets

```bash
gcloud secrets list --project=YOUR_PROJECT_ID
```

### Test Secret Access

```bash
# Test reading a secret
gcloud secrets versions access latest \
  --secret=gemini-api-key \
  --project=YOUR_PROJECT_ID
```

### Test from Application

The application will automatically:
1. Check if Secret Manager backend is available
2. Fall back to environment variables if not available
3. Cache secrets for 5 minutes

## Secret Management Commands

### Update a Secret

```bash
echo -n "NEW_API_KEY" | gcloud secrets versions add gemini-api-key \
  --data-file=- \
  --project=YOUR_PROJECT_ID
```

### View Secret Versions

```bash
gcloud secrets versions list gemini-api-key --project=YOUR_PROJECT_ID
```

### Access Specific Version

```bash
gcloud secrets versions access 1 \
  --secret=gemini-api-key \
  --project=YOUR_PROJECT_ID
```

### Delete a Secret

```bash
gcloud secrets delete gemini-api-key --project=YOUR_PROJECT_ID
```

### Disable a Secret

```bash
gcloud secrets disable gemini-api-key --project=YOUR_PROJECT_ID
```

## Security Best Practices

1. **Least Privilege**: Only grant necessary permissions
2. **Rotation**: Rotate secrets regularly
3. **Audit**: Monitor secret access logs
4. **Backup**: Keep encrypted backups of secrets
5. **Access Control**: Use IAM conditions for time-based access
6. **Monitoring**: Set up alerts for secret access

## Troubleshooting

### Secret Not Found

- Verify secret name matches exactly
- Check project ID is correct
- Ensure service account has access

### Permission Denied

- Verify service account has `roles/secretmanager.secretAccessor`
- Check project-level IAM policies
- Ensure service account key is valid

### Backend Connection Failed

- Verify backend endpoint is correct
- Check CORS configuration
- Ensure backend is running and accessible

## Cost Considerations

Secret Manager pricing:
- **Storage**: $0.06 per secret per month
- **Access**: $0.03 per 10,000 operations
- **First 6 secrets**: Free

For most applications, Secret Manager costs are minimal.

## Next Steps

1. ✅ Enable APIs
2. ✅ Create secrets
3. ✅ Set up service account
4. ✅ Configure backend proxy
5. ✅ Update frontend configuration
6. ✅ Test secret access
7. ✅ Deploy application

Your API keys are now securely stored in Secret Manager!
