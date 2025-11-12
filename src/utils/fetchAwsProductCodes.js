/**
 * Fetch comprehensive AWS product codes from Gemini
 * This script queries Gemini AI to get a complete list of AWS service product codes
 */

import { createGeminiClient } from './geminiIntegration.js';

/**
 * Get comprehensive list of AWS product codes from Gemini
 */
export async function fetchAwsProductCodesFromGemini() {
  const geminiClient = createGeminiClient();
  
  const prompt = `Please provide a comprehensive list of ALL AWS service product codes used in AWS Cost and Usage Reports (CUR).

AWS product codes are typically in formats like:
- AmazonEC2
- AmazonS3
- AWSELB
- AmazonECR
- AmazonStates
- AmazonES
- etc.

Please provide a complete JSON object mapping product codes to their service names, including:
1. All compute services (EC2, Lambda, ECS, EKS, Fargate, Batch, Lightsail, etc.)
2. All storage services (S3, EBS, EFS, Glacier, FSx variants, etc.)
3. All database services (RDS variants, DynamoDB, ElastiCache variants, Redshift, Neptune, DocumentDB, etc.)
4. All networking services (VPC, CloudFront, Route53, API Gateway, ELB variants, Direct Connect, VPN, Transit Gateway, etc.)
5. All security services (IAM, KMS, Secrets Manager, WAF, Shield, GuardDuty, Inspector, Macie, etc.)
6. All analytics services (EMR, Kinesis variants, Athena, Glue, QuickSight, OpenSearch/Elasticsearch, etc.)
7. All application integration services (SQS, SNS, EventBridge, Step Functions, AppSync, MQ, Connect, Chime, etc.)
8. All monitoring services (CloudWatch, CloudWatch Logs, X-Ray, CloudTrail, Systems Manager, Config, etc.)
9. All ML/AI services (SageMaker, Rekognition, Comprehend, Translate, Polly, Lex, Textract, Bedrock, etc.)
10. All developer tools (CodeBuild, CodeDeploy, CodePipeline, CodeArtifact, CodeCommit, Cloud9, etc.)
11. All management services (CloudFormation, Service Catalog, Trusted Advisor, Cost Explorer, Organizations, Control Tower, etc.)
12. All media services (Elemental MediaConvert, MediaLive, MediaPackage, MediaStore, MediaTailor, IVS, etc.)
13. All IoT services (IoT Core, IoT Analytics, IoT Device Defender, IoT Events, IoT Greengrass, IoT SiteWise, etc.)
14. All other services (WorkSpaces, WorkDocs, WorkMail, SES, etc.)

Format the response as a JSON object where:
- Keys are product codes (uppercase, e.g., "AMAZONEC2", "AWSELB", "AMAZONECR")
- Values are the standardized service names (e.g., "EC2", "ALB/NLB", "ECR")

Include ALL variations and alternative product codes. Be comprehensive and include every AWS service product code you know of.`;

  try {
    const response = await geminiClient.generateContent(prompt, {
      temperature: 0.3, // Lower temperature for more factual responses
      maxTokens: 8000 // Allow longer responses
    });
    
    // Parse the JSON response
    // Gemini might wrap JSON in markdown code blocks
    let jsonText = response.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    const productCodes = JSON.parse(jsonText);
    return productCodes;
  } catch (error) {
    console.error('Error fetching AWS product codes from Gemini:', error);
    throw error;
  }
}

/**
 * Merge Gemini results with existing mapping
 */
export function mergeProductCodeMappings(existingMapping, geminiMapping) {
  const merged = { ...existingMapping };
  
  // Add all Gemini mappings, preferring existing ones if there's a conflict
  for (const [code, service] of Object.entries(geminiMapping)) {
    const upperCode = code.toUpperCase();
    if (!merged[upperCode]) {
      merged[upperCode] = service;
    }
  }
  
  return merged;
}

export default {
  fetchAwsProductCodesFromGemini,
  mergeProductCodeMappings
};
