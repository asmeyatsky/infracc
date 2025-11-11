#!/bin/bash

# InfraCC Project Setup Script
# Project ID: infracc-477905
# This script sets up everything for the InfraCC project

set -e

PROJECT_ID="infracc-477905"

echo "=========================================="
echo "InfraCC Project Setup"
echo "Project ID: $PROJECT_ID"
echo "=========================================="
echo ""

# Verify project exists
echo "Verifying project..."
if ! gcloud projects describe $PROJECT_ID &>/dev/null; then
    echo "Error: Project '$PROJECT_ID' not found or you don't have access"
    echo "Please verify:"
    echo "  1. Project ID is correct: $PROJECT_ID"
    echo "  2. You have access to the project"
    echo "  3. You're authenticated: gcloud auth login"
    exit 1
fi
echo "✓ Project verified: $PROJECT_ID"
echo ""

# Set the project
gcloud config set project $PROJECT_ID
echo "✓ Set default project to: $PROJECT_ID"
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
        --description="Service account for InfraCC application" \
        --project=$PROJECT_ID
    echo "✓ Created service account: $SA_EMAIL"
fi
echo ""

# Step 3: Create Secrets
echo "Step 3: Creating secrets in Secret Manager..."
echo "----------------------------------------"
echo ""
echo "You will now be prompted to enter your API keys."
echo "These will be securely stored in Secret Manager."
echo ""
read -p "Press Enter to continue..."
echo ""

# Create Gemini API Key secret
echo "Creating Gemini API Key secret..."
echo "Get your API key from: https://makersuite.google.com/app/apikey"
echo "Enter your Gemini API key (or press Enter to skip):"
if [ -t 0 ]; then
    read -s GEMINI_KEY
    echo ""
    if [ ! -z "$GEMINI_KEY" ]; then
        if gcloud secrets describe gemini-api-key --project=$PROJECT_ID &>/dev/null; then
            echo -n "$GEMINI_KEY" | gcloud secrets versions add gemini-api-key \
                --data-file=- \
                --project=$PROJECT_ID
            echo "✓ Updated gemini-api-key"
        else
            echo -n "$GEMINI_KEY" | gcloud secrets create gemini-api-key \
                --data-file=- \
                --project=$PROJECT_ID \
                --replication-policy="automatic"
            echo "✓ Created gemini-api-key"
        fi
    else
        echo "Skipped gemini-api-key"
    fi
fi
echo ""

# Create GCP Project ID secret
echo "Creating GCP Project ID secret..."
if gcloud secrets describe gcp-project-id --project=$PROJECT_ID &>/dev/null; then
    echo -n "$PROJECT_ID" | gcloud secrets versions add gcp-project-id \
        --data-file=- \
        --project=$PROJECT_ID
    echo "✓ Updated gcp-project-id"
else
    echo -n "$PROJECT_ID" | gcloud secrets create gcp-project-id \
        --data-file=- \
        --project=$PROJECT_ID \
        --replication-policy="automatic"
    echo "✓ Created gcp-project-id"
fi
echo ""

# Optional: GCP API Key
read -p "Do you want to create a GCP API key secret? (y/n): " create_gcp_key
if [[ "$create_gcp_key" =~ ^[Yy]$ ]]; then
    echo "Enter your GCP API key (or press Enter to skip):"
    read -s GCP_KEY
    echo ""
    if [ ! -z "$GCP_KEY" ]; then
        if gcloud secrets describe gcp-api-key --project=$PROJECT_ID &>/dev/null; then
            echo -n "$GCP_KEY" | gcloud secrets versions add gcp-api-key \
                --data-file=- \
                --project=$PROJECT_ID
            echo "✓ Updated gcp-api-key"
        else
            echo -n "$GCP_KEY" | gcloud secrets create gcp-api-key \
                --data-file=- \
                --project=$PROJECT_ID \
                --replication-policy="automatic"
            echo "✓ Created gcp-api-key"
        fi
    fi
fi
echo ""

