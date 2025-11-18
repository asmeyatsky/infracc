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
 * @param {File|ArrayBuffer} fileOrBuffer - File or buffer to parse
 * @param {Function} onProgress - Progress callback
 * @param {Object} options - Options object
 * @param {Object} options.workloadRepository - Optional repository to flush workloads periodically
 */
export const parseAwsCurStreaming = async (fileOrBuffer, onProgress, options = {}) => {
  const { workloadRepository } = options;
  return new Promise((resolve, reject) => {
    // CRITICAL: Add error handler wrapper
    const handleError = (error) => {
      console.error('[streamingCsvParser] FATAL ERROR:', error);
      console.error('[streamingCsvParser] Error stack:', error?.stack);
      console.error('[streamingCsvParser] Error name:', error?.name);
      console.error('[streamingCsvParser] Error message:', error?.message);
      reject(new Error(`Fatal error in CSV parser: ${error?.message || 'Unknown error'}. Check console for details.`));
    };
    
    try {
      const workloads = [];
      const workloadMap = new Map(); // Group by resource ID
      let totalRawCost = 0; // Track sum of ALL raw costs from ALL rows (before aggregation)
      let skippedRows = { noProductCode: 0, tax: 0, zeroCost: 0, unknownService: 0 };
      let processedRows = 0;
      
      // CRITICAL: Track workloads saved to IndexedDB to prevent memory accumulation
      let workloadsSavedToDB = 0;
      const FLUSH_TO_DB_THRESHOLD = 50000; // Flush every 50K workloads
      
      // CRITICAL: Aggressive memory monitoring and crash prevention
      const checkMemory = () => {
        if (performance.memory) {
          const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
          const totalMB = performance.memory.totalJSHeapSize / 1024 / 1024;
          const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
          const usagePercent = (usedMB / limitMB) * 100;
          
          // CRITICAL: Abort if memory usage exceeds 88% to prevent browser crash (lowered from 90% for safety)
          if (usagePercent > 88) {
            const errorMsg = `Memory usage critical (${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB = ${usagePercent.toFixed(1)}%). Aborting to prevent browser crash.`;
            console.error(`[streamingCsvParser] ${errorMsg}`);
            console.error(`[streamingCsvParser] Processed ${lineNumber.toLocaleString()} lines, ${workloadMap.size.toLocaleString()} workloads before abort`);
            
            // CRITICAL: Save crash state to localStorage in UI-readable format
            try {
              const crashState = {
                timestamp: new Date().toISOString(),
                error: errorMsg,
                lineNumber,
                workloadsProcessed: workloadMap.size,
                bytesProcessed,
                totalBytes,
                fileSize: fileOrBuffer.size
              };
              localStorage.setItem('csvParserCrashState', JSON.stringify(crashState));
              
              // ALSO save to crashLogs for UI display (doesn't require console access)
              try {
                const existingCrashLogs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
                const logMessage = `[${crashState.timestamp}] CSV Parser Memory Error: ${errorMsg}\nProcessed: ${lineNumber.toLocaleString()} lines, ${workloadMap.size.toLocaleString()} workloads\nBytes: ${(bytesProcessed / 1024 / 1024).toFixed(1)}MB / ${(totalBytes / 1024 / 1024).toFixed(1)}MB`;
                existingCrashLogs.push(logMessage);
                if (existingCrashLogs.length > 50) {
                  existingCrashLogs.shift();
                }
                localStorage.setItem('crashLogs', JSON.stringify(existingCrashLogs));
                
                // Update UI crash log count (works even if console is locked)
                try {
                  const countEl = document.getElementById('crash-logs-count');
                  if (countEl) {
                    countEl.textContent = existingCrashLogs.length;
                  }
                } catch (e) {
                  // Ignore UI update errors
                }
              } catch (e2) {
                // Fallback: try simple string save
                try {
                  const simpleLog = `[${new Date().toISOString()}] CSV Parser Crash: ${errorMsg}`;
                  const existing = JSON.parse(localStorage.getItem('crashLogs') || '[]');
                  existing.push(simpleLog);
                  localStorage.setItem('crashLogs', JSON.stringify(existing.slice(-50)));
                } catch (e3) {
                  // All logging failed
                }
              }
            } catch (e) {
              // Last resort: try direct string save
              try {
                localStorage.setItem('csvParserLastError', errorMsg);
              } catch (e2) {
                // All logging failed
              }
            }
            
            reject(new Error(errorMsg));
            return false;
          }
          
          // WARNING: If memory usage exceeds 80%, log warning and suggest cleanup
          if (usagePercent > 80) {
            console.warn(`[streamingCsvParser] Memory usage high: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);
            console.warn(`[streamingCsvParser] Consider processing fewer files at once`);
            // Force GC hint at 80%
            forceGCHint();
          }
          
          // CRITICAL: At 85%, be more aggressive
          if (usagePercent > 85) {
            console.warn(`[streamingCsvParser] Memory usage very high (${usagePercent.toFixed(1)}%), forcing garbage collection`);
            forceGCHint();
            if (global.gc) {
              try {
                global.gc();
              } catch (e) {
                // Ignore GC errors
              }
            }
          }
        }
        return true;
      };
      
      // CRITICAL: Periodic memory check and forced garbage collection hint
      let lastGCHint = 0;
      const forceGCHint = () => {
        const now = Date.now();
        // Suggest GC every 30 seconds if memory is high
        if (now - lastGCHint > 30000 && performance.memory) {
          const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
          const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
          if ((usedMB / limitMB) > 0.7) {
            // Force garbage collection hint by clearing large temporary objects
            if (global.gc && typeof global.gc === 'function') {
              global.gc();
            }
            lastGCHint = now;
          }
        }
      };
    
      let headers = null;
      let headerIndices = null;
      let buffer = '';
      let lineNumber = 0;
      let bytesProcessed = 0;
      const totalBytes = fileOrBuffer.size || fileOrBuffer.byteLength || 0;
      
    // PERFORMANCE: Process larger batches for better throughput on M1 chips
    // Increased batch size significantly - M1 can handle much more efficiently
    const MAX_LINES_PER_BATCH = 10000; // Process 10k lines before yielding (M1 optimized)
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
      
      // PERFORMANCE: Cache regex pattern outside function
      const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;
      
      // Process a line of CSV
      const processLine = (line) => {
        // PERFORMANCE: Fast empty check
        if (line.length === 0 || (line.length === 1 && line.charCodeAt(0) <= 32)) return;
        
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
        
        // PERFORMANCE: Cache header indices to avoid repeated property access
        const pcIdx = headerIndices.productCode;
        const riIdx = headerIndices.resourceId;
        const costIdx = headerIndices.cost;
        const utIdx = headerIndices.usageType;
        const itIdx = headerIndices.instanceType;
        const osIdx = headerIndices.os;
        const regIdx = headerIndices.region;
        const usdIdx = headerIndices.usageStartDate;
        const uedIdx = headerIndices.usageEndDate;
        
        // PERFORMANCE: Get product code and validate efficiently
        const productCodeRaw = values[pcIdx];
        if (!productCodeRaw || productCodeRaw.length === 0) {
          skippedRows.noProductCode++;
          return;
        }
        
        // PERFORMANCE: Fast date check before expensive toUpperCase
        if (DATE_PATTERN.test(productCodeRaw)) {
          skippedRows.noProductCode++;
          return;
        }
        
        // PERFORMANCE: Only do toUpperCase if needed (cache result)
        const productCode = productCodeRaw.toUpperCase();
        
        if (productCode === 'TAX') {
          skippedRows.tax++;
          return;
        }
        
        // PERFORMANCE: Extract fields with minimal string operations
        const rawResourceId = riIdx >= 0 ? values[riIdx] : '';
        const costStr = costIdx >= 0 ? values[costIdx] : '0';
        const cost = parseFloat(costStr) || 0;
        const roundedCost = Math.round(cost * 100) / 100;
        
        // Extract other fields from CSV
        const usageType = utIdx >= 0 ? values[utIdx] : '';
        const instanceType = itIdx >= 0 ? values[itIdx] : '';
        const osRaw = osIdx >= 0 ? values[osIdx] : '';
        const os = osRaw.toLowerCase();
        const rawRegion = regIdx >= 0 ? values[regIdx] : '';
        // PERFORMANCE: Fast region check
        const region = rawRegion && rawRegion.length > 0 ? rawRegion : 'us-east-1';
        const usageStartDate = usdIdx >= 0 ? values[usdIdx] : null;
        const usageEndDate = uedIdx >= 0 ? values[uedIdx] : null;

        // Track raw cost from EVERY row (before any filtering or aggregation)
        totalRawCost += roundedCost; // Include both positive and negative costs
        
        // CRITICAL FIX: Don't skip zero-cost rows - they still represent workloads
        if (roundedCost === 0) {
          skippedRows.zeroCost++;
        }
        
        processedRows++;
        
        // PERFORMANCE: Optimize resourceId creation - avoid string operations when possible
        const resourceId = rawResourceId.length > 0 
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
        
        // PERFORMANCE: Create deduplication key directly without intermediate object
        const dedupeKey = `${resourceId}_${normalizedService}_${region}`.toLowerCase();
        
        // Extract instance specs
        const instanceSpecs = parseInstanceType(instanceType);
      
        // PERFORMANCE: Use Map.has/get pattern for better performance
        let workload = workloadMap.get(dedupeKey);
        if (!workload) {
          // PERFORMANCE: Optimize name extraction - cache split result
          const lastSlash = resourceId.lastIndexOf('/');
          const name = lastSlash >= 0 ? resourceId.substring(lastSlash + 1) : resourceId;
          
          workload = {
            id: resourceId,
            name: name,
            service: normalizedService,
            type: serviceType,
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
            dateRange: usageStartDate && usageEndDate 
              ? { start: usageStartDate, end: usageEndDate }
              : null,
            seenDates: usageStartDate ? [usageStartDate] : [],
          };
          workloadMap.set(dedupeKey, workload);
        }
        
        // PERFORMANCE: Direct property access instead of getter
        workload.monthlyCost += roundedCost;
      
        // PERFORMANCE: Optimize date tracking - only update if needed
        // MEMORY-EFFICIENT: Limit seenDates to 100 (reduced from 1000) to save memory
        if (usageStartDate) {
          const seenDates = workload.seenDates;
          // CRITICAL: Limit to 100 dates max to prevent memory bloat
          if (seenDates.length < 100 && !seenDates.includes(usageStartDate)) {
            seenDates.push(usageStartDate);
          }
          
          if (usageEndDate) {
            const dateRange = workload.dateRange;
            if (!dateRange) {
              workload.dateRange = { start: usageStartDate, end: usageEndDate };
            } else {
              // PERFORMANCE: Direct comparison instead of string operations
              if (usageStartDate < dateRange.start) dateRange.start = usageStartDate;
              if (usageEndDate > dateRange.end) dateRange.end = usageEndDate;
            }
          }
        }
        
        // Note: Flushing to DB happens in processChunk, not here (processLine is synchronous)
        
        // CRITICAL: Periodically compact workloadMap if memory is high
        if (lineNumber % 50000 === 0 && performance.memory) {
          const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
          const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
          const usagePercent = (usedMB / limitMB) * 100;
          
          if (usagePercent > 80) {
            // Compact workloadMap: trim seenDates arrays and remove unnecessary data
            let compacted = 0;
            for (const [key, w] of workloadMap.entries()) {
              if (w.seenDates && w.seenDates.length > 50) {
                w.seenDates = w.seenDates.slice(-50); // Keep only last 50 dates
                compacted++;
              }
            }
            if (compacted > 0) {
              console.log(`[streamingCsvParser] Compacted ${compacted} workloads (trimmed seenDates) to reduce memory usage`);
            }
          }
        }
        
        // SAFETY: Check workloadMap size periodically (not every line)
        if (workloadMap.size > 2000000) {
          console.warn(`[streamingCsvParser] workloadMap size (${workloadMap.size}) exceeds limit`);
          throw new Error(`Too many unique workloads (${workloadMap.size}). File may be corrupted or too large.`);
        }
        
        // CRITICAL: Check memory every 5,000 lines to catch issues early
        if (lineNumber % 5000 === 0 && performance.memory) {
          const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
          const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
          const usagePercent = (usedMB / limitMB) * 100;
          
          // Abort early if memory is getting too high (lowered to 88%)
          if (usagePercent > 88) {
            const errorMsg = `Memory usage critical during parsing (${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB = ${usagePercent.toFixed(1)}%). Aborting to prevent browser crash.`;
            console.error(`[streamingCsvParser] ${errorMsg}`);
            console.error(`[streamingCsvParser] Processed ${lineNumber.toLocaleString()} lines, ${workloadMap.size.toLocaleString()} workloads before abort`);
            throw new Error(errorMsg);
          }
          
          // Warning at 80% (lowered from 85%)
          if (usagePercent > 80) {
            console.warn(`[streamingCsvParser] Memory usage high: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%) at line ${lineNumber.toLocaleString()}`);
            forceGCHint(); // Suggest GC
          }
          
          // Aggressive GC hint at 85%
          if (usagePercent > 85) {
            console.warn(`[streamingCsvParser] Memory usage very high (${usagePercent.toFixed(1)}%), forcing garbage collection hint`);
            forceGCHint();
            // Additional GC hint
            if (global.gc) {
              try {
                global.gc();
              } catch (e) {
                // Ignore GC errors
              }
            }
          }
        }
        
        // PERFORMANCE: Update storage efficiently
        if (serviceType === 'storage' && headerIndices.usageAmount >= 0) {
          const usageAmount = parseFloat(values[headerIndices.usageAmount]) || 0;
          if (usageType.indexOf('GB') >= 0) {
            workload.storage += usageAmount;
          }
        }
      };
    
    // PERFORMANCE: Optimized CSV line parser using array indices instead of string concatenation
    // Pre-allocates arrays and uses indices for much better performance on M1
    const parseCSVLine = (line) => {
      try {
        // SAFETY: Limit line length to prevent memory issues
        const MAX_LINE_LENGTH = 10000000; // 10MB max per line
        if (line.length > MAX_LINE_LENGTH) {
          console.warn(`[parseCSVLine] Line too long (${line.length} chars), truncating to ${MAX_LINE_LENGTH}`);
          line = line.substring(0, MAX_LINE_LENGTH);
        }
        
        // PERFORMANCE: Pre-allocate array with estimated size (most CSV lines have similar field counts)
        const values = [];
        let startIdx = 0;
        let inQuotes = false;
        let quoteCount = 0;
        const len = line.length;
        
        // PERFORMANCE: Use index-based parsing instead of string concatenation
        for (let i = 0; i < len; i++) {
          const char = line[i];
          
          if (char === '"') {
            quoteCount++;
            if (quoteCount > 100000) {
              break; // Safety limit
            }
            
            if (inQuotes && i + 1 < len && line[i + 1] === '"') {
              i++; // Skip escaped quote
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            // PERFORMANCE: Extract field using substring only when needed, trim inline
            let field = line.substring(startIdx, i);
            // Fast trim (remove leading/trailing whitespace)
            let trimStart = 0;
            let trimEnd = field.length;
            while (trimStart < trimEnd && field.charCodeAt(trimStart) <= 32) trimStart++;
            while (trimEnd > trimStart && field.charCodeAt(trimEnd - 1) <= 32) trimEnd--;
            values.push(trimStart > 0 || trimEnd < field.length ? field.substring(trimStart, trimEnd) : field);
            startIdx = i + 1;
          }
        }
        
        // Add last field
        if (startIdx < len) {
          let field = line.substring(startIdx);
          let trimStart = 0;
          let trimEnd = field.length;
          while (trimStart < trimEnd && field.charCodeAt(trimStart) <= 32) trimStart++;
          while (trimEnd > trimStart && field.charCodeAt(trimEnd - 1) <= 32) trimEnd--;
          values.push(trimStart > 0 || trimEnd < field.length ? field.substring(trimStart, trimEnd) : field);
        }
        
        // SAFETY: Limit number of fields
        const MAX_FIELDS = 10000;
        if (values.length > MAX_FIELDS) {
          return values.slice(0, MAX_FIELDS);
        }
        
        return values;
      } catch (parseError) {
        console.error('[parseCSVLine] Error parsing CSV line:', parseError);
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
    
    // PERFORMANCE: Optimized chunk processing - uses indices instead of substring operations
    const processChunk = async (chunk) => {
      buffer += chunk;
      
      // PERFORMANCE: Process larger batches before yielding (M1 can handle this efficiently)
      let linesProcessedInBatch = 0;
      let searchStart = 0;
      
      // PERFORMANCE: Use indexOf with start position to avoid re-scanning
      while (linesProcessedInBatch < MAX_LINES_PER_BATCH) {
        const newlineIndex = buffer.indexOf('\n', searchStart);
        if (newlineIndex === -1) break;
        
        // PERFORMANCE: Extract line using substring only once
        const line = buffer.substring(searchStart, newlineIndex);
        searchStart = newlineIndex + 1;
        
        // PERFORMANCE: Fast check for non-empty line (skip if first char is not whitespace)
        if (line.length > 0 && line.charCodeAt(0) > 32) {
          try {
            processLine(line);
            linesProcessedInBatch++;
          } catch (error) {
            // Only log errors occasionally to avoid performance hit
            if (lineNumber % 100000 === 0) {
              console.warn(`Error processing line ${lineNumber}:`, error);
            }
          }
        } else if (line.length > 0) {
          // Line has content but starts with whitespace - still process it
          try {
            processLine(line);
            linesProcessedInBatch++;
          } catch (error) {
            if (lineNumber % 100000 === 0) {
              console.warn(`Error processing line ${lineNumber}:`, error);
            }
          }
        }
        
        // CRITICAL: Periodically flush workloads to IndexedDB if repository provided and map is large
        // Check every 10K lines to avoid overhead
        if (workloadRepository && workloadMap.size >= FLUSH_TO_DB_THRESHOLD && lineNumber % 10000 === 0) {
          try {
            const workloadsToFlush = Array.from(workloadMap.values());
            console.log(`[streamingCsvParser] Flushing ${workloadsToFlush.length.toLocaleString()} workloads to IndexedDB to free memory...`);
            
            // Save in batches to avoid memory spike
            const BATCH_SIZE = 1000;
            for (let i = 0; i < workloadsToFlush.length; i += BATCH_SIZE) {
              const batch = workloadsToFlush.slice(i, Math.min(i + BATCH_SIZE, workloadsToFlush.length));
              await Promise.all(batch.map(w => workloadRepository.save(w).catch(e => {
                console.warn(`[streamingCsvParser] Failed to save workload ${w.id}:`, e);
              })));
            }
            
            workloadsSavedToDB += workloadsToFlush.length;
            workloadMap.clear(); // CRITICAL: Clear map to free memory
            console.log(`[streamingCsvParser] Flushed ${workloadsToFlush.length.toLocaleString()} workloads, cleared map. Total saved to DB: ${workloadsSavedToDB.toLocaleString()}`);
            
            // Force GC hint
            if (global.gc) global.gc();
            else if (window.gc) window.gc();
          } catch (flushError) {
            console.error(`[streamingCsvParser] Error flushing workloads to DB:`, flushError);
            // Continue processing - don't abort on flush error
          }
        }
      }
      
      // PERFORMANCE: Only update buffer if we processed lines
      if (searchStart > 0) {
        buffer = buffer.substring(searchStart);
      }
      
      bytesProcessed += chunk.length;
      
      // CRITICAL: Check memory periodically during chunk processing (more frequently)
      if (linesProcessedInBatch > 0 && performance.memory && lineNumber % 25000 === 0) {
        const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
        const usagePercent = (usedMB / limitMB) * 100;
        
        if (usagePercent > 88) {
          const errorMsg = `Memory usage critical during chunk processing (${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB = ${usagePercent.toFixed(1)}%). Aborting to prevent browser crash.`;
          console.error(`[streamingCsvParser] ${errorMsg}`);
          throw new Error(errorMsg);
        }
        
        if (usagePercent > 80) {
          console.warn(`[streamingCsvParser] Memory usage high during chunk processing: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);
          forceGCHint();
        }
        
        if (usagePercent > 85) {
          // Aggressive GC at 85%
          forceGCHint();
          if (global.gc) {
            try {
              global.gc();
            } catch (e) {
              // Ignore GC errors
            }
          }
        }
      }
      
      // PERFORMANCE: Only call progress callback every 5% to reduce overhead
      if (onProgress && totalBytes > 0 && bytesProcessed % Math.floor(totalBytes / 20) < chunk.length) {
        onProgress({
          bytesProcessed,
          totalBytes,
          percent: Math.round((bytesProcessed / totalBytes) * 100),
          linesProcessed: lineNumber
        });
      }
    };
    
    // PERFORMANCE: Optimized buffer processing - processes larger batches before yielding
    const processRemainingBuffer = async () => {
      let bufferIterations = 0;
      const MAX_BUFFER_ITERATIONS = 1000000;
      let searchStart = 0;
      
      while (true) {
        const newlineIndex = buffer.indexOf('\n', searchStart);
        if (newlineIndex === -1) break;
        
        bufferIterations++;
        if (bufferIterations > MAX_BUFFER_ITERATIONS) {
          console.error('[streamingCsvParser] Buffer processing exceeded maximum iterations.');
          break;
        }
        
        let linesProcessedInBatch = 0;
        let localSearchStart = searchStart;
        
        // PERFORMANCE: Process larger batches before yielding
        while (linesProcessedInBatch < MAX_LINES_PER_BATCH) {
          const localNewlineIndex = buffer.indexOf('\n', localSearchStart);
          if (localNewlineIndex === -1) {
            searchStart = localSearchStart;
            break;
          }
          
          const line = buffer.substring(localSearchStart, localNewlineIndex);
          localSearchStart = localNewlineIndex + 1;
          
          if (line.length > 0) {
            try {
              processLine(line);
              linesProcessedInBatch++;
            } catch (error) {
              if (lineNumber % 100000 === 0) {
                console.warn(`Error processing line ${lineNumber}:`, error);
              }
            }
          }
        }
        
        searchStart = localSearchStart;
        
        // PERFORMANCE: Yield less frequently (every 5 batches instead of every batch)
        if (bufferIterations % 5 === 0 && buffer.indexOf('\n', searchStart) !== -1) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      // Update buffer
      if (searchStart > 0) {
        buffer = buffer.substring(searchStart);
      }
    };
      
      // Handle File object
      if (fileOrBuffer instanceof File || fileOrBuffer instanceof Blob) {
      const reader = fileOrBuffer.stream().getReader();
      const decoder = new TextDecoder('utf-8');
      
      // CRITICAL: Add timeout to prevent infinite loop if reader hangs
      const MAX_READ_ITERATIONS = 1000000; // Safety limit
      let readIterations = 0;
      // Dynamic timeout based on file size: 5 minutes per 100MB (very generous), minimum 15 minutes, maximum 120 minutes
      // Based on observed processing times: ~830MB files take ~13-14 minutes normally, but can slow down to 30+ minutes
      // when IndexedDB has many workloads already stored
      const fileSizeMB = (fileOrBuffer.size || 0) / (1024 * 1024);
      const baseTimeout = 900000; // 15 minutes base
      const sizeBasedTimeout = Math.ceil(fileSizeMB / 100) * 300000; // 5 minutes per 100MB
      const READ_TIMEOUT_MS = Math.min(Math.max(baseTimeout, sizeBasedTimeout), 7200000); // Max 120 minutes
      console.log(`[streamingCsvParser] File size: ${fileSizeMB.toFixed(1)}MB, timeout: ${(READ_TIMEOUT_MS / 60000).toFixed(1)} minutes`);
      const startTime = Date.now();
      let lastProgressLog = 0; // Track last progress log time
      
      const readChunk = async () => {
        try {
          while (true) {
            // CRITICAL: Check memory every 100 iterations to prevent crashes
            if (readIterations % 100 === 0) {
              if (!checkMemory()) {
                return; // Abort if memory check fails
              }
              forceGCHint();
            }
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
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime > READ_TIMEOUT_MS) {
              const elapsedMinutes = (elapsedTime / 60000).toFixed(1);
              const timeoutMinutes = (READ_TIMEOUT_MS / 60000).toFixed(1);
              reject(new Error(`File read exceeded timeout (${timeoutMinutes} minutes). File may be too large or corrupted. Elapsed: ${elapsedMinutes} minutes.`));
              try {
                reader.cancel();
              } catch (e) {
                // Ignore cancel errors
              }
              return;
            }
            
            // CRITICAL: Check memory before every read to prevent crashes
            if (!checkMemory()) {
              return; // Abort if memory check fails
            }
            
            // PERFORMANCE: Log progress every 60 seconds (less frequent) to reduce overhead
            if (elapsedTime - lastProgressLog >= 60000) {
              lastProgressLog = elapsedTime;
              const elapsedMinutes = (elapsedTime / 60000).toFixed(1);
              const progressPercent = totalBytes > 0 ? Math.round((bytesProcessed / totalBytes) * 100) : 0;
              
              // Force GC hint if memory is high
              forceGCHint();
              
              console.log(`[streamingCsvParser] Progress: ${progressPercent}% (${(bytesProcessed / 1024 / 1024).toFixed(1)}MB/${(totalBytes / 1024 / 1024).toFixed(1)}MB), elapsed: ${elapsedMinutes}min, lines: ${lineNumber.toLocaleString()}, workloads: ${workloadMap.size.toLocaleString()}`);
              if (onProgress) {
                onProgress({
                  bytesProcessed,
                  totalBytes,
                  percent: progressPercent,
                  linesProcessed: lineNumber,
                  elapsedTime: elapsedTime,
                  status: `Processing... ${progressPercent}% (${elapsedMinutes}min elapsed)`
                });
              }
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
              
              // CRITICAL: If workloads were flushed to DB, load them back
              let result = [];
              if (workloadsSavedToDB > 0 && workloadRepository) {
                try {
                  console.log(`[streamingCsvParser] Loading ${workloadsSavedToDB.toLocaleString()} workloads from IndexedDB...`);
                  const savedWorkloads = await workloadRepository.findAll();
                  result = savedWorkloads;
                  console.log(`[streamingCsvParser] Loaded ${savedWorkloads.length.toLocaleString()} workloads from IndexedDB`);
                } catch (loadError) {
                  console.error('[streamingCsvParser] Error loading workloads from DB:', loadError);
                  // Fallback to in-memory workloads
                }
              }
              
              // Add remaining in-memory workloads
              try {
                const inMemoryWorkloads = Array.from(workloadMap.values());
                result = result.concat(inMemoryWorkloads);
              } catch (arrayError) {
                console.error('[streamingCsvParser] Error converting workloadMap to array:', arrayError);
                // Fallback: manual conversion
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
                  const calculated = result.reduce((sum, workload) => {
                    try {
                      const cost = workload?.monthlyCost || 0;
                      const numCost = typeof cost === 'number' ? cost : parseFloat(cost) || 0;
                      return sum + numCost;
                    } catch (e) {
                      return sum; // Skip invalid workloads
                    }
                  }, 0);
                  totalAggregatedCost = typeof calculated === 'number' ? calculated : 0;
                }
              } catch (reduceError) {
                console.warn('[streamingCsvParser] Error calculating totalAggregatedCost:', reduceError);
                totalAggregatedCost = 0; // Ensure it's always a number
              }
              
              // CRITICAL: Ensure totalAggregatedCost is always a number
              if (typeof totalAggregatedCost !== 'number' || isNaN(totalAggregatedCost)) {
                console.warn('[streamingCsvParser] totalAggregatedCost is not a number, defaulting to 0');
                totalAggregatedCost = 0;
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
            
            // PERFORMANCE: Decode entire chunk at once - M1 can handle large buffers efficiently
            const chunk = decoder.decode(value, { stream: true });
            
            // PERFORMANCE: Process entire chunk without splitting - M1 optimized
            // Only yield every 10 chunks to reduce overhead
            await processChunk(chunk);
            
            // PERFORMANCE: Process buffer less frequently (every 5 chunks instead of every chunk)
            if (readIterations % 5 === 0) {
              await processRemainingBuffer();
            }
          }
        } catch (error) {
          // CRITICAL: Log error details before rejecting
          console.error('[streamingCsvParser] Error in readChunk:', error);
          console.error('[streamingCsvParser] Error stack:', error?.stack);
          console.error('[streamingCsvParser] Error name:', error?.name);
          console.error('[streamingCsvParser] Bytes processed:', bytesProcessed);
          console.error('[streamingCsvParser] Lines processed:', lineNumber);
          console.error('[streamingCsvParser] Workloads created:', workloadMap.size);
          reject(error);
        }
      };
      
      // CRITICAL: Wrap readChunk call in try-catch
      try {
        readChunk().catch((error) => {
          console.error('[streamingCsvParser] Unhandled error in readChunk promise:', error);
          reject(error);
        });
      } catch (error) {
        console.error('[streamingCsvParser] Error starting readChunk:', error);
        reject(error);
      }
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
          
          // SAFETY: Safe reduce with error handling
          let totalAggregatedCost = 0;
          try {
            if (result.length > 0) {
              const calculated = result.reduce((sum, workload) => {
                try {
                  const cost = workload?.monthlyCost || 0;
                  const numCost = typeof cost === 'number' ? cost : parseFloat(cost) || 0;
                  return sum + numCost;
                } catch (e) {
                  return sum;
                }
              }, 0);
              totalAggregatedCost = typeof calculated === 'number' ? calculated : 0;
            }
          } catch (reduceError) {
            console.warn('[streamingCsvParser] Error calculating totalAggregatedCost:', reduceError);
            totalAggregatedCost = 0;
          }
          
          // CRITICAL: Ensure totalAggregatedCost is always a number
          if (typeof totalAggregatedCost !== 'number' || isNaN(totalAggregatedCost)) {
            console.warn('[streamingCsvParser] totalAggregatedCost is not a number, defaulting to 0');
            totalAggregatedCost = 0;
          }
        
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
        
        // CRITICAL: Wrap processArrayBuffer call in try-catch
        try {
          processArrayBuffer().catch((error) => {
            console.error('[streamingCsvParser] Unhandled error in processArrayBuffer promise:', error);
            reject(error);
          });
        } catch (error) {
          console.error('[streamingCsvParser] Error starting processArrayBuffer:', error);
          reject(error);
        }
      }
    } catch (error) {
      handleError(error);
    }
  });
};
