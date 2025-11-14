# InfraCC Backend Server

Backend proxy server for Secret Manager and GCP API access.

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up Google Cloud credentials:
```bash
# Option 1: Use Application Default Credentials
gcloud auth application-default login

# Option 2: Set service account key file
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

3. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to GCP service account key file (optional if using ADC)

## Endpoints

### Health Check
- `GET /health` - Server health check

### Secret Manager
- `GET /api/secrets/health` - Secret Manager health check
- `POST /api/secrets/get` - Get secret from Secret Manager
  ```json
  {
    "secretName": "gemini-api-key",
    "projectId": "your-project-id",
    "version": "latest"
  }
  ```

### GCP Pricing API (Proxies)
- `GET /api/gcp/pricing/compute` - Compute pricing
- `GET /api/gcp/pricing/storage` - Storage pricing
- `GET /api/gcp/pricing/cloudsql` - Cloud SQL pricing

### GCP Billing API (Proxy)
- `GET /api/gcp/billing/costs` - Get billing costs

### GCP Recommender API (Proxy)
- `GET /api/gcp/recommender/recommendations` - Get recommendations

## Notes

- The GCP Pricing, Billing, and Recommender endpoints are placeholder implementations
- You'll need to implement the actual API calls based on your requirements
- The Secret Manager endpoint is fully functional if you have proper GCP credentials
