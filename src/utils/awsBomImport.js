/**
 * AWS Bill of Materials (BOM) Import Utility
 * 
 * Parses AWS Cost and Usage Reports (CUR) or AWS billing CSV exports
 * Converts AWS resources to workloads for migration analysis
 */

import { normalizeAwsProductCode, getAwsServiceType } from './awsProductCodeMapping.js';

/**
 * Parse AWS Cost and Usage Report (CUR) CSV
 * Supports standard AWS CUR format with columns like:
 * - LineItem/UsageAccountId
 * - LineItem/ProductCode (EC2, S3, RDS, etc.)
 * - LineItem/UsageType
 * - LineItem/ResourceId
 * - LineItem/UnblendedCost
 * - Product/instanceType
 * - Product/operatingSystem
 * - Product/location (region)
 */
export const parseAwsCur = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('AWS CUR file must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const workloads = [];
  const workloadMap = new Map(); // Group by resource ID
  let totalRawCost = 0; // Track sum of ALL raw costs from ALL rows (before aggregation)

  // Find column indices
  const getColumnIndex = (patterns) => {
    for (const pattern of patterns) {
      const index = headers.findIndex(h => 
        h.toLowerCase().includes(pattern.toLowerCase())
      );
      if (index !== -1) return index;
    }
    return -1;
  };

  const productCodeIdx = getColumnIndex(['productcode', 'product_code', 'service']);
  const resourceIdIdx = getColumnIndex(['resourceid', 'resource_id', 'resource']);
  const usageTypeIdx = getColumnIndex(['usagetype', 'usage_type']);
  const costIdx = getColumnIndex(['unblendedcost', 'cost', 'blendedcost']);
  const instanceTypeIdx = getColumnIndex(['instancetype', 'instance_type']);
  const osIdx = getColumnIndex(['operatingsystem', 'os', 'operating_system']);
  const regionIdx = getColumnIndex(['location', 'region', 'availabilityzone']);
  const usageAmountIdx = getColumnIndex(['usageamount', 'usage_amount', 'quantity']);
  const usageStartDateIdx = getColumnIndex(['usagestartdate', 'usage_start_date', 'billingperiodstartdate']);
  const usageEndDateIdx = getColumnIndex(['usageenddate', 'usage_end_date', 'billingperiodenddate']);

  if (productCodeIdx === -1) {
    throw new Error('Could not find ProductCode/Service column in AWS CUR');
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const productCode = values[productCodeIdx]?.toUpperCase().trim();
    
    // CRITICAL FIX: Validate product code - skip if it looks like a date or is invalid
    // Dates in ISO format (e.g., "2025-09-22T09:00:00Z") should not be treated as product codes
    if (!productCode || productCode.length === 0) {
      continue;
    }
    
    // Skip if productCode looks like a date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
    if (/^\d{4}-\d{2}-\d{2}/.test(productCode)) {
      continue;
    }
    
    const rawResourceId = values[resourceIdIdx]?.trim();
    const cost = parseFloat(values[costIdx] || '0');
    const instanceType = values[instanceTypeIdx] || '';
    const os = values[osIdx]?.toLowerCase() || 'linux';
    const rawRegion = values[regionIdx]?.trim();
    const region = rawRegion ? rawRegion.split('-').slice(0, 2).join('-') : 'us-east-1';
    const usageType = values[usageTypeIdx] || '';
    const usageStartDate = usageStartDateIdx !== -1 ? values[usageStartDateIdx] : null;
    const usageEndDate = usageEndDateIdx !== -1 ? values[usageEndDateIdx] : null;

    // Track raw cost from EVERY row (before any filtering or aggregation)
    if (!isNaN(cost) && cost > 0) {
      totalRawCost += cost;
    }

    // Skip if not a billable service
    if (productCode === 'TAX' || cost === 0) continue;
    
    // For rows without ResourceId, create a composite key from productCode + usageType + region
    // This groups similar charges together instead of creating unique workloads for each row
    const resourceId = rawResourceId && rawResourceId.length > 0 
      ? rawResourceId 
      : `${productCode}_${usageType}_${region}_no-resource-id`.toLowerCase();

    // CRITICAL FIX: Use comprehensive AWS product code mapping
    // Normalize AWS product code to standard service name
    const normalizedService = normalizeAwsProductCode(productCode);
    
    // Skip if this is a tax or null service
    if (!normalizedService || normalizedService === 'TAX') {
      continue;
    }
    
    // Get service type based on normalized service name
    const serviceType = getAwsServiceType(normalizedService);
    
    // Create mapping object
    const mapping = {
      type: serviceType,
      service: normalizedService
    };

    // Extract instance specs from instance type (e.g., m5.large -> 2 vCPU, 8GB RAM)
    const instanceSpecs = parseInstanceType(instanceType);

    // Create deduplication key: resource ID + service + region
    // This ensures same resource across different dates is treated as one workload
    const dedupeKey = `${resourceId}_${mapping.service}_${region}`.toLowerCase();
    
    // Group by deduplication key to aggregate costs across different dates
    if (!workloadMap.has(dedupeKey)) {
      workloadMap.set(dedupeKey, {
        id: resourceId, // Use original resource ID as the workload ID
        name: resourceId.split('/').pop() || resourceId,
        service: mapping.service,
        type: mapping.type,
        os: os === 'windows' ? 'windows' : 'linux',
        cpu: instanceSpecs.cpu,
        memory: instanceSpecs.memory,
        storage: 0,
        monthlyCost: 0,
        region: region,
        monthlyTraffic: 0,
        dependencies: [],
        awsInstanceType: instanceType,
        awsProductCode: productCode,
        // Track date range for reference
        dateRange: usageStartDate && usageEndDate 
          ? { start: usageStartDate, end: usageEndDate }
          : null,
        // Track all dates seen for this workload
        seenDates: usageStartDate ? [usageStartDate] : [],
      });
    }

    // Aggregate costs across different dates
    // Note: This sums costs for the same resource across different dates
    // For daily CUR files, this gives monthly total. For monthly files, this aggregates them.
    const workload = workloadMap.get(dedupeKey);
    workload.monthlyCost += cost;
    
    // Track date range (expand if needed)
    if (usageStartDate) {
      if (!workload.seenDates.includes(usageStartDate)) {
        workload.seenDates.push(usageStartDate);
      }
      if (usageStartDate && usageEndDate) {
        if (!workload.dateRange) {
          workload.dateRange = { start: usageStartDate, end: usageEndDate };
        } else {
          // Expand date range if this date is outside current range
          if (usageStartDate < workload.dateRange.start) {
            workload.dateRange.start = usageStartDate;
          }
          if (usageEndDate > workload.dateRange.end) {
            workload.dateRange.end = usageEndDate;
          }
        }
      }
    }
    
    // Update storage if it's a storage service
    if (mapping.type === 'storage' && usageAmountIdx !== -1) {
      const usageAmount = parseFloat(values[usageAmountIdx] || '0');
      if (usageType.includes('GB')) {
        workload.storage += usageAmount;
      }
    }
  }

  return Array.from(workloadMap.values());
};

