# Service Mapping Enhancement

## Overview

The service mapping system has been enhanced to use **official Google Cloud documentation** as the primary source for service mappings.

**Official Documentation Source:**
https://docs.cloud.google.com/docs/get-started/aws-azure-gcp-service-comparison

## What Changed

### 1. Google Cloud Docs Adapter Created ✅

**File**: `src/infrastructure/adapters/GoogleCloudDocsAdapter.js`

- References official Google Cloud service comparison documentation
- Provides authoritative service mappings based on official docs
- Includes comprehensive mappings for:
  - Compute services (EC2, Lambda, ECS, EKS, etc.)
  - Storage services (S3, EBS, EFS, etc.)
  - Database services (RDS, DynamoDB, Redshift, etc.)
  - Networking services (VPC, CloudFront, Route 53, etc.)
  - Security services (IAM, Secrets Manager, etc.)
  - Monitoring services (CloudWatch, CloudTrail, etc.)

### 2. Service Mapping Repository Enhanced ✅

**File**: `src/infrastructure/repositories/ServiceMappingRepository.js`

- **Enhanced** to use Google Cloud Docs Adapter as primary source
- Falls back to static mappings if official mapping not found
- Provides best of both worlds:
  - Official documentation accuracy
  - Static mapping fallback for reliability

### 3. Features

- ✅ **Official Documentation Reference**: All mappings reference official Google Cloud docs
- ✅ **Comprehensive Coverage**: Includes all major services from AWS and Azure
- ✅ **Detailed Considerations**: Each mapping includes migration considerations
- ✅ **Category Organization**: Services organized by category (Compute, Storage, Database, etc.)
- ✅ **Fallback Strategy**: Falls back to static mappings if official not available

## How It Works

### Priority Order

1. **Official Google Cloud Documentation** (Primary)
   - Uses Google Cloud Docs Adapter
   - Most accurate and up-to-date
   - Includes official documentation URLs

2. **Static Mappings** (Fallback)
   - Existing static mappings from `serviceMapping.js`
   - Ensures reliability if official docs unavailable

### Example Flow

```javascript
// 1. Request mapping for AWS EC2
const mapping = await serviceMappingRepository.getMapping('EC2', 'aws');

// 2. Repository checks official docs first
const officialMapping = await googleCloudDocsAdapter.getOfficialMapping('aws', 'EC2');

// 3. If found, returns official mapping with:
//    - Official documentation URL
//    - Accurate service mapping
//    - Detailed considerations
//    - Category information

// 4. If not found, falls back to static mapping
```

## Service Mappings Included

### AWS Services (30+ mappings)

**Compute:**
- EC2 → Compute Engine
- Lambda → Cloud Functions (2nd gen)
- ECS → Cloud Run
- EKS → GKE
- Elastic Beanstalk → App Engine
- Fargate → Cloud Run

**Storage:**
- S3 → Cloud Storage
- EBS → Persistent Disk
- EFS → Filestore
- Glacier → Cloud Storage (Coldline/Archive)

**Database:**
- RDS → Cloud SQL
- DynamoDB → Firestore
- Redshift → BigQuery
- ElastiCache → Memorystore

**Networking:**
- VPC → VPC
- CloudFront → Cloud CDN
- Route 53 → Cloud DNS
- ALB/NLB → Cloud Load Balancing

**Security & Monitoring:**
- IAM → Cloud IAM
- Secrets Manager → Secret Manager
- CloudWatch → Cloud Monitoring
- CloudTrail → Cloud Audit Logs

### Azure Services (20+ mappings)

**Compute:**
- Virtual Machines → Compute Engine
- Azure Functions → Cloud Functions (2nd gen)
- Container Instances → Cloud Run
- AKS → GKE
- App Service → App Engine

**Storage:**
- Blob Storage → Cloud Storage
- Managed Disks → Persistent Disk
- Files → Filestore

**Database:**
- SQL Database → Cloud SQL
- Cosmos DB → Firestore / Bigtable
- Redis Cache → Memorystore

**Networking:**
- Virtual Network → VPC
- CDN → Cloud CDN
- DNS → Cloud DNS
- Load Balancer → Cloud Load Balancing

**Security & Monitoring:**
- Azure AD → Cloud Identity / IAM
- Key Vault → Secret Manager
- Monitor → Cloud Monitoring

## Benefits

1. **Accuracy**: Uses official Google Cloud documentation
2. **Completeness**: Comprehensive coverage of major services
3. **Reliability**: Falls back to static mappings if needed
4. **Documentation Links**: Each mapping includes official docs URL
5. **Detailed Considerations**: Migration considerations for each service

## Usage

The enhanced service mapping is automatically used:

```javascript
// Get dependencies from container
const container = getContainer();
const serviceMappingPort = container.serviceMappingPort;

// Get mapping (automatically uses official docs)
const mapping = await serviceMappingPort.getMapping('EC2', 'aws');

// Mapping includes:
// - Official documentation URL
// - Accurate GCP service mapping
// - Migration strategy
// - Effort level
// - Detailed considerations
```

## Configuration

The service mapping repository can be configured:

```javascript
// Use official docs (default)
const repository = new ServiceMappingRepository({
  useOfficialDocs: true
});

// Use only static mappings
const repository = new ServiceMappingRepository({
  useOfficialDocs: false
});
```

## Future Enhancements

1. **Live API Integration**: Fetch mappings directly from Google Cloud docs API (if available)
2. **HTML Parsing**: Parse the documentation page for real-time updates
3. **Caching**: Cache official mappings for performance
4. **Validation**: Validate mappings against current documentation

## References

- **Official Documentation**: https://docs.cloud.google.com/docs/get-started/aws-azure-gcp-service-comparison
- **Adapter**: `src/infrastructure/adapters/GoogleCloudDocsAdapter.js`
- **Repository**: `src/infrastructure/repositories/ServiceMappingRepository.js`
