/**
 * Service Mapping Utilities
 * Maps AWS and Azure services to their GCP equivalents
 * Used for cloud-to-cloud migration planning
 */

// AWS to GCP Service Mapping
export const awsToGcpMapping = {
  // Compute Services
  'EC2': {
    gcpService: 'Compute Engine',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Direct VM migration with minimal changes',
    considerations: [
      'Instance types may differ - review sizing',
      'Storage attachment methods vary',
      'Networking configuration needs adjustment'
    ]
  },
  'Lambda': {
    gcpService: 'Cloud Functions',
    gcpApi: 'cloudfunctions.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Function runtime and triggers may need adjustment',
    considerations: [
      'Event structure differences',
      'Timeout and memory limits vary',
      'Cold start behavior differs'
    ]
  },
  'ECS': {
    gcpService: 'Cloud Run',
    gcpApi: 'run.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Containerized workloads migrate well',
    considerations: [
      'Task definition format differs',
      'Service discovery mechanisms vary',
      'Load balancing configuration changes'
    ]
  },
  'EKS': {
    gcpService: 'Google Kubernetes Engine (GKE)',
    gcpApi: 'container.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Kubernetes clusters migrate easily',
    considerations: [
      'CNI plugins may differ',
      'Load balancer configurations vary',
      'Storage classes need remapping'
    ]
  },
  'Elastic Beanstalk': {
    gcpService: 'App Engine',
    gcpApi: 'appengine.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'PaaS platform differences require code changes',
    considerations: [
      'Deployment configuration differs',
      'Scaling mechanisms vary',
      'Integration points need review'
    ]
  },
  'Fargate': {
    gcpService: 'Cloud Run',
    gcpApi: 'run.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Serverless containers migrate well',
    considerations: [
      'Pricing model differences',
      'Scaling behavior varies',
      'VPC integration approaches differ'
    ]
  },
  'Batch': {
    gcpService: 'Cloud Batch',
    gcpApi: 'batch.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Job definitions need translation',
    considerations: [
      'Job scheduling differences',
      'Resource allocation models vary',
      'Retry and error handling approaches differ'
    ]
  },

  // Storage Services
  'S3': {
    gcpService: 'Cloud Storage',
    gcpApi: 'storage.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Object storage with similar features',
    considerations: [
      'Bucket naming conventions differ',
      'ACL and IAM models vary',
      'Lifecycle policies need translation',
      'Event notifications configured differently'
    ]
  },
  'EBS': {
    gcpService: 'Persistent Disk',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Block storage with similar capabilities',
    considerations: [
      'IOPS and throughput limits differ',
      'Snapshot mechanisms vary',
      'Encryption key management differs'
    ]
  },
  'EFS': {
    gcpService: 'Filestore',
    gcpApi: 'file.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Managed NFS file systems',
    considerations: [
      'Performance tiers differ',
      'Availability models vary',
      'Backup mechanisms need adjustment'
    ]
  },
  'Glacier': {
    gcpService: 'Cloud Storage (Archive)',
    gcpApi: 'storage.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Archive storage class',
    considerations: [
      'Retrieval times vary',
      'Pricing models differ',
      'Restore operations configured differently'
    ]
  },
  'Storage Gateway': {
    gcpService: 'Filestore / Cloud Storage FUSE',
    gcpApi: 'file.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Hybrid storage solutions',
    considerations: [
      'Deployment models differ',
      'Sync mechanisms vary',
      'Caching strategies need review'
    ]
  },

  // Database Services
  'RDS (PostgreSQL)': {
    gcpService: 'Cloud SQL for PostgreSQL',
    gcpApi: 'sqladmin.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Managed PostgreSQL with similar features',
    considerations: [
      'Version compatibility check required',
      'Backup and restore procedures differ',
      'Replication setup varies',
      'High availability configurations differ'
    ]
  },
  'RDS (MySQL)': {
    gcpService: 'Cloud SQL for MySQL',
    gcpApi: 'sqladmin.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Managed MySQL with similar features',
    considerations: [
      'Version compatibility check required',
      'Parameter groups translate to flags',
      'Read replicas configuration differs'
    ]
  },
  'RDS (SQL Server)': {
    gcpService: 'Cloud SQL for SQL Server',
    gcpApi: 'sqladmin.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Managed SQL Server',
    considerations: [
      'Version and edition compatibility',
      'Windows authentication differs',
      'Linked servers need review'
    ]
  },
  'DynamoDB': {
    gcpService: 'Firestore / Bigtable',
    gcpApi: 'firestore.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'NoSQL databases with different models',
    considerations: [
      'Data model differences significant',
      'Query patterns need redesign',
      'Global tables vs multi-region replicas',
      'Pricing models differ substantially'
    ]
  },
  'DocumentDB': {
    gcpService: 'MongoDB Atlas on GCP / Firestore',
    gcpApi: 'firestore.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'MongoDB-compatible or Firestore alternative',
    considerations: [
      'API compatibility varies',
      'Index strategies differ',
      'Sharding approaches vary'
    ]
  },
  'ElastiCache (Redis)': {
    gcpService: 'Memorystore for Redis',
    gcpApi: 'redis.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Managed Redis clusters',
    considerations: [
      'Cluster mode configurations differ',
      'Failover mechanisms vary',
      'Backup and restore procedures differ'
    ]
  },
  'ElastiCache (Memcached)': {
    gcpService: 'Memorystore for Memcached',
    gcpApi: 'memcache.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Managed Memcached',
    considerations: [
      'Configuration parameters differ',
      'Scaling mechanisms vary'
    ]
  },
  'Redshift': {
    gcpService: 'BigQuery',
    gcpApi: 'bigquery.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'Data warehouse with different architecture',
    considerations: [
      'SQL dialect differences',
      'Table design patterns differ',
      'ETL workflows need redesign',
      'Concurrency models vary significantly'
    ]
  },
  'Aurora': {
    gcpService: 'Cloud SQL (PostgreSQL/MySQL) / AlloyDB',
    gcpApi: 'sqladmin.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Aurora-specific features need evaluation',
    considerations: [
      'Aurora Serverless vs standard instances',
      'Multi-master configurations differ',
      'Backup and point-in-time recovery procedures vary'
    ]
  },
  'Neptune': {
    gcpService: 'Neo4j on GCP / Custom solution',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'Graph database - evaluate managed vs self-hosted',
    considerations: [
      'Query language differences',
      'Data model migration complexity',
      'Consider Neo4j AuraDB on GCP'
    ]
  },

  // Networking Services
  'VPC': {
    gcpService: 'Virtual Private Cloud (VPC)',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Virtual networking with similar concepts',
    considerations: [
      'CIDR allocation strategies differ',
      'Subnet configurations vary',
      'Route tables vs routes',
      'Security groups vs firewall rules'
    ]
  },
  'CloudFront': {
    gcpService: 'Cloud CDN',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Content delivery network',
    considerations: [
      'Caching behaviors differ',
      'Origin configurations vary',
      'SSL/TLS certificate management differs'
    ]
  },
  'Route 53': {
    gcpService: 'Cloud DNS',
    gcpApi: 'dns.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'DNS management service',
    considerations: [
      'Zone configuration similar',
      'Health checks configured differently',
      'Private DNS zones handled differently'
    ]
  },
  'API Gateway': {
    gcpService: 'API Gateway / Cloud Endpoints',
    gcpApi: 'apigateway.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'API management platforms',
    considerations: [
      'API definitions need translation',
      'Authentication mechanisms vary',
      'Rate limiting configurations differ',
      'Backend integration approaches differ'
    ]
  },
  'ALB/NLB': {
    gcpService: 'Cloud Load Balancing',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Load balancing services',
    considerations: [
      'Load balancer types map differently',
      'Health check configurations vary',
      'SSL termination approaches differ'
    ]
  },
  'Direct Connect': {
    gcpService: 'Cloud Interconnect',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Dedicated network connections',
    considerations: [
      'Partner networks may differ',
      'Pricing models vary',
      'Cross-connect requirements differ'
    ]
  },
  'VPN': {
    gcpService: 'Cloud VPN',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Site-to-site VPN connections',
    considerations: [
      'Configuration parameters differ',
      'BGP support varies',
      'High availability setups differ'
    ]
  },

  // Security & Identity
  'IAM': {
    gcpService: 'Cloud IAM',
    gcpApi: 'iam.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Identity and access management',
    considerations: [
      'Policy syntax differs significantly',
      'Role definitions vary',
      'Service accounts vs IAM roles',
      'Resource hierarchy concepts differ'
    ]
  },
  'Secrets Manager': {
    gcpService: 'Secret Manager',
    gcpApi: 'secretmanager.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Secrets management service',
    considerations: [
      'Secret structure differs',
      'Rotation mechanisms vary',
      'Integration patterns differ'
    ]
  },
  'KMS': {
    gcpService: 'Cloud Key Management Service',
    gcpApi: 'cloudkms.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Key management service',
    considerations: [
      'Key hierarchy differs',
      'Encryption/decryption APIs vary',
      'HSM support models differ'
    ]
  },
  'WAF': {
    gcpService: 'Cloud Armor',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Web application firewall',
    considerations: [
      'Rule syntax differs',
      'Attack patterns detected vary',
      'Rate limiting configurations differ'
    ]
  },
  'Shield': {
    gcpService: 'Cloud Armor + DDoS Protection',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'DDoS protection',
    considerations: [
      'Automatic protection included',
      'Configuration options differ'
    ]
  },
  'GuardDuty': {
    gcpService: 'Security Command Center',
    gcpApi: 'securitycenter.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Threat detection and security monitoring',
    considerations: [
      'Threat detection models differ',
      'Integration with SIEM varies',
      'Alerting mechanisms differ'
    ]
  },
  'Inspector': {
    gcpService: 'Security Command Center',
    gcpApi: 'securitycenter.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Security assessment service',
    considerations: [
      'Assessment types differ',
      'Vulnerability detection varies',
      'Reporting formats differ'
    ]
  },

  // Analytics & Big Data
  'EMR': {
    gcpService: 'Dataproc',
    gcpApi: 'dataproc.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Managed Hadoop/Spark clusters',
    considerations: [
      'Cluster configurations similar',
      'Job submission methods vary',
      'Storage integration differs'
    ]
  },
  'Kinesis': {
    gcpService: 'Pub/Sub',
    gcpApi: 'pubsub.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Streaming data platform',
    considerations: [
      'Message ordering differs',
      'Partitioning models vary',
      'Consumer groups vs subscriptions',
      'Retention policies differ'
    ]
  },
  'Athena': {
    gcpService: 'BigQuery',
    gcpApi: 'bigquery.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'Serverless query service',
    considerations: [
      'SQL dialect differences',
      'Data source integration differs',
      'Pricing models vary significantly'
    ]
  },
  'Glue': {
    gcpService: 'Dataflow / Dataprep',
    gcpApi: 'dataflow.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'ETL and data preparation',
    considerations: [
      'Job definitions need translation',
      'Catalog concepts differ',
      'Scheduling mechanisms vary'
    ]
  },
  'QuickSight': {
    gcpService: 'Looker / Data Studio',
    gcpApi: 'looker.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'Business intelligence platform',
    considerations: [
      'Data model differences',
      'Visualization capabilities vary',
      'Embedding approaches differ'
    ]
  },

  // Application Integration
  'SQS': {
    gcpService: 'Cloud Tasks / Pub/Sub',
    gcpApi: 'cloudtasks.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Message queuing service',
    considerations: [
      'Message delivery semantics differ',
      'Visibility timeout vs ack deadline',
      'Dead letter queues configured differently'
    ]
  },
  'SNS': {
    gcpService: 'Pub/Sub',
    gcpApi: 'pubsub.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Pub/sub messaging service',
    considerations: [
      'Topic and subscription models similar',
      'Message attributes handled differently',
      'Push subscriptions configured differently'
    ]
  },
  'EventBridge': {
    gcpService: 'Eventarc / Cloud Functions',
    gcpApi: 'eventarc.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Event-driven architecture',
    considerations: [
      'Event schemas differ',
      'Routing rules translate differently',
      'Integration patterns vary'
    ]
  },
  'Step Functions': {
    gcpService: 'Workflows',
    gcpApi: 'workflows.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Workflow orchestration',
    considerations: [
      'State machine definitions differ',
      'Error handling approaches vary',
      'Integration patterns differ'
    ]
  },
  'AppSync': {
    gcpService: 'Firebase App Sync / Custom',
    gcpApi: 'appsync.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'GraphQL API service',
    considerations: [
      'Schema definitions may need adjustment',
      'Data sources integration differs',
      'Real-time subscriptions handled differently'
    ]
  },

  // Monitoring & Logging
  'CloudWatch': {
    gcpService: 'Cloud Monitoring',
    gcpApi: 'monitoring.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Monitoring and observability',
    considerations: [
      'Metric namespaces differ',
      'Dashboard configurations need translation',
      'Alarms vs alerting policies',
      'Log groups vs log buckets'
    ]
  },
  'CloudWatch Logs': {
    gcpService: 'Cloud Logging',
    gcpApi: 'logging.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Log management service',
    considerations: [
      'Log format standards differ',
      'Query syntax varies (CloudWatch Insights vs LogQL)',
      'Retention policies configured differently',
      'Export mechanisms differ'
    ]
  },
  'X-Ray': {
    gcpService: 'Cloud Trace',
    gcpApi: 'cloudtrace.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Distributed tracing',
    considerations: [
      'Trace format differences',
      'Sampling strategies vary',
      'Integration SDKs differ'
    ]
  },
  'CloudTrail': {
    gcpService: 'Cloud Audit Logs',
    gcpApi: 'cloudaudit.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Audit logging service',
    considerations: [
      'Log structure differs',
      'Event types map differently',
      'Retention and archiving policies vary'
    ]
  },
  'Systems Manager': {
    gcpService: 'Cloud Asset Inventory / OS Config',
    gcpApi: 'cloudasset.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Systems management service',
    considerations: [
      'Patch management approaches differ',
      'Parameter store vs Secret Manager',
      'Run command capabilities vary'
    ]
  },
  'Config': {
    gcpService: 'Security Command Center / Config Validator',
    gcpApi: 'securitycenter.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Configuration compliance service',
    considerations: [
      'Rule definitions differ',
      'Compliance frameworks vary',
      'Remediation approaches differ'
    ]
  }
};

