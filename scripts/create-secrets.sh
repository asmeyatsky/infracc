#!/bin/bash

# Interactive script to create secrets in Google Cloud Secret Manager
# Run this script with: bash scripts/create-secrets.sh

set -e

PROJECT_ID=${1:-$(gcloud config get-value project 2>/dev/null)}

if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID not provided and no default project set"
    echo "Usage: $0 [PROJECT_ID]"
    echo "Or set default: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "=========================================="
echo "InfraCC Secret Manager Setup"
echo "Project: $PROJECT_ID"
echo "=========================================="
echo ""

# Set the project
gcloud config set project $PROJECT_ID

# Check if Secret Manager API is enabled
echo "Checking Secret Manager API..."
if ! gcloud services list --enabled --filter="name:secretmanager.googleapis.com" --format="value(name)" | grep -q secretmanager; then
    echo "Enabling Secret Manager API..."
    gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID
    echo "✓ Secret Manager API enabled"
else
    echo "✓ Secret Manager API already enabled"
fi
echo ""

# Function to create or update secret
create_secret() {
    local secret_name=$1
    local description=$2
    local prompt_text=$3
    
    echo "----------------------------------------"
    echo "$description"
    echo "Secret name: $secret_name"
    echo ""
    
    # Check if secret already exists
    if gcloud secrets describe $secret_name --project=$PROJECT_ID &>/dev/null; then
        echo "⚠ Secret '$secret_name' already exists."
        read -p "Do you want to update it? (y/n): " update_choice
        if [[ ! "$update_choice" =~ ^[Yy]$ ]]; then
            echo "Skipping $secret_name"
            return
        fi
    fi
    
    # Get secret value
    echo "$prompt_text"
    echo "(Press Ctrl+D when done, or paste and press Enter then Ctrl+D)"
    echo ""
    
    if [ -t 0 ]; then
        # Interactive mode - read from stdin
        SECRET_VALUE=$(cat)
    else
        # Non-interactive mode - prompt for input
        read -sp "Enter value: " SECRET_VALUE
        echo ""
    fi
    
    if [ -z "$SECRET_VALUE" ]; then
        echo "⚠ No value provided, skipping $secret_name"
        return
    fi
    
    # Create or update secret
    if gcloud secrets describe $secret_name --project=$PROJECT_ID &>/dev/null; then
        # Update existing secret
        echo -n "$SECRET_VALUE" | gcloud secrets versions add $secret_name \
            --data-file=- \
            --project=$PROJECT_ID
        echo "✓ Updated secret: $secret_name"
    else
        # Create new secret
        echo -n "$SECRET_VALUE" | gcloud secrets create $secret_name \
            --data-file=- \
            --project=$PROJECT_ID \
            --replication-policy="automatic"
        echo "✓ Created secret: $secret_name"
    fi
    
    echo ""
}

# Create secrets interactively
echo "Creating secrets in Secret Manager..."
echo ""

# Gemini API Key
create_secret \
    "gemini-api-key" \
    "Gemini API Key" \
    "Enter your Gemini API key (get it from https://makersuite.google.com/app/apikey):"

# GCP API Key (optional - for some APIs)
read -p "Do you want to create a GCP API key secret? (y/n): " create_gcp_key
if [[ "$create_gcp_key" =~ ^[Yy]$ ]]; then
    create_secret \
        "gcp-api-key" \
        "GCP API Key" \
        "Enter your GCP API key (optional, for public APIs):"
fi

# GCP Project ID
create_secret \
    "gcp-project-id" \
    "GCP Project ID" \
    "Enter your GCP Project ID (current: $PROJECT_ID):"

echo "=========================================="
echo "Secret Creation Complete!"
echo "=========================================="
echo ""
echo "Created secrets:"
gcloud secrets list --project=$PROJECT_ID --filter="name:gemini-api-key OR name:gcp-api-key OR name:gcp-project-id" --format="table(name,createTime)"
echo ""
echo "Next steps:"
echo "1. Grant access to your service account:"
echo "   bash scripts/grant-secret-access.sh $PROJECT_ID"
echo ""
echo "2. Set up backend proxy (see SECRET_MANAGER_SETUP.md)"
echo ""
echo "3. Configure frontend:"
echo "   REACT_APP_SECRET_MANAGER_BACKEND=http://localhost:3001/api/secrets"
echo "   REACT_APP_GCP_PROJECT_ID=$PROJECT_ID"
