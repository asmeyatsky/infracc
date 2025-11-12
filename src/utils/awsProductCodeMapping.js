/**
 * AWS Product Code to Service Name Mapping
 * 
 * Maps AWS Cost and Usage Report (CUR) product codes to standardized service names.
 * AWS CUR files use product codes like "AmazonEC2", "AmazonS3", etc.
 * This mapping normalizes them to service names used in serviceMapping.js (e.g., "EC2", "S3").
 * 
 * Based on official AWS service product codes from AWS Pricing API and CUR documentation.
 */

/**
 * Comprehensive mapping of AWS product codes to service names
 * Product codes are typically in format: Amazon{ServiceName} or AWS{ServiceName}
 */
export const awsProductCodeToService = {
  // Compute Services
  'AMAZONEC2': 'EC2',
  'EC2': 'EC2',
  'EC2-INSTANCE': 'EC2',
  'AMAZONECS': 'ECS',
  'ECS': 'ECS',
  'AMAZONEKS': 'EKS',
  'EKS': 'EKS',
  'AWSLAMBDA': 'Lambda',
  'LAMBDA': 'Lambda',
  'AMAZONELASTICBEANSTALK': 'Elastic Beanstalk',
  'ELASTICBEANSTALK': 'Elastic Beanstalk',
  'AMAZONFARGATE': 'Fargate',
  'FARGATE': 'Fargate',
  'AMAZONBATCH': 'Batch',
  'BATCH': 'Batch',
  'AMAZONECR': 'ECR', // Elastic Container Registry
  'ECR': 'ECR',
  'AMAZONELASTICCONTAINERREGISTRY': 'ECR',
  'ELASTICCONTAINERREGISTRY': 'ECR',
  'AMAZONLIGHTSAIL': 'Lightsail',
  'LIGHTSAIL': 'Lightsail',
  'AMAZONOUTPOSTS': 'Outposts',
  'OUTPOSTS': 'Outposts',
  'AMAZONWORKSPACES': 'WorkSpaces',
  'WORKSPACES': 'WorkSpaces',
  'AMAZONWORKSPACESWEB': 'WorkSpaces Web',
  'WORKSPACESWEB': 'WorkSpaces Web',
  'AMAZONAPPSTREAM': 'AppStream',
  'APPSTREAM': 'AppStream',
  'AMAZONNIMBLESTUDIO': 'Nimble Studio',
  'NIMBLESTUDIO': 'Nimble Studio',
  'AMAZONGAMELIFT': 'GameLift',
  'GAMELIFT': 'GameLift',
  'AMAZONROBOMAKER': 'RoboMaker',
  'ROBOMAKER': 'RoboMaker',
  
  // Storage Services
  'AMAZONS3': 'S3',
  'S3': 'S3',
  'S3-STORAGE': 'S3',
  'AMAZONGLACIER': 'Glacier',
  'GLACIER': 'Glacier',
  'AMAZONEFS': 'EFS',
  'EFS': 'EFS',
  'AMAZONEBS': 'EBS',
  'EBS': 'EBS',
  'AMAZONSTORAGEGATEWAY': 'Storage Gateway',
  'STORAGEGATEWAY': 'Storage Gateway',
  'AMAZONFSX': 'FSx',
  'FSX': 'FSX',
  'AMAZONFSXLUSTRE': 'FSx for Lustre',
  'FSXLUSTRE': 'FSx for Lustre',
  'AMAZONFSXWINDOWSFILESERVER': 'FSx for Windows File Server',
  'FSXWINDOWSFILESERVER': 'FSx for Windows File Server',
  'AMAZONFSXNETHAPPADMIN': 'FSx for NetApp ONTAP',
  'FSXNETHAPPADMIN': 'FSx for NetApp ONTAP',
  'AMAZONFSXOPENZFS': 'FSx for OpenZFS',
  'FSXOPENZFS': 'FSx for OpenZFS',
  'AMAZONBACKUP': 'AWS Backup',
  'AWSBACKUP': 'AWS Backup',
  'BACKUP': 'AWS Backup',
  
  // Database Services
  'AMAZONRDS': 'RDS',
  'RDS': 'RDS',
  'AMAZONRDS-MYSQL': 'RDS (MySQL)',
  'AMAZONRDS-MARIADB': 'RDS (MySQL)',
  'AMAZONRDS-POSTGRESQL': 'RDS (PostgreSQL)',
  'AMAZONRDS-SQLSERVER': 'RDS (SQL Server)',
  'AMAZONRDS-ORACLE': 'RDS (Oracle)',
  'AMAZONAURORA': 'Aurora',
  'AURORA': 'Aurora',
  'AMAZONDYNAMODB': 'DynamoDB',
  'DYNAMODB': 'DynamoDB',
  'AMAZONELASTICACHE': 'ElastiCache (Redis)',
  'ELASTICACHE': 'ElastiCache (Redis)',
  'AMAZONELASTICACHE-REDIS': 'ElastiCache (Redis)',
  'AMAZONELASTICACHE-MEMCACHED': 'ElastiCache (Memcached)',
  'AMAZONREDSHIFT': 'Redshift',
  'REDSHIFT': 'Redshift',
  'AMAZONNEPTUNE': 'Neptune',
  'NEPTUNE': 'Neptune',
  'AMAZONDOCUMENTDB': 'DocumentDB',
  'DOCUMENTDB': 'DocumentDB',
  'AMAZONTIMESTREAM': 'Timestream',
  'TIMESTREAM': 'Timestream',
  'AMAZONQLDB': 'QLDB',
  'QLDB': 'QLDB',
  'AMAZONKEYS': 'Keyspaces',
  'KEYS': 'Keyspaces',
  'AMAZONKEYSPACES': 'Keyspaces',
  'KEYSPACES': 'Keyspaces',
  
  // Networking Services
  'AMAZONVPC': 'VPC',
  'VPC': 'VPC',
  'AMAZONCLOUDFRONT': 'CloudFront',
  'CLOUDFRONT': 'CloudFront',
  'AMAZONROUTE53': 'Route 53',
  'ROUTE53': 'Route 53',
  'ROUTE 53': 'Route 53',
  'AMAZONAPIGATEWAY': 'API Gateway',
  'APIGATEWAY': 'API Gateway',
  'AMAZONDIRECTCONNECT': 'Direct Connect',
  'DIRECTCONNECT': 'Direct Connect',
  'AMAZONVPN': 'VPN',
  'VPN': 'VPN',
  'AMAZONTRANSITGATEWAY': 'Transit Gateway',
  'TRANSITGATEWAY': 'Transit Gateway',
  'AMAZONPRIVATELINK': 'PrivateLink',
  'PRIVATELINK': 'PrivateLink',
  'AMAZONELASTICLOADBALANCING': 'ALB/NLB',
  'ELASTICLOADBALANCING': 'ALB/NLB',
  'AMAZONELASTICLOADBALANCING-APPLICATION': 'ALB/NLB',
  'AMAZONELASTICLOADBALANCING-NETWORK': 'ALB/NLB',
  'AMAZONELASTICLOADBALANCING-CLASSIC': 'ALB/NLB',
  'AMAZONELASTICLOADBALANCING-GATEWAY': 'ALB/NLB',
  'AWSELB': 'ALB/NLB', // Elastic Load Balancing (legacy code)
  'ELB': 'ALB/NLB',
  'AMAZONGLOBALACCELERATOR': 'Global Accelerator',
  'GLOBALACCELERATOR': 'Global Accelerator',
  'AMAZONCLOUDFRONT-ORIGINSHIELD': 'CloudFront',
  'AMAZONCLOUDFRONT-EDGE': 'CloudFront',
  
  // Security & Identity Services
  'AMAZONIAM': 'IAM',
  'IAM': 'IAM',
  'AMAZONSECRETSMANAGER': 'Secrets Manager',
  'SECRETSMANAGER': 'Secrets Manager',
  'AMAZONKMS': 'KMS',
  'KMS': 'KMS',
  'AMAZONCLOUDHSM': 'CloudHSM',
  'CLOUDHSM': 'CloudHSM',
  'AMAZONWAF': 'WAF',
  'WAF': 'WAF',
  'AMAZONSHIELD': 'Shield',
  'SHIELD': 'Shield',
  'AMAZONGUARDDUTY': 'GuardDuty',
  'GUARDDUTY': 'GuardDuty',
  'AMAZONINSPECTOR': 'Inspector',
  'INSPECTOR': 'Inspector',
  'AMAZONINSPECTORV2': 'Inspector',
  'AMAZONMACIE': 'Macie',
  'MACIE': 'Macie',
  'AMAZONCERTIFICATEMANAGER': 'Certificate Manager',
  'CERTIFICATEMANAGER': 'Certificate Manager',
  'AMAZONCOGNITO': 'Cognito',
  'COGNITO': 'COGNITO',
  'AMAZONARTIFACT': 'Artifact',
  'ARTIFACT': 'Artifact',
  'AMAZONDETECTIVE': 'Detective',
  'DETECTIVE': 'Detective',
  'AMAZONFIREWALLMANAGER': 'Firewall Manager',
  'FIREWALLMANAGER': 'Firewall Manager',
  'AMAZONRESOURCEGROUPS': 'Resource Groups',
  'RESOURCEGROUPS': 'Resource Groups',
  'AMAZONRESOURCEGROUPS-TAGGING': 'Resource Groups',
  
  // Analytics & Big Data Services
  'AMAZONEMR': 'EMR',
  'EMR': 'EMR',
  'AMAZONELASTICMAPREDUCE': 'EMR',
  'ELASTICMAPREDUCE': 'EMR',
  'AMAZONKINESIS': 'Kinesis',
  'KINESIS': 'Kinesis',
  'AMAZONKINESISANALYTICS': 'Kinesis Analytics',
  'KINESISANALYTICS': 'Kinesis Analytics',
  'AMAZONKINESISVIDEOSTREAMS': 'Kinesis Video Streams',
  'KINESISVIDEOSTREAMS': 'Kinesis Video Streams',
  'AMAZONATHENA': 'Athena',
  'ATHENA': 'Athena',
  'AMAZONGLUE': 'Glue',
  'GLUE': 'Glue',
  'AMAZONQUICKSIGHT': 'QuickSight',
  'QUICKSIGHT': 'QuickSight',
  'AMAZONOPENSEARCH': 'OpenSearch',
  'OPENSEARCH': 'OpenSearch',
  'AMAZONOPENSEARCHSERVICE': 'OpenSearch',
  'AMAZONELASTICSEARCH': 'OpenSearch',
  'ELASTICSEARCH': 'OpenSearch',
  'AMAZONES': 'OpenSearch', // Alternative product code for Elasticsearch/OpenSearch
  'ES': 'OpenSearch',
  'AMAZONELASTICMAPREDUCE': 'EMR',
  'AMAZONDATAEXCHANGE': 'Data Exchange',
  'DATAEXCHANGE': 'Data Exchange',
  'AMAZONFINSPACE': 'FinSpace',
  'FINSPACE': 'FinSPACE',
  'AMAZONMANAGEDSTREAMINGFORAPACHEKAFKA': 'MSK',
  'MSK': 'MSK',
  'AMAZONMSK': 'MSK',
  
  // Application Integration Services
  'AMAZONSQS': 'SQS',
  'SQS': 'SQS',
  'AMAZONSNS': 'SNS',
  'SNS': 'SNS',
  'AMAZONEVENTBRIDGE': 'EventBridge',
  'EVENTBRIDGE': 'EventBridge',
  'AMAZONSTEPFUNCTIONS': 'Step Functions',
  'STEPFUNCTIONS': 'Step Functions',
  'AMAZONSTATES': 'Step Functions', // Alternative product code for Step Functions
  'STATES': 'Step Functions',
  'AMAZONAPPSYNC': 'AppSync',
  'APPSYNC': 'AppSync',
  'AMAZONMQ': 'MQ',
  'MQ': 'MQ',
  'AMAZONCONNECT': 'Connect',
  'CONNECT': 'Connect',
  'AMAZONCHIME': 'Chime',
  'CHIME': 'Chime',
  'AMAZONCHIMESDK': 'Chime SDK',
  'CHIMESDK': 'Chime SDK',
  'AMAZONWORKMAIL': 'WorkMail',
  'WORKMAIL': 'WorkMail',
  'AMAZONSIMPLEEMAILSERVICE': 'SES',
  'SES': 'SES',
  'AMAZONSIMPLEEMAILSERVICE-SES': 'SES',
  
  // Monitoring & Logging Services
  'AMAZONCLOUDWATCH': 'CloudWatch',
  'CLOUDWATCH': 'CloudWatch',
  'AMAZONCLOUDWATCHLOGS': 'CloudWatch Logs',
  'CLOUDWATCHLOGS': 'CloudWatch Logs',
  'AMAZONX-RAY': 'X-Ray',
  'X-RAY': 'X-Ray',
  'XRAY': 'X-Ray',
  'AMAZONCLOUDTRAIL': 'CloudTrail',
  'CLOUDTRAIL': 'CloudTrail',
  'AMAZONSYSTEMSMANAGER': 'Systems Manager',
  'SYSTEMSMANAGER': 'Systems Manager',
  'AMAZONCONFIG': 'Config',
  'CONFIG': 'Config',
  'AMAZONPERSONALIZE': 'Personalize',
  'PERSONALIZE': 'Personalize',
  'AMAZONCLOUDWATCHEVENTS': 'EventBridge',
  'CLOUDWATCHEVENTS': 'EventBridge',
  
  // Machine Learning & AI Services
  'AMAZONSAGEMAKER': 'SageMaker',
  'SAGEMAKER': 'SageMaker',
  'AMAZONREKOGNITION': 'Rekognition',
  'REKOGNITION': 'Rekognition',
  'AMAZONCOMPREHEND': 'Comprehend',
  'COMPREHEND': 'COMPREHEND',
  'AMAZONTRANSLATE': 'Translate',
  'TRANSLATE': 'Translate',
  'AMAZONPOLLY': 'Polly',
  'POLLY': 'POLLY',
  'AMAZONLEX': 'Lex',
  'LEX': 'LEX',
  'AMAZONTEXTRACT': 'Textract',
  'TEXTRACT': 'Textract',
  'AMAZONFORECAST': 'Forecast',
  'FORECAST': 'Forecast',
  'AMAZONFRAUDDETECTOR': 'Fraud Detector',
  'FRAUDDETECTOR': 'Fraud Detector',
  'AMAZONKENDRA': 'Kendra',
  'KENDRA': 'KENDRA',
  'AMAZONCODEWHISPERER': 'CodeWhisperer',
  'CODEWHISPERER': 'CodeWhisperer',
  'AMAZONBEDROCK': 'Bedrock',
  'BEDROCK': 'Bedrock',
  'AMAZONCODEGURU': 'CodeGuru',
  'CODEGURU': 'CodeGuru',
  
  // Developer Tools
  'AMAZONCODEBUILD': 'CodeBuild',
  'CODEBUILD': 'CodeBuild',
  'AMAZONCODEDEPLOY': 'CodeDeploy',
  'CODEDEPLOY': 'CodeDeploy',
  'AMAZONCODEPIPELINE': 'CodePipeline',
  'CODEPIPELINE': 'CodePipeline',
  'AMAZONCODEARTIFACT': 'CodeArtifact',
  'CODEARTIFACT': 'CodeArtifact',
  'AMAZONCODECOMMIT': 'CodeCommit',
  'CODECOMMIT': 'CodeCommit',
  'AMAZONCLOUD9': 'Cloud9',
  'CLOUD9': 'Cloud9',
  'AMAZONCLOUDDEVELOPMENTKIT': 'CDK',
  'CDK': 'CDK',
  
  // Management & Governance
  'AMAZONCLOUDCONTROLAPI': 'Cloud Control API',
  'CLOUDCONTROLAPI': 'Cloud Control API',
  'AMAZONCLOUDFORMATION': 'CloudFormation',
  'CLOUDFORMATION': 'CloudFormation',
  'AMAZONSERVICECATALOG': 'Service Catalog',
  'SERVICECATALOG': 'Service Catalog',
  'AMAZONTRUSTEDADVISOR': 'Trusted Advisor',
  'TRUSTEDADVISOR': 'Trusted Advisor',
  'AMAZONCOSTEXPLORER': 'Cost Explorer',
  'COSTEXPLORER': 'Cost Explorer',
  'AMAZONBILLINGCONSOLE': 'Billing Console',
  'BILLINGCONSOLE': 'Billing Console',
  'AMAZONORGANIZATIONS': 'Organizations',
  'ORGANIZATIONS': 'Organizations',
  'AMAZONCONTROLMOWER': 'Control Tower',
  'CONTROLTOWER': 'Control Tower',
  'AMAZONLICENSEMANAGER': 'License Manager',
  'LICENSEMANAGER': 'License Manager',
  'AMAZONACCOUNTMANAGEMENT': 'Account Management',
  'ACCOUNTMANAGEMENT': 'Account Management',
  
  // Media Services
  'AMAZONELEMENTALMEDIACONVERT': 'Elemental MediaConvert',
  'ELEMENTALMEDIACONVERT': 'Elemental MediaConvert',
  'AMAZONELEMENTALMEDIALIVE': 'Elemental MediaLive',
  'ELEMENTALMEDIALIVE': 'Elemental MediaLive',
  'AMAZONELEMENTALMEDIAPACKAGE': 'Elemental MediaPackage',
  'ELEMENTALMEDIAPACKAGE': 'Elemental MediaPackage',
  'AMAZONELEMENTALMEDIASTORE': 'Elemental MediaStore',
  'ELEMENTALMEDIASTORE': 'Elemental MediaStore',
  'AMAZONELEMENTALMEDIATAILOR': 'Elemental MediaTailor',
  'ELEMENTALMEDIATAILOR': 'Elemental MediaTailor',
  'AMAZONIVS': 'IVS',
  'IVS': 'IVS',
  'AMAZONKINESISVIDEO': 'Kinesis Video',
  'KINESISVIDEO': 'Kinesis Video',
  
  // IoT Services
  'AMAZONIOT': 'IoT Core',
  'IOT': 'IoT Core',
  'IOTCORE': 'IoT Core',
  'AMAZONIOTANALYTICS': 'IoT Analytics',
  'IOTANALYTICS': 'IoT Analytics',
  'AMAZONIOTDEVICEDEFENDER': 'IoT Device Defender',
  'IOTDEVICEDEFENDER': 'IoT Device Defender',
  'AMAZONIOTDEVICEMANAGEMENT': 'IoT Device Management',
  'IOTDEVICEMANAGEMENT': 'IoT Device Management',
  'AMAZONIOTEVENTS': 'IoT Events',
  'IOTEVENTS': 'IoT Events',
  'AMAZONIOTGREENGASS': 'IoT Greengrass',
  'IOTGREENGASS': 'IoT Greengrass',
  'AMAZONIOTSITEWISE': 'IoT SiteWise',
  'IOTSITEWISE': 'IoT SiteWise',
  'AMAZONIOTTHINGGRAPH': 'IoT Things Graph',
  'IOTTHINGGRAPH': 'IoT Things Graph',
  
  // Blockchain Services
  'AMAZONMANAGEDBLOCKCHAIN': 'Managed Blockchain',
  'MANAGEDBLOCKCHAIN': 'Managed Blockchain',
  'AMAZONQLDB': 'QLDB',
  
  // Quantum Computing
  'AMAZONBRAKET': 'Braket',
  'BRAKET': 'Braket',
  
  // Satellite Services
  'AMAZONGROUNDSTATION': 'Ground Station',
  'GROUNDSTATION': 'Ground Station',
  
  // Other Services
  'AMAZONWORKDOCS': 'WorkDocs',
  'WORKDOCS': 'WorkDocs',
  'AMAZONWORKLINK': 'WorkLink',
  'WORKLINK': 'WorkLink',
  'AMAZONHONEYCODE': 'Honeycode',
  'HONEYCODE': 'Honeycode',
  'AMAZONSUPPLYCHAIN': 'Supply Chain',
  'SUPPLYCHAIN': 'Supply Chain',
  'AMAZONSUPPLYCHAINMANAGEMENT': 'Supply Chain',
  'AMAZONSUPPLYCHAINMANAGEMENTDATA': 'Supply Chain',
  
  // Service Fees & Credits
  'OCBLATEFEE': 'AWS Service Fee',
  'OCBCLOUDFRONT': 'CloudFront', // On-Demand Cloud Billing prefix
  
  // AWS Marketplace (third-party products - alphanumeric codes)
  // These are detected by pattern matching, not direct mapping
  'OCBEC2': 'EC2',
  'OCBS3': 'S3',
  'OCBRDS': 'RDS',
  'OCBLAMBDA': 'Lambda',
  'OCBECS': 'ECS',
  'OCBEKS': 'EKS',
  'OCBDYNAMODB': 'DynamoDB',
  'OCBELASTICACHE': 'ElastiCache (Redis)',
  'OCBREDSHIFT': 'Redshift',
  'OCBATHENA': 'Athena',
  'OCBGLUE': 'Glue',
  'OCBKINESIS': 'Kinesis',
  'OCBEMR': 'EMR',
  'OCBSQS': 'SQS',
  'OCBSNS': 'SNS',
  'OCBAPIGATEWAY': 'API Gateway',
  'OCBROUTE53': 'Route 53',
  'OCBVPC': 'VPC',
  'OCBCLOUDWATCH': 'CloudWatch',
  'OCBCLOUDTRAIL': 'CloudTrail',
  'OCBIAM': 'IAM',
  'OCBKMS': 'KMS',
  'OCBSAGEMAKER': 'SageMaker',
  'AWS-SUPPORT': 'Support',
  'SUPPORT': 'Support',
  'TAX': null, // Skip taxes
  
  // Savings Plans & Reserved Instances (pricing models, not services)
  'COMPUTESAVINGSPLANS': 'EC2', // EC2 Savings Plans
  'AMAZONCOMPUTESAVINGSPLANS': 'EC2',
  'EC2SAVINGSPLANS': 'EC2',
  'EC2-SAVINGSPLANS': 'EC2',
  'EC2INSTANCESAVINGSPLANS': 'EC2',
  'EC2INSTANCE-SAVINGSPLANS': 'EC2',
  'SAGEMAKERSAVINGSPLANS': 'SageMaker',
  'AMAZONSAGEMAKERSAVINGSPLANS': 'SageMaker',
  'LAMBDASAVINGSPLANS': 'Lambda',
  'AMAZONLAMBDASAVINGSPLANS': 'Lambda',
  'EC2RESERVEDINSTANCE': 'EC2',
  'AMAZONEC2RESERVEDINSTANCE': 'EC2',
  'EC2-RESERVEDINSTANCE': 'EC2',
  'RDSRESERVEDINSTANCE': 'RDS',
  'AMAZONRDSRESERVEDINSTANCE': 'RDS',
  'RDS-RESERVEDINSTANCE': 'RDS',
  'REDSHIFTRESERVEDINSTANCE': 'Redshift',
  'AMAZONREDSHIFTRESERVEDINSTANCE': 'Redshift',
  'ELASTICACHERESERVEDINSTANCE': 'ElastiCache (Redis)',
  'AMAZONELASTICACHERESERVEDINSTANCE': 'ElastiCache (Redis)',
};