// Azure to GCP Service Mapping
export const azureToGcpMapping = {
  // Compute Services
  'Virtual Machines': {
    gcpService: 'Compute Engine',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Direct VM migration with minimal changes',
    considerations: [
      'VM sizes map differently',
      'Storage attachment methods vary',
      'Networking configuration needs adjustment'
    ]
  },
  'Azure Functions': {
    gcpService: 'Cloud Functions',
    gcpApi: 'cloudfunctions.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Serverless functions with similar concepts',
    considerations: [
      'Binding syntax differs',
      'Trigger mechanisms vary',
      'Scaling behaviors differ'
    ]
  },
  'Container Instances': {
    gcpService: 'Cloud Run',
    gcpApi: 'run.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Low',
    notes: 'Containerized workloads migrate easily',
    considerations: [
      'Container definitions similar',
      'Scaling configurations differ',
      'Networking models vary'
    ]
  },
  'Azure Kubernetes Service (AKS)': {
    gcpService: 'Google Kubernetes Engine (GKE)',
    gcpApi: 'container.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Kubernetes clusters migrate easily',
    considerations: [
      'CNI plugins may differ',
      'Load balancer configurations vary',
      'Storage classes need remapping',
      'Azure AD integration vs GCP IAM'
    ]
  },
  'App Service': {
    gcpService: 'App Engine',
    gcpApi: 'appengine.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'PaaS platform differences require code changes',
    considerations: [
      'Deployment models differ',
      'Application settings translate differently',
      'Scaling mechanisms vary',
      'Integration points need review'
    ]
  },
  'Service Fabric': {
    gcpService: 'GKE / Cloud Run',
    gcpApi: 'container.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'Microservices platform - consider Kubernetes',
    considerations: [
      'Service mesh alternatives (Istio)',
      'Stateful services need redesign',
      'Actor model patterns differ'
    ]
  },
  'Batch': {
    gcpService: 'Cloud Batch',
    gcpApi: 'batch.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Job definitions need translation',
    considerations: [
      'Job scheduling differences',
      'Resource allocation models vary',
      'Retry and error handling approaches differ'
    ]
  },
  'Azure Spring Cloud': {
    gcpService: 'Cloud Run for Anthos / GKE',
    gcpApi: 'run.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Spring Boot applications on managed platform',
    considerations: [
      'Service discovery mechanisms differ',
      'Configuration management varies',
      'Integration patterns differ'
    ]
  },

  // Storage Services
  'Blob Storage': {
    gcpService: 'Cloud Storage',
    gcpApi: 'storage.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Object storage with similar features',
    considerations: [
      'Access tier models differ',
      'Lifecycle policies need translation',
      'SAS tokens vs signed URLs',
      'Blob types map differently'
    ]
  },
  'Managed Disks': {
    gcpService: 'Persistent Disk',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Block storage with similar capabilities',
    considerations: [
      'Disk types map differently',
      'Snapshot mechanisms vary',
      'Encryption key management differs'
    ]
  },
  'Files': {
    gcpService: 'Filestore',
    gcpApi: 'file.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Managed file shares',
    considerations: [
      'SMB vs NFS protocols',
      'Performance tiers differ',
      'Backup mechanisms need adjustment'
    ]
  },
  'Archive Storage': {
    gcpService: 'Cloud Storage (Archive)',
    gcpApi: 'storage.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Archive storage class',
    considerations: [
      'Retrieval times vary',
      'Pricing models differ',
      'Restore operations configured differently'
    ]
  },
  'Data Lake Storage Gen2': {
    gcpService: 'Cloud Storage + BigQuery',
    gcpApi: 'storage.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Data lake architecture',
    considerations: [
      'HDFS compatibility layer differences',
      'ACL models vary',
      'Integration with analytics services differs'
    ]
  },
  'Queue Storage': {
    gcpService: 'Cloud Tasks / Pub/Sub',
    gcpApi: 'cloudtasks.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Message queuing service',
    considerations: [
      'Message delivery semantics differ',
      'Visibility timeout vs ack deadline',
      'Dead letter queues configured differently'
    ]
  },
  'Table Storage': {
    gcpService: 'Firestore / Bigtable',
    gcpApi: 'firestore.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'NoSQL table storage',
    considerations: [
      'Data model differences significant',
      'Query patterns need redesign',
      'Partitioning strategies differ'
    ]
  },

  // Database Services
  'Azure SQL Database': {
    gcpService: 'Cloud SQL for SQL Server',
    gcpApi: 'sqladmin.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Managed SQL Server',
    considerations: [
      'Version and edition compatibility',
      'Elastic pools vs instance configurations',
      'Geo-replication differs',
      'Backup retention policies vary'
    ]
  },
  'Azure Database for PostgreSQL': {
    gcpService: 'Cloud SQL for PostgreSQL',
    gcpApi: 'sqladmin.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Managed PostgreSQL',
    considerations: [
      'Version compatibility check required',
      'Backup and restore procedures differ',
      'High availability configurations differ'
    ]
  },
  'Azure Database for MySQL': {
    gcpService: 'Cloud SQL for MySQL',
    gcpApi: 'sqladmin.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Managed MySQL',
    considerations: [
      'Version compatibility check required',
      'Parameter configurations differ',
      'Read replicas configuration differs'
    ]
  },
  'Cosmos DB': {
    gcpService: 'Firestore / Bigtable / Spanner',
    gcpApi: 'firestore.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'Multi-model database - evaluate based on API',
    considerations: [
      'API compatibility varies (SQL, MongoDB, Cassandra, etc.)',
      'Consistency models differ',
      'Global distribution strategies vary',
      'Request units vs capacity planning'
    ]
  },
  'Azure Cache for Redis': {
    gcpService: 'Memorystore for Redis',
    gcpApi: 'redis.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Managed Redis',
    considerations: [
      'Cluster mode configurations differ',
      'Failover mechanisms vary',
      'Backup and restore procedures differ'
    ]
  },
  'Azure Synapse Analytics': {
    gcpService: 'BigQuery',
    gcpApi: 'bigquery.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'Data warehouse with different architecture',
    considerations: [
      'SQL dialect differences',
      'Table design patterns differ',
      'ETL workflows need redesign',
      'Concurrency models vary significantly'
    ]
  },
  'Azure Database for MariaDB': {
    gcpService: 'Cloud SQL for MySQL',
    gcpApi: 'sqladmin.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'MariaDB compatibility with MySQL',
    considerations: [
      'Feature compatibility check required',
      'Version differences to review'
    ]
  },

  // Networking Services
  'Virtual Network (VNet)': {
    gcpService: 'Virtual Private Cloud (VPC)',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Virtual networking with similar concepts',
    considerations: [
      'CIDR allocation strategies differ',
      'Subnet configurations vary',
      'Route tables vs routes',
      'Network security groups vs firewall rules'
    ]
  },
  'Azure CDN': {
    gcpService: 'Cloud CDN',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Content delivery network',
    considerations: [
      'Caching behaviors differ',
      'Origin configurations vary',
      'SSL/TLS certificate management differs'
    ]
  },
  'Azure DNS': {
    gcpService: 'Cloud DNS',
    gcpApi: 'dns.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'DNS management service',
    considerations: [
      'Zone configuration similar',
      'Health checks configured differently',
      'Private DNS zones handled differently'
    ]
  },
  'API Management': {
    gcpService: 'API Gateway / Cloud Endpoints',
    gcpApi: 'apigateway.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'API management platform',
    considerations: [
      'API definitions need translation',
      'Authentication mechanisms vary',
      'Rate limiting configurations differ',
      'Backend integration approaches differ'
    ]
  },
  'Load Balancer': {
    gcpService: 'Cloud Load Balancing',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Load balancing services',
    considerations: [
      'Load balancer types map differently',
      'Health probe configurations vary',
      'SSL termination approaches differ'
    ]
  },
  'ExpressRoute': {
    gcpService: 'Cloud Interconnect',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Dedicated network connections',
    considerations: [
      'Partner networks may differ',
      'Pricing models vary',
      'Cross-connect requirements differ'
    ]
  },
  'VPN Gateway': {
    gcpService: 'Cloud VPN',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Site-to-site VPN connections',
    considerations: [
      'Configuration parameters differ',
      'BGP support varies',
      'High availability setups differ'
    ]
  },
  'Front Door': {
    gcpService: 'Cloud CDN + Cloud Load Balancing',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Global load balancing and WAF',
    considerations: [
      'WAF rules need translation',
      'Origin configurations differ',
      'Traffic routing mechanisms vary'
    ]
  },
  'Application Gateway': {
    gcpService: 'Cloud Load Balancing (Application)',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Application load balancer',
    considerations: [
      'Rule configurations differ',
      'SSL policies vary',
      'URL path-based routing handled differently'
    ]
  },

  // Security & Identity
  'Azure Active Directory': {
    gcpService: 'Cloud Identity / Workspace',
    gcpApi: 'admin.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'High',
    notes: 'Identity and access management',
    considerations: [
      'Directory structures differ',
      'Synchronization approaches vary',
      'Conditional access policies differ',
      'Multi-factor authentication implementations vary'
    ]
  },
  'Key Vault': {
    gcpService: 'Secret Manager',
    gcpApi: 'secretmanager.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Secrets and key management',
    considerations: [
      'Secret structure differs',
      'Key rotation mechanisms vary',
      'HSM support models differ',
      'Integration patterns differ'
    ]
  },
  'Azure Information Protection': {
    gcpService: 'Cloud DLP',
    gcpApi: 'dlp.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Data protection and classification',
    considerations: [
      'Classification methods differ',
      'Labeling approaches vary',
      'Protection mechanisms differ'
    ]
  },
  'Azure Firewall': {
    gcpService: 'Cloud Firewall / Cloud Armor',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Firewall service',
    considerations: [
      'Rule syntax differs',
      'Threat intelligence integration varies',
      'DNS proxy features differ'
    ]
  },
  'Security Center': {
    gcpService: 'Security Command Center',
    gcpApi: 'securitycenter.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Security monitoring and management',
    considerations: [
      'Threat detection models differ',
      'Compliance frameworks vary',
      'Alerting mechanisms differ',
      'Integration with SIEM varies'
    ]
  },
  'Azure Sentinel': {
    gcpService: 'Security Command Center + Chronicle',
    gcpApi: 'securitycenter.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'SIEM solution',
    considerations: [
      'Log ingestion methods differ',
      'Query languages vary',
      'Playbook automation differs',
      'Threat hunting capabilities vary'
    ]
  },
  'Azure DDoS Protection': {
    gcpService: 'Cloud Armor + DDoS Protection',
    gcpApi: 'compute.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'DDoS protection',
    considerations: [
      'Automatic protection included',
      'Configuration options differ'
    ]
  },

  // Analytics & Big Data
  'HDInsight': {
    gcpService: 'Dataproc',
    gcpApi: 'dataproc.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Managed Hadoop/Spark clusters',
    considerations: [
      'Cluster configurations similar',
      'Job submission methods vary',
      'Storage integration differs'
    ]
  },
  'Event Hubs': {
    gcpService: 'Pub/Sub',
    gcpApi: 'pubsub.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Event streaming platform',
    considerations: [
      'Partitioning models differ',
      'Consumer groups vs subscriptions',
      'Retention policies differ',
      'Throughput units vs topic throughput'
    ]
  },
  'Stream Analytics': {
    gcpService: 'Dataflow',
    gcpApi: 'dataflow.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Stream processing service',
    considerations: [
      'Query syntax differs significantly',
      'Window functions vary',
      'Reference data handling differs'
    ]
  },
  'Data Factory': {
    gcpService: 'Dataflow / Cloud Composer',
    gcpApi: 'dataflow.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'ETL and data orchestration',
    considerations: [
      'Pipeline definitions differ',
      'Activity types map differently',
      'Integration runtime vs execution environments',
      'Scheduling mechanisms vary'
    ]
  },
  'Azure Databricks': {
    gcpService: 'Dataproc + BigQuery',
    gcpApi: 'dataproc.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Analytics platform',
    considerations: [
      'Notebook environments similar',
      'Cluster management differs',
      'Integration with storage varies',
      'MLflow integration differs'
    ]
  },
  'Power BI': {
    gcpService: 'Looker / Data Studio',
    gcpApi: 'looker.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'Business intelligence platform',
    considerations: [
      'Data model differences',
      'Visualization capabilities vary',
      'Embedding approaches differ',
      'Row-level security models differ'
    ]
  },
  'Azure Analysis Services': {
    gcpService: 'BigQuery + Looker',
    gcpApi: 'bigquery.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'Analytical data engine',
    considerations: [
      'Tabular model differences',
      'DAX vs SQL query languages',
      'Caching strategies vary'
    ]
  },

  // Application Integration
  'Service Bus': {
    gcpService: 'Pub/Sub',
    gcpApi: 'pubsub.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Messaging service',
    considerations: [
      'Queue vs topic semantics differ',
      'Message ordering handled differently',
      'Dead letter queues configured differently',
      'Sessions vs ordering keys'
    ]
  },
  'Event Grid': {
    gcpService: 'Eventarc / Cloud Functions',
    gcpApi: 'eventarc.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Event-driven architecture',
    considerations: [
      'Event schemas differ',
      'Subscription filters differ',
      'Delivery mechanisms vary',
      'Integration patterns differ'
    ]
  },
  'Logic Apps': {
    gcpService: 'Workflows',
    gcpApi: 'workflows.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Workflow orchestration',
    considerations: [
      'Workflow definitions differ',
      'Connector ecosystem varies',
      'Error handling approaches differ'
    ]
  },

  // Monitoring & Logging
  'Azure Monitor': {
    gcpService: 'Cloud Monitoring',
    gcpApi: 'monitoring.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Monitoring and observability',
    considerations: [
      'Metric namespaces differ',
      'Dashboard configurations need translation',
      'Alerts vs alerting policies',
      'Log Analytics vs Cloud Logging'
    ]
  },
  'Log Analytics': {
    gcpService: 'Cloud Logging',
    gcpApi: 'logging.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Log management service',
    considerations: [
      'Log format standards differ',
      'Query syntax varies (KQL vs LogQL)',
      'Retention policies configured differently',
      'Export mechanisms differ'
    ]
  },
  'Application Insights': {
    gcpService: 'Cloud Monitoring + Cloud Trace',
    gcpApi: 'monitoring.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Application performance monitoring',
    considerations: [
      'Telemetry collection differs',
      'Dashboard configurations vary',
      'Alerting mechanisms differ',
      'Integration SDKs differ'
    ]
  },
  'Activity Log': {
    gcpService: 'Cloud Audit Logs',
    gcpApi: 'cloudaudit.googleapis.com',
    migrationStrategy: 'Rehost',
    effort: 'Low',
    notes: 'Audit logging service',
    considerations: [
      'Log structure differs',
      'Event types map differently',
      'Retention and archiving policies vary'
    ]
  },
  'Azure Policy': {
    gcpService: 'Organization Policy / Config Validator',
    gcpApi: 'orgpolicy.googleapis.com',
    migrationStrategy: 'Replatform',
    effort: 'Medium',
    notes: 'Policy and compliance service',
    considerations: [
      'Policy definitions differ',
      'Compliance frameworks vary',
      'Remediation approaches differ'
    ]
  },
  'Azure Blueprints': {
    gcpService: 'Cloud Foundation Toolkit / Terraform',
    gcpApi: 'cloudresourcemanager.googleapis.com',
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'Infrastructure as code and governance',
    considerations: [
      'Blueprint definitions differ',
      'Artifact types map differently',
      'Versioning approaches vary'
    ]
  }
};

