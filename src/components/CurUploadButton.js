/**
 * CUR Upload Button Component
 * 
 * Provides easy access to upload AWS Cost and Usage Report (CUR) files
 * Supports single CUR CSV files or ZIP archives containing multiple CUR files
 */

import React, { useState, useRef } from 'react';
import { getContainer } from '../infrastructure/dependency_injection/Container.js';
import { Workload } from '../domain/entities/Workload.js';
import { parseAwsCur, parseAwsBillSimple } from '../utils/awsBomImport.js';
import { parseCSV } from '../utils/csvImport.js';
import { parseAwsCurStreaming } from '../utils/streamingCsvParser.js';
import { toast } from 'react-toastify';

function CurUploadButton({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);
  const container = getContainer();
  const workloadRepository = container.workloadRepository;

  /**
   * Process a single CSV file
   * Uses streaming parser for large files (>50MB)
   */
  const processCSVFile = async (file, awsBomFormat = 'cur') => {
    const fileSize = file.size;
    const largeFileThreshold = 50 * 1024 * 1024; // 50MB
    
    // For large files, use streaming parser
    if (fileSize > largeFileThreshold) {
      toast.info(`Processing large file ${file.name} (${(fileSize / 1024 / 1024).toFixed(1)}MB) using streaming parser...`);
      
      try {
        const importedData = await parseAwsCurStreaming(file, (progress) => {
          if (progress.percent % 10 === 0) { // Update every 10%
            console.log(`Processing ${file.name}: ${progress.percent}% (${progress.linesProcessed} lines)`);
          }
        });
        
        toast.success(`Processed ${file.name}: ${importedData.length} workloads`);
        return importedData;
      } catch (error) {
        // If streaming fails, try regular parsing for files under 100MB
        if (fileSize < 100 * 1024 * 1024) {
          console.warn('Streaming parser failed, falling back to regular parser:', error);
        } else {
          throw error;
        }
      }
    }
    
    // For smaller files or fallback, use regular FileReader
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvText = e.target.result;
          let importedData = [];

          // Try AWS BOM formats first
          try {
            if (awsBomFormat === 'cur') {
              importedData = parseAwsCur(csvText);
            } else {
              importedData = parseAwsBillSimple(csvText);
            }
          } catch (awsError) {
            // Fall back to standard CSV parsing
            console.warn('AWS BOM parsing failed, trying standard CSV:', awsError);
            importedData = parseCSV(csvText);
          }

          resolve(importedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsText(file);
    });
  };

  /**
   * Extract and process files from ZIP archive
   * Handles large files by processing in chunks
   */
  const processZipFile = async (file, awsBomFormat = 'cur') => {
    try {
      // Dynamic import of JSZip
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default || JSZipModule;
      const zip = await JSZip.loadAsync(file);
      const csvFiles = [];
      
      // Find all CSV files in the ZIP
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.csv')) {
          csvFiles.push({ name: relativePath, entry: zipEntry });
        }
      });

      if (csvFiles.length === 0) {
        throw new Error('No CSV files found in ZIP archive');
      }

      // Process each CSV file
      const allData = [];
      const largeFileThreshold = 50 * 1024 * 1024; // 50MB - use streaming parser above this
      
      for (const csvFile of csvFiles) {
        try {
          // Get file size - check uncompressed size if available
          let fileSize = 0;
          try {
            // Try to get uncompressed size from zip entry
            fileSize = csvFile.entry._data?.uncompressedSize || csvFile.entry._data?.length || 0;
          } catch (e) {
            // If we can't get size, we'll try to process it anyway with streaming parser
            fileSize = 0; // Unknown size - use streaming parser
          }
          
          // Warn for very large files
          if (fileSize > 100 * 1024 * 1024) {
            toast.info(`Processing large file ${csvFile.name} (${(fileSize / 1024 / 1024).toFixed(1)}MB) using streaming parser. This may take a while...`);
          } else if (fileSize > largeFileThreshold) {
            toast.info(`Processing file ${csvFile.name} (${(fileSize / 1024 / 1024).toFixed(1)}MB) using streaming parser...`);
          }

          // Always use streaming parser for large files (>50MB) or unknown size
          // Streaming parser can handle files of any size without memory limits
          let importedData = [];
          
          if (fileSize > largeFileThreshold || fileSize === 0) {
            // Use streaming parser for large files (no size limit)
            try {
              // Get file as blob for streaming
              const blob = await csvFile.entry.async('blob');
              
              // Use streaming parser - handles files of any size
              importedData = await parseAwsCurStreaming(blob, (progress) => {
                if (progress.percent % 10 === 0) { // Update every 10%
                  console.log(`Processing ${csvFile.name}: ${progress.percent}% (${progress.linesProcessed} lines)`);
                }
              });
              
              toast.success(`Processed ${csvFile.name}: ${importedData.length} workloads`);
            } catch (streamError) {
              console.error(`Streaming parser failed for ${csvFile.name}:`, streamError);
              // For files under 100MB, try fallback to regular parsing
              if (fileSize > 0 && fileSize < 100 * 1024 * 1024) {
                try {
                  const csvText = await csvFile.entry.async('string');
                  if (awsBomFormat === 'cur') {
                    importedData = parseAwsCur(csvText);
                  } else {
                    importedData = parseAwsBillSimple(csvText);
                  }
                } catch (fallbackError) {
                  throw streamError; // Use original streaming error
                }
              } else {
                // For very large files, streaming is the only option
                throw streamError;
              }
            }
          } else {
            // For smaller files (<50MB), use regular parsing (faster)
            try {
              const csvText = await csvFile.entry.async('string');
              
              if (awsBomFormat === 'cur') {
                importedData = parseAwsCur(csvText);
              } else {
                importedData = parseAwsBillSimple(csvText);
              }
            } catch (awsError) {
              console.warn(`AWS BOM parsing failed for ${csvFile.name}, trying standard CSV:`, awsError);
              importedData = parseCSV(csvText);
            }
          }

          allData.push(...importedData);
        } catch (error) {
          // Handle errors gracefully
          if (error.message.includes('Invalid string length') || error.name === 'RangeError') {
            // This shouldn't happen with streaming parser, but if it does, try streaming
            console.error(`String length error for ${csvFile.name}, attempting streaming parser:`, error);
            try {
              const blob = await csvFile.entry.async('blob');
              const importedData = await parseAwsCurStreaming(blob);
              allData.push(...importedData);
              toast.success(`Processed ${csvFile.name} using streaming parser: ${importedData.length} workloads`);
            } catch (streamError) {
              toast.error(`Failed to process ${csvFile.name}: ${streamError.message}`);
              console.error(`Streaming parser also failed for ${csvFile.name}:`, streamError);
            }
          } else {
            console.warn(`Error processing ${csvFile.name} from ZIP:`, error);
            toast.warn(`Failed to process ${csvFile.name}: ${error.message}`);
          }
        }
      }

      return allData;
    } catch (error) {
      if (error.message.includes('Cannot find module')) {
        throw new Error('ZIP support requires jszip package. Install it with: npm install jszip');
      }
      throw error;
    }
  };

  /**
   * Handle file upload
   */
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length, currentFile: '' });

    try {
      let totalWorkloadsSaved = 0;
      let processedCount = 0;
      let totalRowsProcessed = 0;
      let totalDuplicatesRemoved = 0;
      
      // Shared deduplication map across all files
      const dedupeMap = new Map(); // Track deduplication keys across all files
      const savedDedupeKeys = new Set(); // Track which dedupe keys we've already saved
      const batchSize = 25; // Smaller batch size to prevent stack overflow
      
      // Process files incrementally - deduplicate and save as we go
      for (const file of files) {
        setUploadProgress({
          current: processedCount + 1,
          total: files.length,
          currentFile: file.name,
          status: `Processing ${file.name}...`
        });

        try {
          let fileData = [];

          // Check if it's a ZIP file
          if (file.name.toLowerCase().endsWith('.zip')) {
            fileData = await processZipFile(file, 'cur'); // Default to CUR format
          } else if (file.name.toLowerCase().endsWith('.csv')) {
            fileData = await processCSVFile(file, 'cur'); // Default to CUR format
          } else {
            console.warn(`Skipping unsupported file: ${file.name}`);
            continue;
          }

          totalRowsProcessed += fileData.length;
          
          // Deduplicate this file's data incrementally
          setUploadProgress({
            current: processedCount + 1,
            total: files.length,
            currentFile: file.name,
            status: `Deduplicating ${fileData.length} workloads from ${file.name}...`
          });

          // Process file data in chunks to prevent stack overflow
          const chunkSize = 1000;
          for (let chunkStart = 0; chunkStart < fileData.length; chunkStart += chunkSize) {
            const chunk = fileData.slice(chunkStart, chunkStart + chunkSize);
            
            // Deduplicate chunk against existing dedupeMap
            for (const data of chunk) {
              const dedupeKey = `${data.id}_${data.service}_${data.region}`.toLowerCase();
              
              if (dedupeMap.has(dedupeKey)) {
                // Aggregate cost with existing workload (same resource across different dates)
                const existing = dedupeMap.get(dedupeKey);
                existing.monthlyCost += (data.monthlyCost || 0);
                // Update storage if it's a storage service (take maximum)
                if (data.storage) {
                  existing.storage = Math.max(existing.storage || 0, data.storage);
                }
                // Track date range if available
                if (data.dateRange) {
                  if (!existing.dateRange) {
                    existing.dateRange = data.dateRange;
                  } else {
                    // Expand date range
                    if (data.dateRange.start < existing.dateRange.start) {
                      existing.dateRange.start = data.dateRange.start;
                    }
                    if (data.dateRange.end > existing.dateRange.end) {
                      existing.dateRange.end = data.dateRange.end;
                    }
                  }
                }
                if (data.seenDates) {
                  if (!existing.seenDates) {
                    existing.seenDates = [];
                  }
                  existing.seenDates.push(...(data.seenDates || []));
                  // Remove duplicates
                  existing.seenDates = [...new Set(existing.seenDates)];
                }
                // Track source files
                if (!existing.sourceFiles) {
                  existing.sourceFiles = [];
                }
                if (file.name && !existing.sourceFiles.includes(file.name)) {
                  existing.sourceFiles.push(file.name);
                }
                totalDuplicatesRemoved++;
              } else {
                // New workload
                dedupeMap.set(dedupeKey, { 
                  ...data,
                  sourceFiles: file.name ? [file.name] : []
                });
              }
            }
            
            // Yield to event loop every chunk to prevent blocking
            if (chunkStart + chunkSize < fileData.length) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }

          console.log(`Processed ${file.name}: ${fileData.length} rows -> ${dedupeMap.size} unique workloads so far`);

          // Save deduplicated workloads incrementally (process in batches)
          setUploadProgress({
            current: processedCount + 1,
            total: files.length,
            currentFile: file.name,
            status: `Saving workloads from ${file.name}...`
          });

          // Process only NEW entries from dedupeMap (ones we haven't saved yet)
          const dedupeEntries = Array.from(dedupeMap.entries())
            .filter(([dedupeKey]) => !savedDedupeKeys.has(dedupeKey));
          
          if (dedupeEntries.length === 0) {
            console.log(`No new workloads to save from ${file.name} (all duplicates)`);
            processedCount++;
            continue;
          }
          
          for (let i = 0; i < dedupeEntries.length; i += batchSize) {
            const batch = dedupeEntries.slice(i, i + batchSize);
            
            // Process batch sequentially to avoid stack overflow
            for (const [dedupeKey, data] of batch) {
              try {
                // Check if workload already exists in repository
                const existingWorkload = await workloadRepository.findByDedupeKey(
                  data.id,
                  data.service,
                  data.region
                );

                if (existingWorkload) {
                  // Update existing workload: aggregate costs
                  const currentCost = existingWorkload.monthlyCost.value || 0;
                  const newCost = currentCost + (data.monthlyCost || 0);
                  
                  // Create updated workload with aggregated cost
                  const updatedWorkload = new Workload({
                    id: existingWorkload.id, // Keep same ID
                    name: existingWorkload.name,
                    service: existingWorkload.service,
                    type: existingWorkload.type.value,
                    sourceProvider: existingWorkload.sourceProvider.type,
                    cpu: existingWorkload.cpu,
                    memory: existingWorkload.memory,
                    storage: Math.max(existingWorkload.storage, data.storage || 0),
                    monthlyCost: newCost, // Aggregated cost
                    region: existingWorkload.region,
                    os: existingWorkload.os,
                    monthlyTraffic: existingWorkload.monthlyTraffic,
                    dependencies: existingWorkload.dependencies,
                    awsInstanceType: existingWorkload.awsInstanceType || data.awsInstanceType,
                    awsProductCode: existingWorkload.awsProductCode || data.awsProductCode,
                  });
                  
                  // Update in repository (delete old, save new)
                  await workloadRepository.delete(existingWorkload.id);
                  await workloadRepository.save(updatedWorkload);
                  savedDedupeKeys.add(dedupeKey); // Mark as saved
                  totalWorkloadsSaved++;
                } else {
                  // New workload - create and save
                  const workload = new Workload({
                    ...data,
                    sourceProvider: 'aws', // CUR files are AWS-specific
                    dependencies: data.dependencies 
                      ? (Array.isArray(data.dependencies) ? data.dependencies : data.dependencies.split(',').map(d => d.trim()))
                      : []
                  });
                  
                  await workloadRepository.save(workload);
                  savedDedupeKeys.add(dedupeKey); // Mark as saved
                  totalWorkloadsSaved++;
                }
              } catch (error) {
                console.warn(`Failed to process workload ${data.id}:`, error);
              }
            }
            
            // Yield to event loop every batch to prevent blocking
            if (i + batchSize < dedupeEntries.length) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
          
          console.log(`Saved ${dedupeEntries.length} workloads from ${file.name} (${dedupeMap.size - savedDedupeKeys.size} duplicates merged)`);

          processedCount++;
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          toast.error(`Error processing ${file.name}: ${error.message}`);
        }
      }

      if (totalWorkloadsSaved === 0) {
        toast.error('No valid data found in uploaded files');
        setUploading(false);
        setUploadProgress(null);
        event.target.value = null;
        return;
      }

      const deduplicatedCount = dedupeMap.size;
      console.log(`Deduplication complete: ${totalRowsProcessed} rows across ${files.length} file(s) -> ${deduplicatedCount} unique workloads (${totalDuplicatesRemoved} duplicates merged)`);

      // Force final persistence to ensure all workloads are saved
      try {
        // Give debounced persistence a moment to complete
        await new Promise(resolve => setTimeout(resolve, 600));
        // Force a final save to ensure everything is persisted
        await workloadRepository._forcePersist();
      } catch (error) {
        console.warn('Final persistence had issues, but workloads are saved in cache:', error);
      }

      // Summary message
      const summaryMessage = totalDuplicatesRemoved > 0
        ? `Successfully imported ${totalWorkloadsSaved} unique workloads from ${files.length} file(s) (${totalDuplicatesRemoved} duplicates merged across dates)`
        : `Successfully imported ${totalWorkloadsSaved} workloads from ${files.length} file(s)!`;
      
      toast.success(summaryMessage);
      console.log(`Upload complete: ${totalWorkloadsSaved} workloads saved`);
      
      if (onUploadComplete) {
        // Pass a minimal object to avoid loading all workloads into memory
        // The MigrationFlow component will load workloads from repository automatically
        onUploadComplete({ count: totalWorkloadsSaved });
      }
    } catch (error) {
      toast.error('Error importing files: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      event.target.value = null;
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.zip"
        multiple
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        disabled={uploading}
      />
      <button
        className="cur-upload-btn"
        onClick={handleButtonClick}
        disabled={uploading}
        title="Upload AWS Cost and Usage Report (CUR) CSV files or ZIP archive"
      >
        {uploading ? (
          <>
            <span className="upload-spinner">⏳</span>
            {uploadProgress && (
              <span className="upload-progress-text">
                {uploadProgress.current}/{uploadProgress.total}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="upload-icon">📊</span>
            Upload CUR
          </>
        )}
      </button>
      {uploadProgress && uploadProgress.currentFile && (
        <div className="cur-upload-progress">
          Processing: {uploadProgress.currentFile}
        </div>
      )}
    </div>
  );
}

export default CurUploadButton;
