#!/bin/bash

# Grant Secret Manager access to service account
# Run this script with: bash scripts/grant-secret-access.sh [PROJECT_ID] [SERVICE_ACCOUNT_EMAIL]

set -e

PROJECT_ID=${1:-$(gcloud config get-value project 2>/dev/null)}
SERVICE_ACCOUNT=${2:-"infracc-sa@${PROJECT_ID}.iam.gserviceaccount.com"}

if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID not provided and no default project set"
    echo "Usage: $0 [PROJECT_ID] [SERVICE_ACCOUNT_EMAIL]"
    exit 1
fi

echo "=========================================="
echo "Granting Secret Manager Access"
echo "Project: $PROJECT_ID"
echo "Service Account: $SERVICE_ACCOUNT"
echo "=========================================="
echo ""

# Check if service account exists
if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT --project=$PROJECT_ID &>/dev/null; then
    echo "⚠ Service account '$SERVICE_ACCOUNT' does not exist."
    read -p "Do you want to create it? (y/n): " create_sa
    if [[ "$create_sa" =~ ^[Yy]$ ]]; then
        SA_NAME=$(echo $SERVICE_ACCOUNT | cut -d'@' -f1)
        gcloud iam service-accounts create $SA_NAME \
            --display-name="InfraCC Service Account" \
            --project=$PROJECT_ID
        echo "✓ Created service account: $SERVICE_ACCOUNT"
    else
        echo "Exiting. Please create the service account first."
        exit 1
    fi
fi

# List of secrets to grant access to
SECRETS=("gemini-api-key" "gcp-api-key" "gcp-project-id")

echo "Granting access to secrets..."
echo ""

for secret in "${SECRETS[@]}"; do
    # Check if secret exists
    if ! gcloud secrets describe $secret --project=$PROJECT_ID &>/dev/null; then
        echo "⚠ Secret '$secret' does not exist, skipping..."
        continue
    fi
    
    echo "Granting access to: $secret"
    gcloud secrets add-iam-policy-binding $secret \
        --member="serviceAccount:${SERVICE_ACCOUNT}" \
        --role="roles/secretmanager.secretAccessor" \
        --project=$PROJECT_ID
    
    echo "✓ Granted access to $secret"
done

echo ""
echo "=========================================="
echo "Access Granted Successfully!"
echo "=========================================="
echo ""
echo "Service account '$SERVICE_ACCOUNT' now has access to:"
for secret in "${SECRETS[@]}"; do
    if gcloud secrets describe $secret --project=$PROJECT_ID &>/dev/null; then
        echo "  ✓ $secret"
    fi
done
echo ""
echo "To download service account key:"
echo "  gcloud iam service-accounts keys create infracc-sa-key.json \\"
echo "    --iam-account=$SERVICE_ACCOUNT \\"
echo "    --project=$PROJECT_ID"