/**
 * Parse instance type to extract CPU and memory
 * @param {string} instanceType - AWS instance type (e.g., m5.large, t3.medium)
 */
function parseInstanceType(instanceType) {
  if (!instanceType) return { cpu: 0, memory: 0 };

  // AWS instance type specifications (simplified)
  const instanceSpecs = {
    't2.nano': { cpu: 1, memory: 0.5 },
    't2.micro': { cpu: 1, memory: 1 },
    't2.small': { cpu: 1, memory: 2 },
    't2.medium': { cpu: 2, memory: 4 },
    't2.large': { cpu: 2, memory: 8 },
    't2.xlarge': { cpu: 4, memory: 16 },
    't2.2xlarge': { cpu: 8, memory: 32 },
    't3.nano': { cpu: 2, memory: 0.5 },
    't3.micro': { cpu: 2, memory: 1 },
    't3.small': { cpu: 2, memory: 2 },
    't3.medium': { cpu: 2, memory: 4 },
    't3.large': { cpu: 2, memory: 8 },
    't3.xlarge': { cpu: 4, memory: 16 },
    't3.2xlarge': { cpu: 8, memory: 32 },
    'm5.large': { cpu: 2, memory: 8 },
    'm5.xlarge': { cpu: 4, memory: 16 },
    'm5.2xlarge': { cpu: 8, memory: 32 },
    'm5.4xlarge': { cpu: 16, memory: 64 },
    'm5.8xlarge': { cpu: 32, memory: 128 },
    'm5.12xlarge': { cpu: 48, memory: 192 },
    'm5.16xlarge': { cpu: 64, memory: 256 },
    'm5.24xlarge': { cpu: 96, memory: 384 },
    'c5.large': { cpu: 2, memory: 4 },
    'c5.xlarge': { cpu: 4, memory: 8 },
    'c5.2xlarge': { cpu: 8, memory: 16 },
    'c5.4xlarge': { cpu: 16, memory: 32 },
    'c5.9xlarge': { cpu: 36, memory: 72 },
    'c5.12xlarge': { cpu: 48, memory: 96 },
    'c5.18xlarge': { cpu: 72, memory: 144 },
    'c5.24xlarge': { cpu: 96, memory: 192 },
    'r5.large': { cpu: 2, memory: 16 },
    'r5.xlarge': { cpu: 4, memory: 32 },
    'r5.2xlarge': { cpu: 8, memory: 64 },
    'r5.4xlarge': { cpu: 16, memory: 128 },
    'r5.8xlarge': { cpu: 32, memory: 256 },
    'r5.12xlarge': { cpu: 48, memory: 384 },
    'r5.16xlarge': { cpu: 64, memory: 512 },
    'r5.24xlarge': { cpu: 96, memory: 768 },
  };

  const normalizedType = instanceType.toLowerCase();
  if (instanceSpecs[normalizedType]) {
    return instanceSpecs[normalizedType];
  }

  // Try to infer from naming pattern
  const match = normalizedType.match(/(\w+)\.(\w+)/);
  if (match) {
    const [, family, size] = match;
    const sizeMultipliers = {
      'nano': 0.25,
      'micro': 0.5,
      'small': 1,
      'medium': 2,
      'large': 4,
      'xlarge': 8,
      '2xlarge': 16,
      '4xlarge': 32,
      '8xlarge': 64,
      '12xlarge': 96,
      '16xlarge': 128,
      '24xlarge': 192,
    };

    const multiplier = sizeMultipliers[size] || 1;
    const baseCpu = family === 'c' ? 2 : family === 'm' ? 2 : family === 'r' ? 2 : 1;
    const baseMemory = family === 'c' ? 2 : family === 'm' ? 8 : family === 'r' ? 16 : 4;

    return {
      cpu: Math.round(baseCpu * multiplier),
      memory: Math.round(baseMemory * multiplier),
    };
  }

  return { cpu: 0, memory: 0 };
}

