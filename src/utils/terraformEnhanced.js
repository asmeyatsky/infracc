/**
 * Enhanced Terraform Generator with Variables and Modules
 * Generates modular, production-ready Terraform configurations
 */

/**
 * Generate terraform.tfvars file with all configuration values
 */
export const generateTfvars = (config) => {
  return `# Terraform Variables Configuration
# Generated: ${new Date().toISOString()}

# Organization Configuration
organization_id     = "${config.organizationId || ''}"
billing_account_id  = "${config.billingAccountId || ''}"

# Project Configuration
projects = [
${config.projects?.map(p => `  {
    id          = "${p.id}"
    name        = "${p.name}"
    environment = "${p.environment}"
  }`).join(',\n') || ''}
]

# Folder Structure
folders = ${JSON.stringify(config.folders || [], null, 2)}

# Network Configuration
network_config = {
  vpc_name    = "${config.networkConfig?.vpcName || 'main-vpc'}"
  region      = "${config.networkConfig?.region || 'us-central1'}"
  subnets     = ${JSON.stringify(config.networkConfig?.subnets || [], null, 2)}
  enable_nat  = ${config.networkConfig?.enableNat !== false}
  enable_vpn  = ${config.networkConfig?.enableVpn === true}
}

# Security Configuration
security_config = {
  enable_vpc_sc       = ${config.securityConfig?.enableVpcSc === true}
  enable_org_policies = ${config.securityConfig?.enableOrgPolicies !== false}
  enable_logging      = ${config.securityConfig?.enableLogging !== false}
  log_retention_days  = ${config.securityConfig?.logRetentionDays || 30}
}

# Compute Configuration
compute_config = {
  enable_gke        = ${config.computeConfig?.enableGKE === true}
  gke_cluster_name  = "${config.computeConfig?.gkeClusterName || 'primary-cluster'}"
  gke_node_count    = ${config.computeConfig?.gkeNodeCount || 3}
  enable_gce        = ${config.computeConfig?.enableGCE !== false}
}

# Storage Configuration
storage_config = {
  enable_cloud_sql     = ${config.storageConfig?.enableCloudSQL === true}
  sql_tier             = "${config.storageConfig?.sqlTier || 'db-n1-standard-1'}"
  enable_cloud_storage = ${config.storageConfig?.enableCloudStorage !== false}
  storage_class        = "${config.storageConfig?.storageClass || 'STANDARD'}"
}

# Observability Configuration
observability_config = {
  enable_monitoring  = ${config.observabilityConfig?.enableMonitoring !== false}
  enable_logging     = ${config.observabilityConfig?.enableLogging !== false}
  log_sink_destination = "${config.observabilityConfig?.logSinkDestination || 'bigquery'}"
}

# Tags and Labels
labels = {
  environment = "production"
  managed_by  = "terraform"
  project     = "cloud-migration"
}
`;
};

/**
 * Generate variables.tf with variable definitions
 */
export const generateVariablesTf = () => {
  return `# Terraform Variable Definitions
# Defines all input variables with types, descriptions, and defaults

variable "organization_id" {
  description = "GCP Organization ID"
  type        = string
}

variable "billing_account_id" {
  description = "GCP Billing Account ID"
  type        = string
}

variable "projects" {
  description = "List of projects to create"
  type = list(object({
    id          = string
    name        = string
    environment = string
  }))
  default = []
}

variable "folders" {
  description = "List of folder names to create"
  type        = list(string)
  default     = []
}

variable "network_config" {
  description = "Network configuration"
  type = object({
    vpc_name   = string
    region     = string
    subnets    = list(object({
      name          = string
      ip_cidr_range = string
      region        = string
    }))
    enable_nat = bool
    enable_vpn = bool
  })
}

variable "security_config" {
  description = "Security and compliance configuration"
  type = object({
    enable_vpc_sc       = bool
    enable_org_policies = bool
    enable_logging      = bool
    log_retention_days  = number
  })
}

variable "compute_config" {
  description = "Compute configuration"
  type = object({
    enable_gke       = bool
    gke_cluster_name = string
    gke_node_count   = number
    enable_gce       = bool
  })
}

variable "storage_config" {
  description = "Storage configuration"
  type = object({
    enable_cloud_sql     = bool
    sql_tier             = string
    enable_cloud_storage = bool
    storage_class        = string
  })
}

variable "observability_config" {
  description = "Observability and monitoring configuration"
  type = object({
    enable_monitoring    = bool
    enable_logging       = bool
    log_sink_destination = string
  })
}

variable "labels" {
  description = "Common labels to apply to all resources"
  type        = map(string)
  default = {
    managed_by = "terraform"
  }
}
`;
};