/**
 * Normalize AWS product code to service name
 * @param {string} productCode - AWS product code (e.g., "AmazonEC2", "AMAZONS3")
 * @returns {string} Normalized service name (e.g., "EC2", "S3")
 */
export function normalizeAwsProductCode(productCode) {
  if (!productCode) {
    return 'Unknown';
  }
  
  // Normalize to uppercase for lookup
  const normalized = productCode.toUpperCase().trim();
  
  // Direct lookup
  if (awsProductCodeToService[normalized]) {
    return awsProductCodeToService[normalized];
  }
  
  // Try removing "AMAZON" prefix
  if (normalized.startsWith('AMAZON')) {
    const withoutPrefix = normalized.substring(6); // Remove "AMAZON"
    if (awsProductCodeToService[withoutPrefix]) {
      return awsProductCodeToService[withoutPrefix];
    }
    // Try with "AMAZON" prefix
    if (awsProductCodeToService[normalized]) {
      return awsProductCodeToService[normalized];
    }
  }
  
  // Try removing "AWS" prefix
  if (normalized.startsWith('AWS')) {
    const withoutPrefix = normalized.substring(3); // Remove "AWS"
    if (awsProductCodeToService[withoutPrefix]) {
      return awsProductCodeToService[withoutPrefix];
    }
  }
  
  // Try removing "OCB" prefix (On-Demand Cloud Billing)
  if (normalized.startsWith('OCB')) {
    const withoutPrefix = normalized.substring(3); // Remove "OCB"
    // Direct lookup for OCB-prefixed codes
    if (awsProductCodeToService[normalized]) {
      return awsProductCodeToService[normalized];
    }
    // Try to infer service from the remaining part
    if (withoutPrefix.startsWith('CLOUDFRONT')) {
      return 'CloudFront';
    } else if (withoutPrefix.startsWith('EC2')) {
      return 'EC2';
    } else if (withoutPrefix.startsWith('S3')) {
      return 'S3';
    } else if (withoutPrefix.startsWith('RDS')) {
      return 'RDS';
    } else if (withoutPrefix.startsWith('LAMBDA')) {
      return 'Lambda';
    } else if (withoutPrefix.startsWith('ECS')) {
      return 'ECS';
    } else if (withoutPrefix.startsWith('EKS')) {
      return 'EKS';
    } else if (withoutPrefix.startsWith('DYNAMODB')) {
      return 'DynamoDB';
    } else if (withoutPrefix.startsWith('ELASTICACHE')) {
      return 'ElastiCache (Redis)';
    } else if (withoutPrefix.startsWith('REDSHIFT')) {
      return 'Redshift';
    } else if (withoutPrefix.startsWith('ATHENA')) {
      return 'Athena';
    } else if (withoutPrefix.startsWith('GLUE')) {
      return 'Glue';
    } else if (withoutPrefix.startsWith('KINESIS')) {
      return 'Kinesis';
    } else if (withoutPrefix.startsWith('EMR')) {
      return 'EMR';
    } else if (withoutPrefix.startsWith('SQS')) {
      return 'SQS';
    } else if (withoutPrefix.startsWith('SNS')) {
      return 'SNS';
    } else if (withoutPrefix.startsWith('APIGATEWAY')) {
      return 'API Gateway';
    } else if (withoutPrefix.startsWith('ROUTE53')) {
      return 'Route 53';
    } else if (withoutPrefix.startsWith('VPC')) {
      return 'VPC';
    } else if (withoutPrefix.startsWith('CLOUDWATCH')) {
      return 'CloudWatch';
    } else if (withoutPrefix.startsWith('CLOUDTRAIL')) {
      return 'CloudTrail';
    } else if (withoutPrefix.startsWith('IAM')) {
      return 'IAM';
    } else if (withoutPrefix.startsWith('KMS')) {
      return 'KMS';
    } else if (withoutPrefix.startsWith('SAGEMAKER')) {
      return 'SageMaker';
    }
    // Use the service name after OCB prefix
    return withoutPrefix;
  }
  
  // If still not found, try common patterns
  // Handle hyphenated codes (e.g., "EC2-INSTANCE" -> "EC2")
  if (normalized.includes('-')) {
    const baseCode = normalized.split('-')[0];
    if (awsProductCodeToService[baseCode]) {
      return awsProductCodeToService[baseCode];
    }
  }
  
  // CRITICAL FIX: Instead of warning and returning original, try intelligent fallback
  // Extract service name from product code patterns
  let inferredService = null;
  
  // Pattern: Amazon{SERVICE} -> SERVICE
  if (normalized.startsWith('AMAZON')) {
    inferredService = normalized.substring(6); // Remove "AMAZON"
    // Try common service name patterns
    if (inferredService.startsWith('EC2')) {
      inferredService = 'EC2';
    } else if (inferredService.startsWith('S3')) {
      inferredService = 'S3';
    } else if (inferredService.startsWith('RDS')) {
      inferredService = 'RDS';
    } else if (inferredService.startsWith('ELASTICLOADBALANCING') || inferredService.startsWith('ELB')) {
      inferredService = 'ALB/NLB';
    } else if (inferredService.startsWith('ELASTICCONTAINERREGISTRY') || inferredService.startsWith('ECR')) {
      inferredService = 'ECR';
    } else if (inferredService.startsWith('ELASTICSEARCH') || inferredService.startsWith('ES')) {
      inferredService = 'OpenSearch';
    } else if (inferredService.startsWith('STEPFUNCTIONS') || inferredService.startsWith('STATES')) {
      inferredService = 'Step Functions';
    } else if (inferredService.startsWith('ELASTICACHE')) {
      inferredService = 'ElastiCache (Redis)';
    } else if (inferredService.startsWith('DYNAMODB')) {
      inferredService = 'DynamoDB';
    } else if (inferredService.startsWith('CLOUDFRONT')) {
      inferredService = 'CloudFront';
    } else if (inferredService.startsWith('ROUTE53')) {
      inferredService = 'Route 53';
    } else if (inferredService.startsWith('APIGATEWAY')) {
      inferredService = 'API Gateway';
    } else if (inferredService.startsWith('LAMBDA')) {
      inferredService = 'Lambda';
    } else if (inferredService.startsWith('ECS')) {
      inferredService = 'ECS';
    } else if (inferredService.startsWith('EKS')) {
      inferredService = 'EKS';
    } else if (inferredService.startsWith('VPC')) {
      inferredService = 'VPC';
    } else if (inferredService.startsWith('IAM')) {
      inferredService = 'IAM';
    } else if (inferredService.startsWith('KMS')) {
      inferredService = 'KMS';
    } else if (inferredService.startsWith('CLOUDHSM')) {
      inferredService = 'CloudHSM';
    } else if (inferredService.startsWith('CLOUDWATCH')) {
      inferredService = 'CloudWatch';
    } else if (inferredService.startsWith('CLOUDTRAIL')) {
      inferredService = 'CloudTrail';
    } else if (inferredService.startsWith('SQS')) {
      inferredService = 'SQS';
    } else if (inferredService.startsWith('SNS')) {
      inferredService = 'SNS';
    } else if (inferredService.startsWith('EVENTBRIDGE')) {
      inferredService = 'EventBridge';
    } else if (inferredService.startsWith('SAGEMAKER')) {
      inferredService = 'SageMaker';
    } else if (inferredService.startsWith('REDSHIFT')) {
      inferredService = 'Redshift';
    } else if (inferredService.startsWith('ATHENA')) {
      inferredService = 'Athena';
    } else if (inferredService.startsWith('GLUE')) {
      inferredService = 'Glue';
    } else if (inferredService.startsWith('EMR') || inferredService.startsWith('ELASTICMAPREDUCE')) {
      inferredService = 'EMR';
    } else if (inferredService.startsWith('KINESIS')) {
      inferredService = 'Kinesis';
    } else if (inferredService.startsWith('QUICKSIGHT')) {
      inferredService = 'QuickSight';
    } else if (inferredService.startsWith('BEDROCK')) {
      inferredService = 'Bedrock';
    } else {
      // Use the inferred service name as-is (removing AMAZON prefix)
      inferredService = inferredService;
    }
  }
  
  // Pattern: AWS{SERVICE} -> SERVICE
  if (!inferredService && normalized.startsWith('AWS')) {
    inferredService = normalized.substring(3); // Remove "AWS"
    // Common AWS-prefixed services
    if (inferredService.startsWith('ELB')) {
      inferredService = 'ALB/NLB';
    } else if (inferredService.startsWith('LAMBDA')) {
      inferredService = 'Lambda';
    } else if (inferredService.startsWith('BACKUP')) {
      inferredService = 'AWS Backup';
    }
  }
  
  // Pattern: Direct service codes without prefix (e.g., CLOUDHSM, CLOUDWATCH, ELASTICMAPREDUCE, etc.)
  if (!inferredService) {
    // EMR / Elastic MapReduce
    if (normalized === 'ELASTICMAPREDUCE' || normalized.startsWith('ELASTICMAPREDUCE')) {
      inferredService = 'EMR';
    }
    // CloudHSM
    else if (normalized === 'CLOUDHSM' || normalized.startsWith('CLOUDHSM')) {
      inferredService = 'CloudHSM';
    }
    // CloudWatch
    else if (normalized.startsWith('CLOUDWATCH')) {
      inferredService = 'CloudWatch';
    }
    // CloudTrail
    else if (normalized.startsWith('CLOUDTRAIL')) {
      inferredService = 'CloudTrail';
    }
    // CloudFront
    else if (normalized.startsWith('CLOUDFRONT')) {
      inferredService = 'CloudFront';
    }
    // CloudFormation
    else if (normalized.startsWith('CLOUDFORMATION')) {
      inferredService = 'CloudFormation';
    }
    // Cloud9
    else if (normalized.startsWith('CLOUD9')) {
      inferredService = 'Cloud9';
    }
    // Elastic Load Balancing
    else if (normalized === 'ELASTICLOADBALANCING' || normalized.startsWith('ELASTICLOADBALANCING')) {
      inferredService = 'ALB/NLB';
    }
    // Elastic Container Registry
    else if (normalized === 'ELASTICCONTAINERREGISTRY' || normalized.startsWith('ELASTICCONTAINERREGISTRY')) {
      inferredService = 'ECR';
    }
    // Elasticsearch
    else if (normalized === 'ELASTICSEARCH' || normalized.startsWith('ELASTICSEARCH')) {
      inferredService = 'OpenSearch';
    }
    // ElastiCache
    else if (normalized === 'ELASTICACHE' || normalized.startsWith('ELASTICACHE')) {
      inferredService = 'ElastiCache (Redis)';
    }
    // Elastic Beanstalk
    else if (normalized === 'ELASTICBEANSTALK' || normalized.startsWith('ELASTICBEANSTALK')) {
      inferredService = 'Elastic Beanstalk';
    }
    // Savings Plans (pricing models)
    else if (normalized.includes('SAVINGSPLANS') || normalized.includes('SAVINGSPLAN')) {
      if (normalized.includes('COMPUTE') || normalized.includes('EC2')) {
        inferredService = 'EC2';
      } else if (normalized.includes('SAGEMAKER')) {
        inferredService = 'SageMaker';
      } else if (normalized.includes('LAMBDA')) {
        inferredService = 'Lambda';
      } else {
        // Generic Savings Plans - try to infer from context
        inferredService = 'EC2'; // Default to EC2 as most common
      }
    }
    // Reserved Instances (pricing models)
    else if (normalized.includes('RESERVEDINSTANCE') || normalized.includes('RESERVED-INSTANCE')) {
      if (normalized.includes('EC2')) {
        inferredService = 'EC2';
      } else if (normalized.includes('RDS')) {
        inferredService = 'RDS';
      } else if (normalized.includes('REDSHIFT')) {
        inferredService = 'Redshift';
      } else if (normalized.includes('ELASTICACHE')) {
        inferredService = 'ElastiCache (Redis)';
      } else {
        inferredService = 'EC2'; // Default to EC2
      }
    }
  }
  
  // If we inferred a service, add it to the mapping cache and return it
  if (inferredService) {
    // Cache it for future lookups
    awsProductCodeToService[normalized] = inferredService;
    return inferredService;
  }
  
  // Pattern: AWS Marketplace product codes (long alphanumeric strings, typically 26+ characters)
  // These are third-party products sold through AWS Marketplace
  // Pattern: Mix of uppercase letters and numbers, typically 20-30 characters
  if (!inferredService && /^[A-Z0-9]{20,}$/.test(normalized) && normalized.length >= 20) {
    // This looks like an AWS Marketplace product code
    inferredService = 'AWS Marketplace';
    // Cache it
    awsProductCodeToService[normalized] = inferredService;
    return inferredService;
  }
  
  // Last resort: Return original if no mapping found (will be handled by service mapping)
  // Don't log warning for every unknown - too noisy with thousands of codes
  // Only log once per unique code
  // Skip warnings for marketplace codes (they're handled above)
  if (!normalizeAwsProductCode._warnedCodes) {
    normalizeAwsProductCode._warnedCodes = new Set();
  }
  
  // Only warn if it's not a marketplace code pattern
  const isMarketplaceCode = /^[A-Z0-9]{20,}$/.test(normalized) && normalized.length >= 20;
  
  if (!isMarketplaceCode && !normalizeAwsProductCode._warnedCodes.has(normalized)) {
    normalizeAwsProductCode._warnedCodes.add(normalized);
    console.warn(`No mapping found for AWS product code: ${productCode}, using original`);
  }
  
  return productCode;
}