/**
 * Get GCP service mapping for an AWS service
 */
export function getAwsToGcpMapping(awsService) {
  // Normalize service name for lookup
  const normalizedService = String(awsService || '').trim();
  
  // Check exact match first
  if (awsToGcpMapping[normalizedService]) {
    return awsToGcpMapping[normalizedService];
  }
  
  // Handle generic service names with intelligent fallbacks
  const serviceLower = normalizedService.toLowerCase();
  
  // RDS - generic mapping (if specific type not found)
  if (serviceLower === 'rds' || serviceLower.startsWith('rds ')) {
    return {
      gcpService: 'Cloud SQL (PostgreSQL/MySQL/SQL Server)',
      gcpApi: 'sqladmin.googleapis.com',
      migrationStrategy: 'Rehost',
      effort: 'Low',
      notes: 'Managed database service - specific engine type determines exact GCP service',
      considerations: [
        'Identify database engine type (PostgreSQL, MySQL, SQL Server)',
        'Map to Cloud SQL for PostgreSQL, Cloud SQL for MySQL, or Cloud SQL for SQL Server',
        'Evaluate if AlloyDB is needed for PostgreSQL workloads requiring higher performance'
      ]
    };
  }
  
  // AWS Marketplace - map to GCP Marketplace or specific service
  if (serviceLower.includes('marketplace') || serviceLower === 'aws marketplace') {
    return {
      gcpService: 'GCP Marketplace / Cloud Marketplace',
      gcpApi: 'cloudbilling.googleapis.com',
      migrationStrategy: 'Repurchase',
      effort: 'Medium',
      notes: 'Third-party software licenses - evaluate equivalent solutions in GCP Marketplace',
      considerations: [
        'Check GCP Marketplace for equivalent solutions',
        'Review licensing terms and costs',
        'Consider alternative GCP-native solutions'
      ]
    };
  }
  
  // Support services
  if (serviceLower.includes('support') || serviceLower.includes('enterprise')) {
    return {
      gcpService: 'GCP Support (Enterprise/Standard)',
      gcpApi: 'cloudsupport.googleapis.com',
      migrationStrategy: 'Repurchase',
      effort: 'Low',
      notes: 'Support subscription - select appropriate GCP support tier',
      considerations: [
        'Map AWS support tier to equivalent GCP support tier',
        'Review support SLAs and response times'
      ]
    };
  }
  
  // Data Transfer
  if (serviceLower.includes('datatransfer') || serviceLower === 'data transfer') {
    return {
      gcpService: 'Cloud Interconnect / Direct Peering',
      gcpApi: 'compute.googleapis.com',
      migrationStrategy: 'Rehost',
      effort: 'Low',
      notes: 'Network data transfer costs - optimize with Cloud Interconnect for high-volume transfers',
      considerations: [
        'Use Cloud Interconnect for predictable egress costs',
        'Consider Direct Peering for high-volume workloads',
        'Plan data migration strategy to minimize transfer costs'
      ]
    };
  }
  
  // AWS Service Fee - generic billing
  if (serviceLower.includes('service fee') || serviceLower.includes('aws service fee')) {
    return {
      gcpService: 'GCP Billing / Service Usage',
      gcpApi: 'cloudbilling.googleapis.com',
      migrationStrategy: 'Rehost',
      effort: 'Low',
      notes: 'Generic service fees - review detailed billing to identify specific services',
      considerations: [
        'Review detailed AWS billing to identify specific services',
        'Map individual services to GCP equivalents',
        'Optimize service usage to reduce fees'
      ]
    };
  }
  
  // Default fallback
  return {
    gcpService: 'Custom Solution Required',
    gcpApi: null,
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'No direct mapping available - custom solution needed',
    considerations: [
      'Evaluate requirements and design custom solution',
      'Consider equivalent GCP services',
      'Plan for integration complexity'
    ]
  };
}