# Step 4: Grant Access
echo "Step 4: Granting Secret Manager access..."
echo "----------------------------------------"
SECRETS=("gemini-api-key" "gcp-api-key" "gcp-project-id")

for secret in "${SECRETS[@]}"; do
    if gcloud secrets describe $secret --project=$PROJECT_ID &>/dev/null; then
        echo "Granting access to: $secret"
        gcloud secrets add-iam-policy-binding $secret \
            --member="serviceAccount:${SA_EMAIL}" \
            --role="roles/secretmanager.secretAccessor" \
            --project=$PROJECT_ID &>/dev/null || echo "  (already has access)"
        echo "✓ Granted access to $secret"
    fi
done
echo ""

# Step 5: Download Service Account Key
echo "Step 5: Service Account Key..."
echo "----------------------------------------"
KEY_FILE="infracc-sa-key.json"
if [ -f "$KEY_FILE" ]; then
    echo "⚠ Key file '$KEY_FILE' already exists."
    read -p "Do you want to overwrite it? (y/n): " overwrite
    if [[ "$overwrite" =~ ^[Yy]$ ]]; then
        gcloud iam service-accounts keys create $KEY_FILE \
            --iam-account=$SA_EMAIL \
            --project=$PROJECT_ID
        echo "✓ Downloaded key to: $KEY_FILE"
    else
        echo "Skipped key download"
    fi
else
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$SA_EMAIL \
        --project=$PROJECT_ID
    echo "✓ Downloaded key to: $KEY_FILE"
fi
echo "⚠ Keep this file secure and never commit it to git!"
echo ""

# Step 6: Create .env file
echo "Step 6: Creating .env file..."
echo "----------------------------------------"
if [ -f ".env" ]; then
    echo "⚠ .env file already exists."
    read -p "Do you want to update it? (y/n): " update_env
    if [[ ! "$update_env" =~ ^[Yy]$ ]]; then
        echo "Skipped .env creation"
    else
        cat > .env << EOF
# InfraCC Environment Variables
# Project ID: $PROJECT_ID

REACT_APP_GCP_PROJECT_ID=$PROJECT_ID
REACT_APP_SECRET_MANAGER_BACKEND=http://localhost:3001/api/secrets
REACT_APP_GCP_PRICING_BACKEND=http://localhost:3001/api/gcp/pricing
REACT_APP_GCP_BILLING_BACKEND=http://localhost:3001/api/gcp/billing
REACT_APP_GCP_RECOMMENDER_BACKEND=http://localhost:3001/api/gcp/recommender
EOF
        echo "✓ Updated .env file"
    fi
else
    cat > .env << EOF
# InfraCC Environment Variables
# Project ID: $PROJECT_ID

REACT_APP_GCP_PROJECT_ID=$PROJECT_ID
REACT_APP_SECRET_MANAGER_BACKEND=http://localhost:3001/api/secrets
REACT_APP_GCP_PRICING_BACKEND=http://localhost:3001/api/gcp/pricing
REACT_APP_GCP_BILLING_BACKEND=http://localhost:3001/api/gcp/billing
REACT_APP_GCP_RECOMMENDER_BACKEND=http://localhost:3001/api/gcp/recommender
EOF
    echo "✓ Created .env file"
fi
echo ""

# Summary
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Project: $PROJECT_ID"
echo "Service Account: $SA_EMAIL"
echo ""
echo "Created Secrets:"
gcloud secrets list --project=$PROJECT_ID --filter="name:gemini-api-key OR name:gcp-api-key OR name:gcp-project-id" --format="table(name,createTime)" 2>/dev/null || echo "  (run 'gcloud secrets list' to view)"
echo ""
echo "Next steps:"
echo "1. Set up backend proxy (see SECRET_MANAGER_SETUP.md)"
echo "2. Start your application: npm start"
echo ""
echo "To update secrets later:"
echo "  bash scripts/create-secrets.sh $PROJECT_ID"
echo ""
echo "To verify setup:"
echo "  gcloud secrets list --project=$PROJECT_ID"
echo "  gcloud services list --enabled --project=$PROJECT_ID | grep secretmanager"