/**
 * Get service type based on AWS service name
 * @param {string} serviceName - Normalized service name
 * @returns {string} Service type (vm, database, storage, application, container, function)
 */
export function getAwsServiceType(serviceName) {
  const serviceTypeMap = {
    // Compute
    'EC2': 'vm',
    'Lightsail': 'vm',
    'Outposts': 'vm',
    'WorkSpaces': 'vm',
    'WorkSpaces Web': 'vm',
    'AppStream': 'vm',
    'Nimble Studio': 'vm',
    'GameLift': 'vm',
    'RoboMaker': 'vm',
    
  // Containers
  'ECS': 'container',
  'EKS': 'container',
  'Fargate': 'container',
  'ECR': 'container', // Elastic Container Registry
    
    // Functions
    'Lambda': 'function',
    
    // Storage
    'S3': 'storage',
    'EBS': 'storage',
    'EFS': 'storage',
    'Glacier': 'storage',
    'Storage Gateway': 'storage',
    'FSx': 'storage',
    'FSx for Lustre': 'storage',
    'FSx for Windows File Server': 'storage',
    'FSx for NetApp ONTAP': 'storage',
    'FSx for OpenZFS': 'storage',
    'AWS Backup': 'storage',
    
    // Databases
    'RDS': 'database',
    'RDS (MySQL)': 'database',
    'RDS (PostgreSQL)': 'database',
    'RDS (SQL Server)': 'database',
    'RDS (Oracle)': 'database',
    'Aurora': 'database',
    'DynamoDB': 'database',
    'ElastiCache (Redis)': 'database',
    'ElastiCache (Memcached)': 'database',
    'Redshift': 'database',
    'Neptune': 'database',
    'DocumentDB': 'database',
    'Timestream': 'database',
    'QLDB': 'database',
    'Keyspaces': 'database',
    'OpenSearch': 'database',
    
    // AWS Marketplace
    'AWS Marketplace': 'application',
    
    // Default to application for everything else
  };
  
  return serviceTypeMap[serviceName] || 'application';
}

export default {
  normalizeAwsProductCode,
  getAwsServiceType,
  awsProductCodeToService
};
