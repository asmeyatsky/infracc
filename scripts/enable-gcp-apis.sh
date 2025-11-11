#!/bin/bash

# Enable all required Google Cloud APIs for InfraCC
# Run this script with: bash scripts/enable-gcp-apis.sh

set -e

PROJECT_ID=${1:-$(gcloud config get-value project 2>/dev/null)}

if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID not provided and no default project set"
    echo "Usage: $0 [PROJECT_ID]"
    echo "Or set default: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "Enabling APIs for project: $PROJECT_ID"
echo "=========================================="

# Set the project
gcloud config set project $PROJECT_ID

# Cloud Billing APIs
echo "Enabling Cloud Billing APIs..."
gcloud services enable cloudbilling.googleapis.com
gcloud services enable cloudbillingbudgets.googleapis.com

# Cloud Pricing APIs (via Cloud Billing)
echo "Enabling Cloud Pricing APIs..."
gcloud services enable cloudbilling.googleapis.com  # Already enabled, but listed for clarity

# Recommender API (for cost optimization)
echo "Enabling Recommender API..."
gcloud services enable recommender.googleapis.com

# Service Usage API (for service catalog)
echo "Enabling Service Usage API..."
gcloud services enable serviceusage.googleapis.com

# Secret Manager API (for secure API key storage)
echo "Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

# Cloud Resource Manager API (for project/folder management)
echo "Enabling Cloud Resource Manager API..."
gcloud services enable cloudresourcemanager.googleapis.com

# Cloud Monitoring API (for cost monitoring)
echo "Enabling Cloud Monitoring API..."
gcloud services enable monitoring.googleapis.com

# Cloud Logging API (for audit logs)
echo "Enabling Cloud Logging API..."
gcloud services enable logging.googleapis.com

# Compute Engine API (for VM pricing)
echo "Enabling Compute Engine API..."
gcloud services enable compute.googleapis.com

# Cloud Storage API (for storage pricing)
echo "Enabling Cloud Storage API..."
gcloud services enable storage-component.googleapis.com

# Cloud SQL Admin API (for database pricing)
echo "Enabling Cloud SQL Admin API..."
gcloud services enable sqladmin.googleapis.com

# Cloud Functions API (for serverless pricing)
echo "Enabling Cloud Functions API..."
gcloud services enable cloudfunctions.googleapis.com

# Cloud Run API (for container pricing)
echo "Enabling Cloud Run API..."
gcloud services enable run.googleapis.com

# Container API (for GKE pricing)
echo "Enabling Container API..."
gcloud services enable container.googleapis.com

# IAM API (for service account management)
echo "Enabling IAM API..."
gcloud services enable iam.googleapis.com

# Service Account API
echo "Enabling Service Account API..."
gcloud services enable iamcredentials.googleapis.com

echo ""
echo "=========================================="
echo "All APIs enabled successfully!"
echo ""
echo "Next steps:"
echo "1. Create secrets in Secret Manager:"
echo "   gcloud secrets create gemini-api-key --data-file=-"
echo "   gcloud secrets create gcp-api-key --data-file=-"
echo ""
echo "2. Grant access to Secret Manager:"
echo "   gcloud secrets add-iam-policy-binding gemini-api-key \\"
echo "     --member='serviceAccount:YOUR_SA@$PROJECT_ID.iam.gserviceaccount.com' \\"
echo "     --role='roles/secretmanager.secretAccessor'"
echo ""
echo "3. Update your application to use Secret Manager (see docs)"
