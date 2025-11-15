#!/bin/bash

# GCP Authentication Setup Script
# This script helps you get your GCP API key and service account key

set -e

echo "=========================================="
echo "GCP Authentication Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${YELLOW}⚠️  gcloud CLI not found.${NC}"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Get API Key
echo -e "${BLUE}Step 1: Getting GCP API Key${NC}"
echo "----------------------------------------"
echo ""
echo "To get your GCP API key:"
echo "1. Go to: https://console.cloud.google.com/apis/credentials"
echo "2. Click 'Create Credentials' → 'API Key'"
echo "3. Copy the API key"
echo ""
echo "Or if you already have an API key, paste it below."
echo ""
read -p "Enter your GCP API Key (or press Enter to skip): " GCP_API_KEY

if [ -z "$GCP_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  API Key not provided. Skipping...${NC}"
    echo ""
else
    echo -e "${GREEN}✓ API Key received${NC}"
    echo ""
fi

# Step 2: Get Service Account Key
echo -e "${BLUE}Step 2: Getting Service Account Key${NC}"
echo "----------------------------------------"
echo ""
echo "To create a service account and download the key:"
echo "1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts"
echo "2. Click 'Create Service Account'"
echo "3. Give it a name (e.g., 'infracc-pricing')"
echo "4. Grant it the 'Cloud Billing Catalog Viewer' role"
echo "5. Click 'Done'"
echo "6. Click on the service account → 'Keys' tab → 'Add Key' → 'Create new key'"
echo "7. Choose 'JSON' format and download"
echo ""
echo "Or if you already have a service account key file, provide the path."
echo ""
read -p "Enter path to service account JSON key file (or press Enter to skip): " SERVICE_ACCOUNT_PATH

if [ -z "$SERVICE_ACCOUNT_PATH" ]; then
    echo -e "${YELLOW}⚠️  Service Account key not provided. Skipping...${NC}"
    echo ""
    SERVICE_ACCOUNT_KEY=""
else
    # Check if file exists
    if [ ! -f "$SERVICE_ACCOUNT_PATH" ]; then
        echo -e "${YELLOW}⚠️  File not found: $SERVICE_ACCOUNT_PATH${NC}"
        echo ""
        SERVICE_ACCOUNT_KEY=""
    else
        # Copy to backend directory
        SERVICE_ACCOUNT_FILENAME=$(basename "$SERVICE_ACCOUNT_PATH")
        BACKEND_KEY_PATH="./$SERVICE_ACCOUNT_FILENAME"
        cp "$SERVICE_ACCOUNT_PATH" "$BACKEND_KEY_PATH"
        echo -e "${GREEN}✓ Service Account key copied to: $BACKEND_KEY_PATH${NC}"
        SERVICE_ACCOUNT_KEY="$BACKEND_KEY_PATH"
        echo ""
    fi
fi

# Step 3: Get Project ID
echo -e "${BLUE}Step 3: Getting GCP Project ID${NC}"
echo "----------------------------------------"
echo ""
if command -v gcloud &> /dev/null; then
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
    if [ ! -z "$CURRENT_PROJECT" ]; then
        echo "Current gcloud project: $CURRENT_PROJECT"
        read -p "Use this project? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            GCP_PROJECT_ID="$CURRENT_PROJECT"
        else
            read -p "Enter your GCP Project ID: " GCP_PROJECT_ID
        fi
    else
        read -p "Enter your GCP Project ID: " GCP_PROJECT_ID
    fi
else
    read -p "Enter your GCP Project ID: " GCP_PROJECT_ID
fi

if [ -z "$GCP_PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  Project ID not provided.${NC}"
    echo ""
else
    echo -e "${GREEN}✓ Project ID: $GCP_PROJECT_ID${NC}"
    echo ""
fi

# Step 4: Create .env file
echo -e "${BLUE}Step 4: Creating .env file${NC}"
echo "----------------------------------------"
echo ""

ENV_FILE="./.env"
ENV_CONTENT=""

if [ ! -z "$GCP_API_KEY" ]; then
    ENV_CONTENT="GCP_API_KEY=$GCP_API_KEY\n"
fi

if [ ! -z "$SERVICE_ACCOUNT_KEY" ]; then
    ENV_CONTENT="${ENV_CONTENT}GOOGLE_APPLICATION_CREDENTIALS=$SERVICE_ACCOUNT_KEY\n"
fi

if [ ! -z "$GCP_PROJECT_ID" ]; then
    ENV_CONTENT="${ENV_CONTENT}GCP_PROJECT_ID=$GCP_PROJECT_ID\n"
fi

ENV_CONTENT="${ENV_CONTENT}PORT=3002\n"

# Write to .env file
echo -e "$ENV_CONTENT" > "$ENV_FILE"
echo -e "${GREEN}✓ Created .env file${NC}"
echo ""

# Step 5: Load environment variables
echo -e "${BLUE}Step 5: Setting up environment${NC}"
echo "----------------------------------------"
echo ""

if [ ! -z "$GCP_API_KEY" ]; then
    export GCP_API_KEY="$GCP_API_KEY"
    echo -e "${GREEN}✓ GCP_API_KEY exported${NC}"
fi

if [ ! -z "$SERVICE_ACCOUNT_KEY" ]; then
    export GOOGLE_APPLICATION_CREDENTIALS="$SERVICE_ACCOUNT_KEY"
    echo -e "${GREEN}✓ GOOGLE_APPLICATION_CREDENTIALS exported${NC}"
fi

if [ ! -z "$GCP_PROJECT_ID" ]; then
    export GCP_PROJECT_ID="$GCP_PROJECT_ID"
    echo -e "${GREEN}✓ GCP_PROJECT_ID exported${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Environment variables have been:"
echo "  1. Saved to: $ENV_FILE"
echo "  2. Exported to current shell"
echo ""
echo "To use in the future, run:"
echo "  source .env"
echo ""
echo "Or start the server with:"
echo "  npm start"
echo ""
echo "The server will automatically load variables from .env file"
echo ""
echo "To test the setup, run:"
echo "  curl 'http://localhost:3002/api/gcp/pricing/compute?region=us-central1&machineType=n1-standard-1'"
echo ""
