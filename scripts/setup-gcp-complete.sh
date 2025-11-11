#!/bin/bash

# Complete Google Cloud Setup Script for InfraCC
# This script will:
# 1. Authenticate you to Google Cloud
# 2. Prompt for your GCP Project ID
# 3. Enable all required APIs
# 4. Allow you to enter API keys into Secret Manager
#
# Usage: bash scripts/setup-gcp-complete.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo "=========================================="
    echo -e "${BLUE}$1${NC}"
    echo "=========================================="
    echo ""
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

print_header "Google Cloud Setup for InfraCC"

# Step 1: Check Authentication
print_header "Step 1: Checking Authentication"

CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "")

if [ -z "$CURRENT_ACCOUNT" ]; then
    print_warning "Not authenticated to Google Cloud"
    echo "You will be prompted to authenticate..."
    echo ""
    gcloud auth login
    CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "")
    if [ -z "$CURRENT_ACCOUNT" ]; then
        print_error "Authentication failed. Please try again."
        exit 1
    fi
    print_success "Authenticated as: $CURRENT_ACCOUNT"
else
    print_info "Current account: $CURRENT_ACCOUNT"
    echo ""
    read -p "Do you want to use a different account? (y/n): " change_account
    if [[ "$change_account" =~ ^[Yy]$ ]]; then
        gcloud auth login
        CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "")
        if [ -z "$CURRENT_ACCOUNT" ]; then
            print_error "Authentication failed. Please try again."
            exit 1
        fi
        print_success "Authenticated as: $CURRENT_ACCOUNT"
    fi
fi

# Step 2: Get Project ID (always prompt)
print_header "Step 2: Setting Project"

# Always prompt for project ID, don't use command line argument or default
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")

if [ ! -z "$CURRENT_PROJECT" ]; then
    echo "Current default project: $CURRENT_PROJECT"
    echo ""
    read -p "Do you want to use this project? (y/n): " use_current
    if [[ "$use_current" =~ ^[Yy]$ ]]; then
        PROJECT_ID=$CURRENT_PROJECT
    else
        echo ""
        read -p "Enter your GCP Project ID: " PROJECT_ID
    fi
else
    echo "No default project set."
    echo ""
    read -p "Enter your GCP Project ID: " PROJECT_ID
fi

if [ -z "$PROJECT_ID" ]; then
    print_error "Project ID is required"
    exit 1
fi

# Verify project exists and user has access
print_info "Verifying project access: $PROJECT_ID"
if ! gcloud projects describe $PROJECT_ID &>/dev/null; then
    print_error "Cannot access project: $PROJECT_ID"
    echo "Please verify:"
    echo "  1. The project ID is correct"
    echo "  2. You have access to this project"
    echo "  3. Billing is enabled for this project"
    exit 1
fi

# Set the project
gcloud config set project $PROJECT_ID
print_success "Project set to: $PROJECT_ID"

# Step 3: Enable All Required APIs
print_header "Step 3: Enabling Required APIs"

APIS=(
    # Secret Manager (required first)
    "secretmanager.googleapis.com"
    # Cloud Billing APIs
    "cloudbilling.googleapis.com"
    "cloudbillingbudgets.googleapis.com"
    # Recommender API
    "recommender.googleapis.com"
    # Service Usage API
    "serviceusage.googleapis.com"
    # Cloud Resource Manager API
    "cloudresourcemanager.googleapis.com"
    # Cloud Monitoring API
    "monitoring.googleapis.com"
    # Cloud Logging API
    "logging.googleapis.com"
    # Compute Engine API
    "compute.googleapis.com"
    # Cloud Storage API
    "storage-component.googleapis.com"
    # Cloud SQL Admin API
    "sqladmin.googleapis.com"
    # Cloud Functions API
    "cloudfunctions.googleapis.com"
    # Cloud Run API
    "run.googleapis.com"
    # Container API (GKE)
    "container.googleapis.com"
    # IAM API
    "iam.googleapis.com"
    # Service Account Credentials API
    "iamcredentials.googleapis.com"
    # Vision API (for architecture diagram analysis)
    "vision.googleapis.com"
)

ENABLED_COUNT=0
ALREADY_ENABLED_COUNT=0

for api in "${APIS[@]}"; do
    API_NAME=$(echo $api | sed 's/\.googleapis\.com//')
    
    # Check if API is already enabled
    if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        print_info "$API_NAME: already enabled"
        ((ALREADY_ENABLED_COUNT++))
    else
        print_info "Enabling $API_NAME..."
        if gcloud services enable $api --project=$PROJECT_ID 2>&1 | grep -q "ERROR"; then
            print_warning "Failed to enable $API_NAME (may require billing or permissions)"
        else
            print_success "$API_NAME enabled"
            ((ENABLED_COUNT++))
        fi
    fi
done

echo ""
print_success "API Enablement Complete!"
echo "  - Enabled: $ENABLED_COUNT new APIs"
echo "  - Already enabled: $ALREADY_ENABLED_COUNT APIs"

