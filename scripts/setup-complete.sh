#!/bin/bash

# Complete setup script for InfraCC
# This script enables all APIs and guides you through secret creation
# Run: bash scripts/setup-complete.sh [PROJECT_ID]

set -e

PROJECT_ID=${1:-$(gcloud config get-value project 2>/dev/null)}

if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID not provided and no default project set"
    echo "Usage: $0 [PROJECT_ID]"
    echo "Or set default: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "=========================================="
echo "InfraCC Complete Setup"
echo "Project: $PROJECT_ID"
echo "=========================================="
echo ""

# Step 1: Enable APIs
echo "Step 1: Enabling required Google Cloud APIs..."
echo "----------------------------------------"
bash scripts/enable-gcp-apis.sh $PROJECT_ID
echo ""

# Step 2: Create Service Account
echo "Step 2: Setting up Service Account..."
echo "----------------------------------------"
SA_NAME="infracc-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID &>/dev/null; then
    echo "✓ Service account already exists: $SA_EMAIL"
else
    echo "Creating service account..."
    gcloud iam service-accounts create $SA_NAME \
        --display-name="InfraCC Service Account" \
        --project=$PROJECT_ID
    echo "✓ Created service account: $SA_EMAIL"
fi
echo ""

# Step 3: Create Secrets
echo "Step 3: Creating secrets in Secret Manager..."
echo "----------------------------------------"
echo ""
read -p "Do you want to create secrets now? (y/n): " create_secrets
if [[ "$create_secrets" =~ ^[Yy]$ ]]; then
    bash scripts/create-secrets.sh $PROJECT_ID
else
    echo "Skipping secret creation. Run 'bash scripts/create-secrets.sh $PROJECT_ID' later."
fi
echo ""

# Step 4: Grant Access
echo "Step 4: Granting Secret Manager access..."
echo "----------------------------------------"
read -p "Do you want to grant secret access to service account? (y/n): " grant_access
if [[ "$grant_access" =~ ^[Yy]$ ]]; then
    bash scripts/grant-secret-access.sh $PROJECT_ID $SA_EMAIL
else
    echo "Skipping access grant. Run 'bash scripts/grant-secret-access.sh $PROJECT_ID' later."
fi
echo ""

# Step 5: Download Service Account Key
echo "Step 5: Service Account Key..."
echo "----------------------------------------"
read -p "Do you want to download the service account key? (y/n): " download_key
if [[ "$download_key" =~ ^[Yy]$ ]]; then
    KEY_FILE="infracc-sa-key.json"
    if [ -f "$KEY_FILE" ]; then
        read -p "Key file exists. Overwrite? (y/n): " overwrite
        if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
            echo "Skipping key download."
        else
            gcloud iam service-accounts keys create $KEY_FILE \
                --iam-account=$SA_EMAIL \
                --project=$PROJECT_ID
            echo "✓ Downloaded key to: $KEY_FILE"
            echo "⚠ Keep this file secure and never commit it to git!"
        fi
    else
        gcloud iam service-accounts keys create $KEY_FILE \
            --iam-account=$SA_EMAIL \
            --project=$PROJECT_ID
        echo "✓ Downloaded key to: $KEY_FILE"
        echo "⚠ Keep this file secure and never commit it to git!"
    fi
else
    echo "Skipping key download. Run this command later:"
    echo "  gcloud iam service-accounts keys create infracc-sa-key.json \\"
    echo "    --iam-account=$SA_EMAIL \\"
    echo "    --project=$PROJECT_ID"
fi
echo ""

# Summary
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  Project ID: $PROJECT_ID"
echo "  Service Account: $SA_EMAIL"
echo ""
echo "Next steps:"
echo "1. Set up backend proxy (see SECRET_MANAGER_SETUP.md)"
echo "2. Configure frontend environment variables:"
echo "   REACT_APP_SECRET_MANAGER_BACKEND=http://localhost:3001/api/secrets"
echo "   REACT_APP_GCP_PROJECT_ID=$PROJECT_ID"
echo "3. Start your application"
echo ""
echo "To create/update secrets later:"
echo "  bash scripts/create-secrets.sh $PROJECT_ID"
echo ""
echo "To verify secrets:"
echo "  gcloud secrets list --project=$PROJECT_ID"