/**
 * Generate outputs.tf with output definitions
 */
export const generateOutputsTf = () => {
  return `# Terraform Outputs
# Exports important resource IDs and endpoints

output "project_ids" {
  description = "List of created project IDs"
  value       = module.projects[*].project_id
}

output "vpc_id" {
  description = "VPC network ID"
  value       = module.network.vpc_id
}

output "vpc_self_link" {
  description = "VPC network self link"
  value       = module.network.vpc_self_link
}

output "subnet_ids" {
  description = "Map of subnet names to IDs"
  value       = module.network.subnet_ids
}

output "nat_ips" {
  description = "NAT gateway external IPs"
  value       = module.network.nat_ips
}

output "gke_cluster_name" {
  description = "GKE cluster name"
  value       = var.compute_config.enable_gke ? module.gke[0].cluster_name : null
}

output "gke_cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = var.compute_config.enable_gke ? module.gke[0].endpoint : null
  sensitive   = true
}

output "cloud_sql_instance_name" {
  description = "Cloud SQL instance name"
  value       = var.storage_config.enable_cloud_sql ? module.cloud_sql[0].instance_name : null
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name"
  value       = var.storage_config.enable_cloud_sql ? module.cloud_sql[0].connection_name : null
}

output "monitoring_workspace_id" {
  description = "Cloud Monitoring workspace ID"
  value       = module.observability.workspace_id
}

output "log_sink_destination" {
  description = "Log sink destination"
  value       = module.observability.log_sink_destination
}
`;
};

/**
 * Generate backend.tf with remote state configuration
 */
export const generateBackendTf = (bucketName) => {
  return `# Terraform Backend Configuration
# Configures remote state storage in GCS

terraform {
  backend "gcs" {
    bucket = "${bucketName || 'terraform-state-bucket'}"
    prefix = "landing-zone"
  }
}
`;
};

/**
 * Generate versions.tf with provider version constraints
 */
export const generateVersionsTf = () => {
  return `# Terraform and Provider Version Constraints

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "google" {
  project = var.projects[0].id
  region  = var.network_config.region
}

provider "google-beta" {
  project = var.projects[0].id
  region  = var.network_config.region
}
`;
};

/**
 * Generate modular main.tf that uses sub-modules
 */
export const generateModularMainTf = () => {
  return `# Main Terraform Configuration
# Orchestrates all modules

# Projects Module
module "projects" {
  source   = "./modules/projects"
  for_each = { for p in var.projects : p.id => p }

  organization_id    = var.organization_id
  billing_account_id = var.billing_account_id
  project_id         = each.value.id
  project_name       = each.value.name
  environment        = each.value.environment
  labels             = var.labels
}

# Network Module
module "network" {
  source = "./modules/network"

  project_id = var.projects[0].id
  vpc_name   = var.network_config.vpc_name
  region     = var.network_config.region
  subnets    = var.network_config.subnets
  enable_nat = var.network_config.enable_nat
  enable_vpn = var.network_config.enable_vpn

  depends_on = [module.projects]
}

# GKE Module (conditional)
module "gke" {
  source = "./modules/gke"
  count  = var.compute_config.enable_gke ? 1 : 0

  project_id         = var.projects[0].id
  region             = var.network_config.region
  cluster_name       = var.compute_config.gke_cluster_name
  network            = module.network.vpc_self_link
  subnetwork         = module.network.subnet_ids[var.network_config.subnets[0].name]
  initial_node_count = var.compute_config.gke_node_count
  labels             = var.labels

  depends_on = [module.network]
}

# Cloud SQL Module (conditional)
module "cloud_sql" {
  source = "./modules/cloud_sql"
  count  = var.storage_config.enable_cloud_sql ? 1 : 0

  project_id    = var.projects[0].id
  region        = var.network_config.region
  instance_name = "primary-db"
  tier          = var.storage_config.sql_tier
  network_id    = module.network.vpc_id
  labels        = var.labels

  depends_on = [module.network]
}

# Cloud Storage Module
module "cloud_storage" {
  source = "./modules/cloud_storage"

  project_id    = var.projects[0].id
  location      = var.network_config.region
  storage_class = var.storage_config.storage_class
  labels        = var.labels

  depends_on = [module.projects]
}

# Security Module
module "security" {
  source = "./modules/security"

  organization_id     = var.organization_id
  project_ids         = [for p in module.projects : p.project_id]
  enable_vpc_sc       = var.security_config.enable_vpc_sc
  enable_org_policies = var.security_config.enable_org_policies
  log_retention_days  = var.security_config.log_retention_days

  depends_on = [module.projects]
}

# Observability Module
module "observability" {
  source = "./modules/observability"

  project_id           = var.projects[0].id
  enable_monitoring    = var.observability_config.enable_monitoring
  enable_logging       = var.observability_config.enable_logging
  log_sink_destination = var.observability_config.log_sink_destination
  labels               = var.labels

  depends_on = [module.projects]
}
`;
};

