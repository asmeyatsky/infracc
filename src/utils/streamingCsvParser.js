/**
 * Streaming CSV Parser
 * 
 * Processes large CSV files line-by-line without loading entire file into memory
 * Supports AWS CUR format and handles files larger than JavaScript string limits
 */

/**
 * Parse AWS CUR CSV in streaming fashion
 * Processes file in chunks and parses line-by-line
 */
export const parseAwsCurStreaming = async (fileOrBuffer, onProgress) => {
  return new Promise((resolve, reject) => {
    const workloads = [];
    const workloadMap = new Map(); // Group by resource ID
    let totalRawCost = 0; // Track sum of ALL raw costs from ALL rows (before aggregation)
    
    let headers = null;
    let headerIndices = null;
    let buffer = '';
    let lineNumber = 0;
    let bytesProcessed = 0;
    const totalBytes = fileOrBuffer.size || fileOrBuffer.byteLength || 0;
    
    // Column index finder
    const getColumnIndex = (patterns, headers) => {
      for (const pattern of patterns) {
        const index = headers.findIndex(h => 
          h.toLowerCase().includes(pattern.toLowerCase())
        );
        if (index !== -1) return index;
      }
      return -1;
    };
    
    // Process a line of CSV
    const processLine = (line) => {
      if (!line.trim()) return;
      
      lineNumber++;
      
      // Parse header row
      if (lineNumber === 1) {
        headers = line.split(',').map(h => h.trim());
        headerIndices = {
          productCode: getColumnIndex(['productcode', 'product_code', 'service'], headers),
          resourceId: getColumnIndex(['resourceid', 'resource_id', 'resource'], headers),
          usageType: getColumnIndex(['usagetype', 'usage_type'], headers),
          cost: getColumnIndex(['unblendedcost', 'cost', 'blendedcost'], headers),
          instanceType: getColumnIndex(['instancetype', 'instance_type'], headers),
          os: getColumnIndex(['operatingsystem', 'os', 'operating_system'], headers),
          region: getColumnIndex(['location', 'region', 'availabilityzone'], headers),
          usageAmount: getColumnIndex(['usageamount', 'usage_amount', 'quantity'], headers),
          usageStartDate: getColumnIndex(['usagestartdate', 'usage_start_date', 'billingperiodstartdate'], headers),
          usageEndDate: getColumnIndex(['usageenddate', 'usage_end_date', 'billingperiodenddate'], headers),
        };
        
        if (headerIndices.productCode === -1) {
          throw new Error('Could not find ProductCode/Service column in AWS CUR');
        }
        return;
      }
      
      // Parse data row
      const values = parseCSVLine(line);
      if (values.length === 0) return;
      
      const productCode = (values[headerIndices.productCode] || '').toUpperCase();
      const rawResourceId = values[headerIndices.resourceId]?.trim();
      const cost = parseFloat(values[headerIndices.cost] || '0');
      const instanceType = values[headerIndices.instanceType] || '';
      const os = (values[headerIndices.os] || 'linux').toLowerCase();
      const rawRegion = values[headerIndices.region]?.trim();
      const region = rawRegion ? rawRegion.split('-').slice(0, 2).join('-') : 'us-east-1';
      const usageType = values[headerIndices.usageType] || '';
      const usageStartDate = headerIndices.usageStartDate !== -1 ? values[headerIndices.usageStartDate] : null;
      const usageEndDate = headerIndices.usageEndDate !== -1 ? values[headerIndices.usageEndDate] : null;

      // Track raw cost from EVERY row (before any filtering or aggregation)
      if (!isNaN(cost) && cost > 0) {
        totalRawCost += cost;
      }

      // Skip if not a billable service
      if (!productCode || productCode === 'TAX' || cost === 0) return;
      
      // For rows without ResourceId, create a composite key from productCode + usageType + region
      // This groups similar charges together instead of creating unique workloads for each row
      const resourceId = rawResourceId && rawResourceId.length > 0 
        ? rawResourceId 
        : `${productCode}_${usageType}_${region}_no-resource-id`.toLowerCase();
      
      // Map AWS service to workload type
      const serviceMapping = {
        'EC2': { type: 'vm', service: 'EC2' },
        'EC2-INSTANCE': { type: 'vm', service: 'EC2' },
        'RDS': { type: 'database', service: 'RDS' },
        'S3': { type: 'storage', service: 'S3' },
        'S3-STORAGE': { type: 'storage', service: 'S3' },
        'EBS': { type: 'storage', service: 'EBS' },
        'LAMBDA': { type: 'function', service: 'Lambda' },
        'ECS': { type: 'container', service: 'ECS' },
        'EKS': { type: 'container', service: 'EKS' },
        'ELASTICACHE': { type: 'database', service: 'ElastiCache' },
        'DYNAMODB': { type: 'database', service: 'DynamoDB' },
        'CLOUDFRONT': { type: 'application', service: 'CloudFront' },
        'APIGATEWAY': { type: 'application', service: 'API Gateway' },
        'BEDROCK': { type: 'application', service: 'Bedrock' },
        'AWSBACKUP': { type: 'storage', service: 'AWS Backup' },
        'OCBLATEFEE': { type: 'application', service: 'AWS Service Fee' },
        'TAX': null, // Skip taxes
      };
      
      const mapping = serviceMapping[productCode];
      if (!mapping) {
        // Unknown service - skip to avoid creating too many workloads
        return;
      }
      
      // Extract instance specs
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
      if (mapping.type === 'storage' && headerIndices.usageAmount !== -1) {
        const usageAmount = parseFloat(values[headerIndices.usageAmount] || '0');
        if (usageType.includes('GB')) {
          workload.storage += usageAmount;
        }
      }
    };
    
    // Parse CSV line handling quoted values
    const parseCSVLine = (line) => {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i++;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add last field
      values.push(current.trim());
      return values;
    };
    
    // Parse instance type to extract CPU and memory
    const parseInstanceType = (instanceType) => {
      if (!instanceType) return { cpu: 0, memory: 0 };
      
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
    };
    
    // Process chunk of data
    const processChunk = (chunk) => {
      buffer += chunk;
      
      // Process complete lines
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.substring(0, newlineIndex);
        buffer = buffer.substring(newlineIndex + 1);
        
        try {
          processLine(line);
        } catch (error) {
          console.warn(`Error processing line ${lineNumber}:`, error);
        }
      }
      
      bytesProcessed += chunk.length;
      if (onProgress && totalBytes > 0) {
        onProgress({
          bytesProcessed,
          totalBytes,
          percent: Math.round((bytesProcessed / totalBytes) * 100),
          linesProcessed: lineNumber
        });
      }
    };
    
    // Handle File object
    if (fileOrBuffer instanceof File || fileOrBuffer instanceof Blob) {
      const reader = fileOrBuffer.stream().getReader();
      const decoder = new TextDecoder('utf-8');
      
      const readChunk = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Process remaining buffer
              if (buffer.trim()) {
                processLine(buffer);
              }
              
              const result = Array.from(workloadMap.values());
              const totalAggregatedCost = result.reduce((sum, workload) => sum + workload.monthlyCost, 0);
              
              // Attach metadata with raw total cost (sum of ALL rows before aggregation)
              result._metadata = {
                totalRawCost: totalRawCost,
                totalAggregatedCost: totalAggregatedCost,
                totalRows: lineNumber - 1, // Exclude header
                uniqueWorkloads: result.length
              };
              
              resolve(result);
              return;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            processChunk(chunk);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      readChunk();
    } else {
      // Handle ArrayBuffer
      const decoder = new TextDecoder('utf-8');
      const chunkSize = 10 * 1024 * 1024; // 10MB chunks
      
      for (let i = 0; i < fileOrBuffer.byteLength; i += chunkSize) {
        const chunk = fileOrBuffer.slice(i, Math.min(i + chunkSize, fileOrBuffer.byteLength));
        const textChunk = decoder.decode(chunk, { stream: i + chunkSize < fileOrBuffer.byteLength });
        processChunk(textChunk);
      }
      
      // Process remaining buffer
      if (buffer.trim()) {
        processLine(buffer);
      }
      
      const result = Array.from(workloadMap.values());
      const totalAggregatedCost = result.reduce((sum, workload) => sum + workload.monthlyCost, 0);
      
      // Attach metadata with raw total cost (sum of ALL rows before aggregation)
      result._metadata = {
        totalRawCost: totalRawCost,
        totalAggregatedCost: totalAggregatedCost,
        totalRows: lineNumber - 1, // Exclude header
        uniqueWorkloads: result.length
      };
      
      resolve(result);
    }
  });
};