/**
 * Parse simplified AWS bill CSV
 * Format: Service, Resource ID, Instance Type, Region, Monthly Cost
 */
export const parseAwsBillSimple = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('AWS bill file must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const workloads = [];

  const serviceIdx = headers.indexOf('service');
  const resourceIdIdx = headers.findIndex(h => h.includes('resource') || h.includes('id'));
  const instanceTypeIdx = headers.findIndex(h => h.includes('instance') || h.includes('type'));
  const regionIdx = headers.findIndex(h => h.includes('region') || h.includes('location'));
  const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('price'));

  if (serviceIdx === -1) {
    throw new Error('CSV must include a "service" column');
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const service = values[serviceIdx];
    const resourceId = values[resourceIdIdx] || `resource-${i}`;
    const instanceType = values[instanceTypeIdx] || '';
    const region = values[regionIdx] || 'us-east-1';
    const cost = parseFloat(values[costIdx] || '0');

    if (!service || cost === 0) continue;

    const instanceSpecs = parseInstanceType(instanceType);
    const serviceMapping = {
      'EC2': { type: 'vm', service: 'EC2' },
      'RDS': { type: 'database', service: 'RDS' },
      'S3': { type: 'storage', service: 'S3' },
      'EBS': { type: 'storage', service: 'EBS' },
      'LAMBDA': { type: 'function', service: 'Lambda' },
      'ECS': { type: 'container', service: 'ECS' },
      'EKS': { type: 'container', service: 'EKS' },
    };

    const mapping = serviceMapping[service.toUpperCase()] || { type: 'vm', service };

    workloads.push({
      id: resourceId,
      name: resourceId.split('/').pop() || resourceId,
      service: mapping.service,
      type: mapping.type,
      os: 'linux',
      cpu: instanceSpecs.cpu,
      memory: instanceSpecs.memory,
      storage: 0,
      monthlyCost: cost,
      region: region,
      monthlyTraffic: 0,
      dependencies: [],
      awsInstanceType: instanceType,
      awsProductCode: service,
    });
  }

  return workloads;
};

/**
 * Generate AWS BOM import template
 */
export const generateAwsBomTemplate = () => {
  const headers = ['Service', 'Resource ID', 'Instance Type', 'Region', 'Monthly Cost ($)'];
  const examples = [
    ['EC2', 'i-1234567890abcdef0', 'm5.large', 'us-east-1', '73.00'],
    ['EC2', 'i-0987654321fedcba0', 't3.medium', 'us-west-2', '30.00'],
    ['RDS', 'database-1', 'db.t3.medium', 'us-east-1', '150.00'],
    ['S3', 'my-bucket', 'Standard', 'us-east-1', '25.00'],
    ['EBS', 'vol-1234567890abcdef0', 'gp3', 'us-east-1', '10.00'],
  ];

  const csv = [
    headers.join(','),
    ...examples.map(row => row.join(',')),
  ].join('\n');

  return csv;
};

/**
 * Download AWS BOM template
 */
export const downloadAwsBomTemplate = () => {
  const csv = generateAwsBomTemplate();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'aws-bom-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
