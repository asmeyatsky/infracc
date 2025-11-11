# AWS Bill of Materials (BOM) Import Guide

## 📥 Supported Input Formats

### 1. **AWS Cost and Usage Report (CUR)**
   - **Format**: Standard AWS CUR CSV export
   - **Source**: AWS Cost Explorer → Export → Cost and Usage Report
   - **Columns Supported**:
     - `LineItem/ProductCode` (EC2, S3, RDS, etc.)
     - `LineItem/ResourceId`
     - `LineItem/UnblendedCost`
     - `Product/instanceType`
     - `Product/operatingSystem`
     - `Product/location` (region)
     - `LineItem/UsageAmount`

### 2. **Simplified AWS Bill CSV**
   - **Format**: Custom CSV with columns: `Service`, `Resource ID`, `Instance Type`, `Region`, `Monthly Cost`
   - **Use Case**: Quick import from AWS billing dashboard or custom reports
   - **Template**: Available in the application

### 3. **Standard Workload CSV**
   - **Format**: Generic CSV with columns: `name`, `type`, `cpu`, `memory`, `storage`, `monthlyCost`
   - **Use Case**: Manual workload entry or third-party tools

## 🎯 What You Get

### 1. **GCP Service Equivalents**
   - **Automatic Mapping**: AWS services → GCP equivalents
   - **Service Mapping Examples**:
     - EC2 → Compute Engine
     - RDS → Cloud SQL
     - S3 → Cloud Storage
     - EBS → Persistent Disk
     - Lambda → Cloud Functions
     - ECS/EKS → GKE (Google Kubernetes Engine)
     - ElastiCache → Memorystore
     - DynamoDB → Firestore/Datastore
     - CloudFront → Cloud CDN
     - API Gateway → Cloud Endpoints/API Gateway

### 2. **Cost Comparisons**
   - **TCO Analysis**: Total Cost of Ownership comparison
   - **Multi-Cloud Comparison**: AWS vs Azure vs GCP
   - **ROI Calculations**: Return on investment metrics
   - **Cost Optimization**: Right-sizing recommendations
   - **Migration Cost Estimates**: One-time migration costs

### 3. **Migration Strategy**
   - **6 R's Framework**: Rehost, Replatform, Refactor, Repurchase, Retire, Retain
   - **Migration Waves**: Organized by complexity and dependencies
   - **Risk Assessment**: Migration complexity and risk scoring
   - **Timeline Estimates**: Migration duration projections

### 4. **Additional Value-Adds**

#### **Assessment & Readiness**
   - Workload complexity scoring
   - Migration readiness assessment
   - Dependency mapping
   - Performance analysis

#### **Infrastructure as Code**
   - Terraform generation for GCP
   - Landing zone configuration
   - Production-ready IaC templates

#### **Cost Optimization**
   - Right-sizing recommendations
   - Reserved instance analysis
   - Spot instance opportunities
   - Storage optimization

#### **Governance & Compliance**
   - Policy compliance checking
   - Security best practices
   - Resource tagging strategies

#### **Visualization**
   - Dependency graphs
   - Cost dashboards
   - Migration progress tracking
   - Executive summaries

## 🚀 How to Use

### Step 1: Import AWS BOM
1. Navigate to **Discovery** tab
2. Select **CSV Import**
3. Choose your AWS bill format:
   - **AWS CUR**: Full Cost and Usage Report
   - **Simplified**: Custom CSV with Service, Resource ID, Cost
4. Upload your CSV file
5. Workloads are automatically created and saved

### Step 2: Review GCP Equivalents
- Each AWS service is automatically mapped to GCP equivalent
- View service mapping details and migration strategies
- See effort levels and considerations

### Step 3: Cost Analysis
- Navigate to **Cost Analysis** tab
- View TCO comparisons
- See ROI calculations
- Get optimization recommendations

### Step 4: Migration Strategy
- Navigate to **Strategy** tab
- Review migration waves
- See 6 R's recommendations
- Check timeline estimates

## 📊 Example AWS BOM Import

```csv
Service,Resource ID,Instance Type,Region,Monthly Cost ($)
EC2,i-1234567890abcdef0,m5.large,us-east-1,73.00
EC2,i-0987654321fedcba0,t3.medium,us-west-2,30.00
RDS,database-1,db.t3.medium,us-east-1,150.00
S3,my-bucket,Standard,us-east-1,25.00
EBS,vol-1234567890abcdef0,gp3,us-east-1,10.00
Lambda,my-function,128MB,us-east-1,5.00
```

## 🔍 Supported AWS Services

- **Compute**: EC2, Lambda, ECS, EKS, Fargate
- **Storage**: S3, EBS, EFS, Glacier
- **Databases**: RDS, DynamoDB, ElastiCache, Redshift
- **Networking**: VPC, CloudFront, API Gateway, ELB
- **Analytics**: EMR, Kinesis, Athena
- **Management**: CloudWatch, CloudFormation, Systems Manager

## 💡 Tips

1. **Export from AWS**: Use AWS Cost Explorer for most accurate data
2. **Include Instance Types**: Helps with accurate GCP sizing
3. **Regional Data**: Include region for accurate cost comparisons
4. **Monthly Costs**: Use actual AWS billing data for best results
5. **Resource IDs**: Helps track individual resources through migration

## 📈 Output Deliverables

1. **GCP Service Mapping Report**: Complete AWS → GCP service mappings
2. **Cost Comparison Report**: TCO analysis with ROI calculations
3. **Migration Strategy Plan**: Detailed migration waves and timelines
4. **Terraform Templates**: Production-ready infrastructure code
5. **Executive Dashboard**: High-level summary and recommendations