/**
 * Get GCP service mapping for an Azure service
 */
export function getAzureToGcpMapping(azureService) {
  return azureToGcpMapping[azureService] || {
    gcpService: 'Custom Solution Required',
    gcpApi: null,
    migrationStrategy: 'Refactor',
    effort: 'High',
    notes: 'No direct mapping available - custom solution needed',
    considerations: [
      'Evaluate requirements and design custom solution',
      'Consider equivalent GCP services',
      'Plan for integration complexity'
    ]
  };
}

/**
 * Get all AWS services
 */
export function getAllAwsServices() {
  return Object.keys(awsToGcpMapping);
}

/**
 * Get all Azure services
 */
export function getAllAzureServices() {
  return Object.keys(azureToGcpMapping);
}

/**
 * Get migration complexity score (1-10)
 */
export function getMigrationComplexity(mapping) {
  const effortMap = {
    'Low': 2,
    'Medium': 5,
    'High': 8
  };
  return effortMap[mapping.effort] || 5;
}

/**
 * Suggest migration wave based on service type and complexity
 */
export function suggestMigrationWave(mapping, workload) {
  const complexity = getMigrationComplexity(mapping);
  
  if (complexity <= 2) {
    return 'Wave 1 - Quick Wins';
  } else if (complexity <= 5) {
    return 'Wave 2 - Standard Migrations';
  } else {
    return 'Wave 3 - Complex Migrations';
  }
}