/**
 * Generate README for the Terraform configuration
 */
export const generateTerraformReadme = () => {
  return `# Google Cloud Landing Zone - Terraform Configuration

This Terraform configuration creates a production-ready Google Cloud landing zone with modular architecture.

## Prerequisites

1. **Install Terraform** (>= 1.5.0)
   \`\`\`bash
   brew install terraform  # macOS
   # or download from https://www.terraform.io/downloads
   \`\`\`

2. **Install gcloud CLI**
   \`\`\`bash
   brew install google-cloud-sdk  # macOS
   # or download from https://cloud.google.com/sdk/docs/install
   \`\`\`

3. **Authenticate with GCP**
   \`\`\`bash
   gcloud auth application-default login
   \`\`\`

4. **Set up GCS bucket for Terraform state**
   \`\`\`bash
   gsutil mb gs://your-terraform-state-bucket
   gsutil versioning set on gs://your-terraform-state-bucket
   \`\`\`

## Directory Structure

\`\`\`
terraform/
├── main.tf              # Main configuration with module calls
├── variables.tf         # Variable definitions
├── terraform.tfvars     # Variable values (DO NOT COMMIT!)
├── outputs.tf           # Output definitions
├── backend.tf           # Remote state configuration
├── versions.tf          # Provider version constraints
├── modules/
│   ├── projects/        # Project creation module
│   ├── network/         # VPC and networking module
│   ├── gke/             # GKE cluster module
│   ├── cloud_sql/       # Cloud SQL module
│   ├── cloud_storage/   # Cloud Storage module
│   ├── security/        # Security and compliance module
│   └── observability/   # Monitoring and logging module
└── README.md            # This file
\`\`\`

## Usage

### 1. Configure Variables

Edit \`terraform.tfvars\` with your specific values:

\`\`\`hcl
organization_id    = "123456789012"
billing_account_id = "ABCDEF-123456-ABCDEF"
\`\`\`

### 2. Initialize Terraform

\`\`\`bash
terraform init
\`\`\`

### 3. Plan Changes

\`\`\`bash
terraform plan -out=tfplan
\`\`\`

### 4. Apply Configuration

\`\`\`bash
terraform apply tfplan
\`\`\`

### 5. View Outputs

\`\`\`bash
terraform output
\`\`\`

## Module Documentation

### Projects Module
Creates GCP projects with proper IAM and billing configuration.

### Network Module
Sets up VPC, subnets, Cloud NAT, and optionally Cloud VPN.

### GKE Module
Deploys a production-ready GKE cluster with auto-scaling and monitoring.

### Cloud SQL Module
Creates managed PostgreSQL/MySQL instances with backups and HA.

### Cloud Storage Module
Provisions Cloud Storage buckets with lifecycle policies.

### Security Module
Implements VPC Service Controls and organization policies.

### Observability Module
Configures Cloud Monitoring, Logging, and alerting.

## Security Considerations

1. **State File**: Contains sensitive data. Store in encrypted GCS bucket with versioning.
2. **Service Accounts**: Use least-privilege IAM roles.
3. **Secrets**: Never commit \`terraform.tfvars\` or \`.tfstate\` files to Git.
4. **VPC SC**: Enable VPC Service Controls for sensitive workloads.

## Cost Optimization

- Enable committed use discounts for predictable workloads
- Use preemptible nodes for non-critical GKE workloads
- Configure lifecycle policies for Cloud Storage
- Set up budget alerts in Cloud Billing

## Maintenance

### Upgrading Providers

\`\`\`bash
terraform init -upgrade
terraform plan
\`\`\`

### Destroying Resources

⚠️ **WARNING**: This will delete ALL resources!

\`\`\`bash
terraform destroy
\`\`\`

## Support

For issues or questions:
- [Terraform GCP Provider Docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [GCP Documentation](https://cloud.google.com/docs)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
`;
};

export default {
  generateTfvars,
  generateVariablesTf,
  generateOutputsTf,
  generateBackendTf,
  generateVersionsTf,
  generateModularMainTf,
  generateTerraformReadme,
};
