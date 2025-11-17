/**
 * Streaming CSV Parser
 * 
 * Processes large CSV files line-by-line without loading entire file into memory
 * Supports AWS CUR format and handles files larger than JavaScript string limits
 */

// Import comprehensive AWS product code mapping
import { normalizeAwsProductCode, getAwsServiceType } from './awsProductCodeMapping.js';

/**
 * Parse AWS CUR CSV in streaming fashion
 * Processes file in chunks and parses line-by-line
 */
export const parseAwsCurStreaming = async (fileOrBuffer, onProgress) => {
  return new Promise((resolve, reject) => {
    const workloads = [];
    const workloadMap = new Map(); // Group by resource ID
    let totalRawCost = 0; // Track sum of ALL raw costs from ALL rows (before aggregation)
    let skippedRows = { noProductCode: 0, tax: 0, zeroCost: 0, unknownService: 0 };
    let processedRows = 0;
    
    let headers = null;
    let headerIndices = null;
    let buffer = '';
    let lineNumber = 0;
    let bytesProcessed = 0;
    const totalBytes = fileOrBuffer.size || fileOrBuffer.byteLength || 0;
    
    // CRITICAL FIX: Queue for processing lines in batches to prevent stack overflow
    // Increased batch size for better performance - 1000 lines is safe and reduces overhead significantly
    const MAX_LINES_PER_BATCH = 1000; // Process max 1000 lines before yielding (safe for stack, much faster)
    const pendingLines = []; // Queue of lines to process (shared across chunks)
    
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
        // SAFETY: Use parseCSVLine for headers too (handles quoted headers)
        headers = parseCSVLine(line);
        
        // SAFETY: Validate headers
        if (!headers || headers.length === 0) {
          throw new Error('CSV file has no headers or headers could not be parsed');
        }
        
        // SAFETY: Limit header count
        if (headers.length > 1000) {
          console.warn(`[streamingCsvParser] Too many headers (${headers.length}), limiting to 1000`);
          headers = headers.slice(0, 1000);
        }
        
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
      
      const productCode = (values[headerIndices.productCode] || '').toUpperCase().trim();
      
      // CRITICAL FIX: Validate product code - skip if it looks like a date or is invalid
      // Dates in ISO format (e.g., "2025-09-22T09:00:00Z") should not be treated as product codes
      if (!productCode || productCode.length === 0) {
        skippedRows.noProductCode++;
        return;
      }
      
      // Skip if productCode looks like a date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
      if (/^\d{4}-\d{2}-\d{2}/.test(productCode)) {
        skippedRows.noProductCode++;
        return;
      }
      
      const rawResourceId = values[headerIndices.resourceId]?.trim();
      const cost = parseFloat(values[headerIndices.cost] || '0');
      const roundedCost = Math.round(cost * 100) / 100;
      
      // Extract other fields from CSV
      const usageType = values[headerIndices.usageType] || '';
      const instanceType = values[headerIndices.instanceType] || '';
      const os = (values[headerIndices.os] || '').toLowerCase();
      const rawRegion = values[headerIndices.region] || '';
      // CRITICAL FIX: Preserve full region name (e.g., us-east-1, us-west-2) instead of truncating
      // Only normalize if region is truly missing, otherwise use the full region name
      const region = rawRegion && rawRegion.trim() ? rawRegion.trim() : 'us-east-1';
      const usageStartDate = values[headerIndices.usageStartDate] || null;
      const usageEndDate = values[headerIndices.usageEndDate] || null;

      // Track raw cost from EVERY row (before any filtering or aggregation)
      // CRITICAL FIX: Include ALL costs (positive and negative) to get accurate total
      // Negative costs represent credits/refunds and should be subtracted
      if (!isNaN(roundedCost)) {
        totalRawCost += roundedCost; // Include both positive and negative costs
      }

      // Track skipped rows for debugging
      if (!productCode) {
        skippedRows.noProductCode++;
        if (lineNumber % 100000 === 0) {
          console.warn(`Skipped ${skippedRows.noProductCode} rows with no productCode so far (row ${lineNumber})`);
        }
        return;
      }
      
      if (productCode === 'TAX') {
        skippedRows.tax++;
        return;
      }
      
      // CRITICAL FIX: Don't skip zero-cost rows - they still represent workloads
      // Include zero-cost rows - they still represent workloads that should be tracked
      // (e.g., free tier usage, stopped instances, etc.)
      if (roundedCost === 0) {
        skippedRows.zeroCost++;
      }
      
      processedRows++;
      
      // For rows without ResourceId, create a composite key from productCode + region only
      // This aggregates all usage types (storage, requests, data transfer) into one workload per service per region
      // This makes more sense for migration planning - one S3 workload per region, not one per usage type
      const resourceId = rawResourceId && rawResourceId.length > 0 
        ? rawResourceId 
        : `${productCode}_${region}_aggregated`.toLowerCase();
      
      // CRITICAL FIX: Use comprehensive AWS product code mapping
      // Normalize AWS product code to standard service name
      const normalizedService = normalizeAwsProductCode(productCode);
      
      // Skip if this is a tax or null service
      if (!normalizedService || normalizedService === 'TAX') {
        return;
      }
      
      // Get service type based on normalized service name
      const serviceType = getAwsServiceType(normalizedService);
      
      // Create mapping object
      const mapping = {
        type: serviceType,
        service: normalizedService
      };
      
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
      // CRITICAL FIX: Ensure we're adding costs correctly (handle negative costs from credits)
      workload.monthlyCost = (workload.monthlyCost || 0) + roundedCost;
      
      // Track date range (expand if needed)
      // SAFETY: Limit seenDates array size to prevent memory issues
      if (usageStartDate) {
        if (!workload.seenDates.includes(usageStartDate)) {
          // Limit to 1000 dates to prevent unbounded growth
          if (workload.seenDates.length < 1000) {
            workload.seenDates.push(usageStartDate);
          }
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
      
      // SAFETY: Check workloadMap size to prevent memory issues
      if (workloadMap.size > 2000000) { // 2M limit
        console.warn(`[streamingCsvParser] workloadMap size (${workloadMap.size}) exceeds limit, stopping processing`);
        throw new Error(`Too many unique workloads (${workloadMap.size}). File may be corrupted or too large.`);
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
    // SAFETY: Add guards for malformed CSV data
    const parseCSVLine = (line) => {
      try {
        // SAFETY: Limit line length to prevent memory issues
        const MAX_LINE_LENGTH = 10000000; // 10MB max per line
        if (line.length > MAX_LINE_LENGTH) {
          console.warn(`[parseCSVLine] Line too long (${line.length} chars), truncating to ${MAX_LINE_LENGTH}`);
          line = line.substring(0, MAX_LINE_LENGTH);
        }
        
        const values = [];
        let current = '';
        let inQuotes = false;
        let quoteCount = 0; // Track quote count to detect malformed data
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            quoteCount++;
            // SAFETY: Prevent infinite quote parsing
            if (quoteCount > 100000) {
              console.warn('[parseCSVLine] Too many quotes detected, line may be malformed');
              break;
            }
            
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
        
        // SAFETY: If still in quotes, close it (malformed CSV)
        if (inQuotes) {
          console.warn('[parseCSVLine] Unclosed quotes detected, closing quote');
        }
        
        // Add last field
        values.push(current.trim());
        
        // SAFETY: Limit number of fields to prevent memory issues
        const MAX_FIELDS = 10000;
        if (values.length > MAX_FIELDS) {
          console.warn(`[parseCSVLine] Too many fields (${values.length}), limiting to ${MAX_FIELDS}`);
          return values.slice(0, MAX_FIELDS);
        }
        
        return values;
      } catch (parseError) {
        console.error('[parseCSVLine] Error parsing CSV line:', parseError);
        // Return empty array on error to prevent crash
        return [];
      }
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
    // CRITICAL FIX: Process lines in very small batches to prevent stack overflow
    const processChunk = async (chunk) => {
      buffer += chunk;
      
      // CRITICAL FIX: Process only MAX_LINES_PER_BATCH lines per call to prevent stack overflow
      // Leave remaining lines in buffer for next call - this prevents synchronous processing of 100k+ lines
      let linesProcessedInBatch = 0;
      let newlineIndex;
      
      // Process only up to MAX_LINES_PER_BATCH lines, then yield
      while (linesProcessedInBatch < MAX_LINES_PER_BATCH && (newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.substring(0, newlineIndex);
        buffer = buffer.substring(newlineIndex + 1);
        
        if (line.trim()) {
          try {
            processLine(line);
            linesProcessedInBatch++;
          } catch (error) {
            console.warn(`Error processing line ${lineNumber}:`, error);
          }
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
    
    // CRITICAL FIX: Process buffer iteratively in batches to prevent stack overflow
    // This function processes all remaining lines in buffer, but in small batches with yields
    const processRemainingBuffer = async () => {
      let bufferIterations = 0;
      const MAX_BUFFER_ITERATIONS = 1000000; // Safety limit to prevent infinite loop
      
      while (buffer.indexOf('\n') !== -1) {
        // SAFETY: Prevent infinite loop
        bufferIterations++;
        if (bufferIterations > MAX_BUFFER_ITERATIONS) {
          console.error('[streamingCsvParser] Buffer processing exceeded maximum iterations. Buffer may be corrupted.');
          break; // Exit loop instead of hanging
        }
        
        let linesProcessedInBatch = 0;
        let newlineIndex;
        
        // Process up to MAX_LINES_PER_BATCH lines
        while (linesProcessedInBatch < MAX_LINES_PER_BATCH && (newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.substring(0, newlineIndex);
          buffer = buffer.substring(newlineIndex + 1);
          
          if (line.trim()) {
            try {
              processLine(line);
              linesProcessedInBatch++;
            } catch (error) {
              console.warn(`Error processing line ${lineNumber}:`, error);
            }
          }
        }
        
        // Yield after each batch
        if (buffer.indexOf('\n') !== -1) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    };
    
    // Handle File object
    if (fileOrBuffer instanceof File || fileOrBuffer instanceof Blob) {
      const reader = fileOrBuffer.stream().getReader();
      const decoder = new TextDecoder('utf-8');
      
      // CRITICAL: Add timeout to prevent infinite loop if reader hangs
      const MAX_READ_ITERATIONS = 1000000; // Safety limit
      let readIterations = 0;
      const READ_TIMEOUT_MS = 300000; // 5 minutes max for file read
      const startTime = Date.now();
      
      const readChunk = async () => {
        try {
          while (true) {
            // SAFETY: Check for infinite loop or timeout
            readIterations++;
            if (readIterations > MAX_READ_ITERATIONS) {
              reject(new Error(`File read exceeded maximum iterations (${MAX_READ_ITERATIONS}). File may be corrupted or too large.`));
              try {
                reader.cancel();
              } catch (e) {
                // Ignore cancel errors
              }
              return;
            }
            
            // SAFETY: Check for timeout
            if (Date.now() - startTime > READ_TIMEOUT_MS) {
              reject(new Error(`File read exceeded timeout (${READ_TIMEOUT_MS}ms). File may be too large or corrupted.`));
              try {
                reader.cancel();
              } catch (e) {
                // Ignore cancel errors
              }
              return;
            }
            
            let readResult;
            try {
              readResult = await reader.read();
            } catch (readError) {
              reject(new Error(`Error reading file stream: ${readError.message}`));
              return;
            }
            
            const { done, value } = readResult;
            if (done) {
              // Process all remaining buffer in batches
              await processRemainingBuffer();
              
              // Process last line if buffer has content without newline
              if (buffer.trim()) {
                processLine(buffer);
                buffer = '';
              }
              
              // SAFETY: Safe array conversion with error handling
              let result = [];
              try {
                result = Array.from(workloadMap.values());
              } catch (arrayError) {
                console.error('[streamingCsvParser] Error converting workloadMap to array:', arrayError);
                // Fallback: manual conversion
                result = [];
                for (const workload of workloadMap.values()) {
                  result.push(workload);
                  // Safety limit
                  if (result.length > 1000000) {
                    console.warn('[streamingCsvParser] Too many workloads, limiting to 1M');
                    break;
                  }
                }
              }
              
              // Validate that we have data rows (not just header)
              const totalRowsRead = lineNumber - 1; // Exclude header
              if (!headers || totalRowsRead === 0) {
                reject(new Error('CSV file contains no data rows'));
                return;
              }
              
              // SAFETY: Safe reduce with error handling
              let totalAggregatedCost = 0;
              try {
                if (result.length > 0) {
                  totalAggregatedCost = result.reduce((sum, workload) => {
                    try {
                      return sum + (workload?.monthlyCost || 0);
                    } catch (e) {
                      return sum; // Skip invalid workloads
                    }
                  }, 0);
                }
              } catch (reduceError) {
                console.warn('[streamingCsvParser] Error calculating totalAggregatedCost:', reduceError);
                // Continue with 0 if reduce fails
              }
              
              // CRITICAL DEBUG: Log row processing statistics
              console.log(`\n=== CSV PARSING SUMMARY ===`);
              console.log(`Total rows read: ${totalRowsRead.toLocaleString()}`);
              console.log(`Rows processed: ${processedRows.toLocaleString()}`);
              console.log(`Rows skipped - no productCode: ${skippedRows.noProductCode.toLocaleString()}`);
              console.log(`Rows skipped - TAX: ${skippedRows.tax.toLocaleString()}`);
              console.log(`Rows with zero cost (included): ${skippedRows.zeroCost.toLocaleString()}`);
              console.log(`Unique workloads created: ${result.length.toLocaleString()}`);
              console.log(`Total raw cost: $${totalRawCost.toFixed(2)}`);
              console.log(`Total aggregated cost: $${totalAggregatedCost.toFixed(2)}`);
              console.log(`===========================\n`);
              
              // Attach metadata with raw total cost (sum of ALL rows before aggregation)
              result._metadata = {
                totalRawCost: totalRawCost,
                totalAggregatedCost: totalAggregatedCost,
                totalRows: totalRowsRead,
                uniqueWorkloads: result.length,
                skippedRows: skippedRows,
                processedRows: processedRows
              };
              
              console.log('streamingCsvParser.js: totalRawCost', totalRawCost);
              console.log('streamingCsvParser.js: totalAggregatedCost', totalAggregatedCost);

              resolve(result);
              return;
            }
            
            // CRITICAL FIX: Decode in smaller chunks to prevent large buffers
            // Split large chunks into smaller pieces before processing
            const chunk = decoder.decode(value, { stream: true });
            
            // If chunk is very large, process it in smaller pieces
            if (chunk.length > 500000) { // 500KB threshold
              const pieceSize = 100000; // 100KB pieces
              for (let i = 0; i < chunk.length; i += pieceSize) {
                const piece = chunk.substring(i, Math.min(i + pieceSize, chunk.length));
                await processChunk(piece);
                // Process any accumulated buffer after each piece
                await processRemainingBuffer();
                // Yield between pieces
                if (i + pieceSize < chunk.length) {
                  await new Promise(resolve => setTimeout(resolve, 0));
                }
              }
            } else {
              await processChunk(chunk); // Make async to allow yielding
              // Process any accumulated buffer
              await processRemainingBuffer();
            }
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
      
      // CRITICAL FIX: Process ArrayBuffer path asynchronously to prevent stack overflow
      const processArrayBuffer = async () => {
        for (let i = 0; i < fileOrBuffer.byteLength; i += chunkSize) {
          const chunk = fileOrBuffer.slice(i, Math.min(i + chunkSize, fileOrBuffer.byteLength));
          const textChunk = decoder.decode(chunk, { stream: i + chunkSize < fileOrBuffer.byteLength });
          await processChunk(textChunk); // Make async to allow yielding
          
          // Yield to event loop every chunk to prevent blocking
          if (i + chunkSize < fileOrBuffer.byteLength) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        // Process all remaining buffer in batches
        await processRemainingBuffer();
        
        // Process last line if buffer has content without newline
        if (buffer.trim()) {
          processLine(buffer);
          buffer = '';
        }
        
        const result = Array.from(workloadMap.values());
        
        // Validate that we have data rows (not just header)
        const totalRowsRead = lineNumber - 1; // Exclude header
        if (!headers || totalRowsRead === 0) {
          reject(new Error('CSV file contains no data rows'));
          return;
        }
        
        const totalAggregatedCost = result.reduce((sum, workload) => sum + (workload.monthlyCost || 0), 0);
      
        // CRITICAL DEBUG: Log row processing statistics
        console.log(`\n=== CSV PARSING SUMMARY (ArrayBuffer path) ===`);
        console.log(`Total rows read: ${totalRowsRead.toLocaleString()}`);
        console.log(`Rows processed: ${processedRows.toLocaleString()}`);
        console.log(`Rows skipped - no productCode: ${skippedRows.noProductCode.toLocaleString()}`);
        console.log(`Rows skipped - TAX: ${skippedRows.tax.toLocaleString()}`);
        console.log(`Rows with zero cost (included): ${skippedRows.zeroCost.toLocaleString()}`);
        console.log(`Unique workloads created: ${result.length.toLocaleString()}`);
        console.log(`Total raw cost: $${totalRawCost.toFixed(2)}`);
        console.log(`Total aggregated cost: $${totalAggregatedCost.toFixed(2)}`);
        console.log(`=============================================\n`);
        
        // Attach metadata with raw total cost (sum of ALL rows before aggregation)
        result._metadata = {
          totalRawCost: totalRawCost,
          totalAggregatedCost: totalAggregatedCost,
          totalRows: totalRowsRead,
          uniqueWorkloads: result.length,
          skippedRows: skippedRows,
          processedRows: processedRows
        };
        
        console.log('streamingCsvParser.js: totalRawCost', totalRawCost);
        console.log('streamingCsvParser.js: totalAggregatedCost', totalAggregatedCost);

        resolve(result);
      };
      
      processArrayBuffer();
    }
  });
};