# Step 4: Create Secrets in Secret Manager
print_header "Step 4: Creating Secrets in Secret Manager"

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local description=$2
    local prompt_text=$3
    local is_optional=${4:-false}
    
    echo ""
    echo "----------------------------------------"
    echo "$description"
    echo "Secret name: $secret_name"
    echo ""
    
    # Check if secret already exists
    if gcloud secrets describe $secret_name --project=$PROJECT_ID &>/dev/null; then
        print_warning "Secret '$secret_name' already exists."
        read -p "Do you want to update it? (y/n): " update_choice
        if [[ ! "$update_choice" =~ ^[Yy]$ ]]; then
            print_info "Skipping $secret_name"
            return 0
        fi
    fi
    
    # Get secret value
    echo "$prompt_text"
    if [ "$is_optional" = true ]; then
        echo "(Press Enter to skip)"
    fi
    echo ""
    
    read -sp "Enter value: " SECRET_VALUE
    echo ""
    
    if [ -z "$SECRET_VALUE" ]; then
        if [ "$is_optional" = true ]; then
            print_info "Skipping $secret_name (optional)"
            return 0
        else
            print_warning "No value provided, skipping $secret_name"
            return 1
        fi
    fi
    
    # Create or update secret
    if gcloud secrets describe $secret_name --project=$PROJECT_ID &>/dev/null; then
        # Update existing secret
        echo -n "$SECRET_VALUE" | gcloud secrets versions add $secret_name \
            --data-file=- \
            --project=$PROJECT_ID 2>&1 | grep -v "WARNING" || true
        print_success "Updated secret: $secret_name"
    else
        # Create new secret
        echo -n "$SECRET_VALUE" | gcloud secrets create $secret_name \
            --data-file=- \
            --project=$PROJECT_ID \
            --replication-policy="automatic" 2>&1 | grep -v "WARNING" || true
        print_success "Created secret: $secret_name"
    fi
    
    return 0
}

# Create Gemini API Key secret
create_or_update_secret \
    "gemini-api-key" \
    "Gemini API Key" \
    "Enter your Gemini API key (get it from https://makersuite.google.com/app/apikey):" \
    false

# Create GCP API Key secret (optional)
echo ""
read -p "Do you want to create a GCP API key secret? (y/n): " create_gcp_key
if [[ "$create_gcp_key" =~ ^[Yy]$ ]]; then
    echo ""
    echo "To create a GCP API key:"
    echo "1. Go to https://console.cloud.google.com/apis/credentials"
    echo "2. Click 'Create Credentials' > 'API Key'"
    echo "3. Copy the API key"
    echo ""
    create_or_update_secret \
        "gcp-api-key" \
        "GCP API Key" \
        "Enter your GCP API key:" \
        true
fi

# Create Vision API Key secret (optional)
echo ""
read -p "Do you want to create a Vision API key secret? (y/n): " create_vision_key
if [[ "$create_vision_key" =~ ^[Yy]$ ]]; then
    echo ""
    echo "To create a Vision API key:"
    echo "1. Go to https://console.cloud.google.com/apis/credentials"
    echo "2. Click 'Create Credentials' > 'API Key'"
    echo "3. Restrict the key to 'Cloud Vision API'"
    echo "4. Copy the API key"
    echo ""
    create_or_update_secret \
        "vision-api-key" \
        "Vision API Key" \
        "Enter your Vision API key:" \
        true
fi

# Create GCP Project ID secret
create_or_update_secret \
    "gcp-project-id" \
    "GCP Project ID" \
    "Enter your GCP Project ID (current: $PROJECT_ID):" \
    false

# Step 5: Summary
print_header "Setup Complete!"

echo "Summary:"
echo "  Project ID: $PROJECT_ID"
echo "  Account: $CURRENT_ACCOUNT"
echo "  APIs Enabled: $((ENABLED_COUNT + ALREADY_ENABLED_COUNT))"
echo ""
echo "Created Secrets:"
gcloud secrets list --project=$PROJECT_ID \
    --filter="name:gemini-api-key OR name:gcp-api-key OR name:vision-api-key OR name:gcp-project-id" \
    --format="table(name,createTime)" 2>/dev/null || echo "  (run 'gcloud secrets list' to view)"
echo ""

# Step 6: Next Steps
print_header "Next Steps"

echo "1. Grant Secret Manager access to your service account:"
echo "   bash scripts/grant-secret-access.sh $PROJECT_ID"
echo ""
echo "2. Set up backend proxy (see SECRET_MANAGER_SETUP.md)"
echo ""
echo "3. Configure your .env file:"
echo "   REACT_APP_GCP_PROJECT_ID=$PROJECT_ID"
echo "   REACT_APP_SECRET_MANAGER_BACKEND=http://localhost:3001/api/secrets"
echo ""
echo "4. Verify secrets:"
echo "   gcloud secrets list --project=$PROJECT_ID"
echo ""
echo "5. Test secret access:"
echo "   gcloud secrets versions access latest --secret=gemini-api-key --project=$PROJECT_ID"
echo ""

print_success "All done! Your Google Cloud setup is complete."
