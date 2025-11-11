# Real Cloud Pricing API Integration Guide

## Overview

This application now supports integration with **real pricing APIs** from AWS, Azure, and GCP. By default, it uses mock/static pricing data, but can be configured to use live pricing when a backend API server is set up.

## Current Status

- ✅ **Azure Pricing API**: Public API, works directly from browser (no backend needed)
- ⚠️ **AWS Pricing API**: Requires backend proxy (CORS restrictions)
- ⚠️ **GCP Pricing API**: Requires backend proxy (authentication required)

## Architecture

```
Frontend (React App)
    ↓
Real Pricing API Integration (realPricingAPI.js)
    ↓
Backend API Server (Node.js/Python/Go) - Required for AWS & GCP
    ↓
Cloud Provider APIs:
    - AWS Pricing API
    - Azure Retail Prices API  
    - GCP Cloud Billing API
    - GCP Cloud Pricing API
```

## Setup Instructions

### 1. Azure Pricing (No Backend Required)

Azure Retail Prices API is public and works directly from the browser:

```javascript
// Already configured in realPricingAPI.js
const azurePricingEndpoint = 'https://prices.azure.com/api/retail/prices';
```

**Status**: ✅ Works out of the box

### 2. AWS Pricing API (Requires Backend)

AWS Pricing API requires a backend proxy due to CORS restrictions and authentication.

#### Backend Setup (Node.js Example)

Create a backend API server (`backend/server.js`):

```javascript
const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');

const app = express();
app.use(cors());
app.use(express.json());

// AWS Pricing API endpoint
app.post('/api/aws/pricing', async (req, res) => {
  try {
    const pricing = new AWS.Pricing({
      region: 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    const params = {
      ServiceCode: req.body.service,
      Filters: [
        { Type: 'TERM_MATCH', Field: 'instanceType', Value: req.body.instanceType },
        { Type: 'TERM_MATCH', Field: 'location', Value: req.body.region },
      ],
    };

    const data = await pricing.getProducts(params).promise();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Backend API server running on port 3001');
});
```

#### Environment Variables

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export REACT_APP_GCP_BILLING_ENDPOINT="http://localhost:3001/api"
```

### 3. GCP Pricing API (Requires Backend)

GCP requires service account authentication and API enablement.

#### Backend Setup (Node.js Example)

```javascript
const { GoogleAuth } = require('google-auth-library');
const { billing } = require('googleapis');

const auth = new GoogleAuth({
  keyFile: './service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

app.post('/api/gcp/pricing/compute', async (req, res) => {
  try {
    const authClient = await auth.getClient();
    const billingClient = billing({
      version: 'v1',
      auth: authClient,
    });

    // Get pricing for Compute Engine
    const response = await billingClient.cloudbilling.services.list({
      // Implementation details...
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### GCP Service Account Setup

1. **Enable APIs**:
```bash
gcloud services enable cloudbilling.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
```

2. **Create Service Account**:
```bash
gcloud iam service-accounts create pricing-api \
  --display-name="Pricing API Service Account"
```

3. **Grant Permissions**:
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:pricing-api@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/billing.viewer"
```

4. **Create Key**:
```bash
gcloud iam service-accounts keys create key.json \
  --iam-account=pricing-api@PROJECT_ID.iam.gserviceaccount.com
```

## Usage

### Check API Availability

```javascript
import CloudPricingIntegration from './utils/realPricingAPI';

const availability = await CloudPricingIntegration.checkAvailability();
console.log(availability);
// {
//   aws: false,      // Requires backend
//   azure: true,    // Works directly
//   gcp: false,     // Requires backend
//   backend: false  // Backend not running
// }
```

### Fetch Real Pricing

```javascript
// AWS EC2 Pricing
const awsPricing = await CloudPricingIntegration.getPricing('aws', 'ec2', {
  instanceType: 't3.micro',
  region: 'us-east-1',
  os: 'Linux',
});

// Azure VM Pricing
const azurePricing = await CloudPricingIntegration.getPricing('azure', 'vm', {
  vmSize: 'Standard_B1s',
  region: 'eastus',
  os: 'Linux',
});

// GCP Compute Pricing
const gcpPricing = await CloudPricingIntegration.getPricing('gcp', 'compute', {
  machineType: 'e2-micro',
  region: 'us-central1',
});
```

### Get Actual Costs (GCP)

```javascript
import { GCPPricingAPI } from './utils/realPricingAPI';

const costs = await GCPPricingAPI.getActualCosts(
  'billing-account-id',
  new Date('2025-01-01'),
  new Date('2025-01-31')
);
```

## Fallback Behavior

The application automatically falls back to mock/static pricing data when:
- Backend API server is not running
- API credentials are invalid
- Network errors occur
- Rate limits are exceeded

This ensures the application continues to function even without real pricing integration.

## Caching

Pricing data is cached for 1 hour to:
- Reduce API calls
- Improve performance
- Avoid rate limiting

Cache can be cleared by refreshing the page or restarting the application.

## Environment Variables

```bash
# Backend API endpoints
REACT_APP_GCP_BILLING_ENDPOINT=http://localhost:3001/api/billing
REACT_APP_GCP_PRICING_ENDPOINT=http://localhost:3001/api/pricing

# AWS Credentials (backend only)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# GCP Credentials (backend only)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
GCP_PROJECT_ID=your-project-id
GCP_BILLING_ACCOUNT=your-billing-account
```

## Testing

Test pricing API availability:

```javascript
// In browser console or component
import CloudPricingIntegration from './utils/realPricingAPI';

CloudPricingIntegration.checkAvailability().then(availability => {
  console.log('API Availability:', availability);
});
```

## Next Steps

1. **Set up backend API server** for AWS and GCP pricing
2. **Configure environment variables** in your deployment
3. **Test API connectivity** using the availability checker
4. **Monitor API usage** to avoid rate limits
5. **Set up caching** at the backend level for better performance

## Pricing API Links

- **AWS Pricing API**: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/price-changes.html
- **Azure Retail Prices API**: https://prices.azure.com/api/retail/prices
- **GCP Cloud Billing API**: https://cloud.google.com/billing/docs/reference/rest
- **GCP Cloud Pricing API**: https://cloud.google.com/billing/docs/how-to/pricing-api
