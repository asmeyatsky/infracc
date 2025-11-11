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
            let csvText = null;
            try {
              csvText = await csvFile.entry.async('string');
              
              if (awsBomFormat === 'cur') {
                importedData = parseAwsCur(csvText);
              } else {
                importedData = parseAwsBillSimple(csvText);
              }
            } catch (awsError) {
              console.warn(`AWS BOM parsing failed for ${csvFile.name}, trying standard CSV:`, awsError);
              if (csvText) {
                importedData = parseCSV(csvText);
              } else {
                throw awsError; // Re-throw if we don't have csvText
              }
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

          // Track which dedupe keys are NEW from this file (before deduplication)
          const newKeysThisFile = new Set();
          
          // Process file data in chunks to prevent stack overflow
          const chunkSize = 1000;
          for (let chunkStart = 0; chunkStart < fileData.length; chunkStart += chunkSize) {
            const chunk = fileData.slice(chunkStart, chunkStart + chunkSize);
            
            // Deduplicate chunk against existing dedupeMap
            for (const data of chunk) {
              // Normalize dedupe key
              const resourceId = String(data.id || '').trim();
              const service = String(data.service || '').trim();
              const region = String(data.region || '').trim();
              const dedupeKey = `${resourceId}_${service}_${region}`.toLowerCase();
              
              if (!dedupeKey || dedupeKey === '__') {
                continue; // Skip invalid entries
              }
              
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
                // New workload - track that this is new from this file
                dedupeMap.set(dedupeKey, { 
                  ...data,
                  id: resourceId, // Ensure ID is normalized
                  service: service, // Ensure service is normalized
                  region: region, // Ensure region is normalized
                  sourceFiles: file.name ? [file.name] : []
                });
                newKeysThisFile.add(dedupeKey);
              }
            }
            
            // Yield to event loop every chunk to prevent blocking
            if (chunkStart + chunkSize < fileData.length) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
          
          console.log(`File ${file.name}: ${fileData.length} rows -> ${newKeysThisFile.size} new unique workloads, ${fileData.length - newKeysThisFile.size} duplicates`);

          console.log(`Processed ${file.name}: ${fileData.length} rows -> ${dedupeMap.size} unique workloads so far`);

          // Save deduplicated workloads incrementally (process in batches)
          setUploadProgress({
            current: processedCount + 1,
            total: files.length,
            currentFile: file.name,
            status: `Saving workloads from ${file.name}...`
          });

          // Process only NEW entries from THIS FILE that we haven't saved yet
          // This ensures we don't reprocess workloads from previous files
          const dedupeEntries = Array.from(dedupeMap.entries())
            .filter(([dedupeKey]) => newKeysThisFile.has(dedupeKey) && !savedDedupeKeys.has(dedupeKey));
          
          if (dedupeEntries.length === 0) {
            console.log(`No new workloads to save from ${file.name} (all duplicates or already saved)`);
            processedCount++;
            continue;
          }
          
          let newWorkloadsCount = 0;
          let updatedWorkloadsCount = 0;
          let alreadyExistsCount = 0;
          let skippedCount = 0;
          
          console.log(`Processing ${dedupeEntries.length} new entries from ${file.name} (${dedupeMap.size} total in dedupeMap, ${savedDedupeKeys.size} already saved)`);
          
          for (let i = 0; i < dedupeEntries.length; i += batchSize) {
            const batch = dedupeEntries.slice(i, i + batchSize);
            
            // Process batch sequentially to avoid stack overflow
            for (const [dedupeKey, data] of batch) {
              try {
                // Normalize values for lookup
                const lookupResourceId = String(data.id || '').trim();
                const lookupService = String(data.service || '').trim();
                const lookupRegion = String(data.region || '').trim();
                
                // Always check repository first (it might have been saved from a previous file)
                const existingWorkload = await workloadRepository.findByDedupeKey(
                  lookupResourceId,
                  lookupService,
                  lookupRegion
                );

                if (existingWorkload) {
                  // Workload already exists in repository - don't create duplicate
                  alreadyExistsCount++;
                  savedDedupeKeys.add(dedupeKey); // Mark as saved
                  
                  // Optionally update cost if needed (but don't count as new)
                  const currentCost = existingWorkload.monthlyCost.value || 0;
                  const newCost = currentCost + (data.monthlyCost || 0);
                  
                  if (Math.abs(newCost - currentCost) > 0.01) {
                    const updatedWorkload = new Workload({
                      id: existingWorkload.id,
                      name: existingWorkload.name,
                      service: existingWorkload.service,
                      type: existingWorkload.type.value,
                      sourceProvider: existingWorkload.sourceProvider.type,
                      cpu: existingWorkload.cpu,
                      memory: existingWorkload.memory,
                      storage: Math.max(existingWorkload.storage, data.storage || 0),
                      monthlyCost: newCost,
                      region: existingWorkload.region,
                      os: existingWorkload.os,
                      monthlyTraffic: existingWorkload.monthlyTraffic,
                      dependencies: existingWorkload.dependencies,
                      awsInstanceType: existingWorkload.awsInstanceType || data.awsInstanceType,
                      awsProductCode: existingWorkload.awsProductCode || data.awsProductCode,
                    });
                    
                    await workloadRepository.delete(existingWorkload.id);
                    await workloadRepository.save(updatedWorkload);
                    updatedWorkloadsCount++;
                  }
                } else {
                  // New workload - create and save
                  const workload = new Workload({
                    ...data,
                    sourceProvider: 'aws',
                    dependencies: data.dependencies 
                      ? (Array.isArray(data.dependencies) ? data.dependencies : data.dependencies.split(',').map(d => d.trim()))
                      : []
                  });
                  
                  await workloadRepository.save(workload);
                  savedDedupeKeys.add(dedupeKey);
                  newWorkloadsCount++;
                }
              } catch (error) {
                console.warn(`Failed to process workload ${data.id}:`, error);
                skippedCount++;
              }
            }
            
            // Yield to event loop every batch to prevent blocking
            if (i + batchSize < dedupeEntries.length) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
          
          totalWorkloadsSaved += newWorkloadsCount; // Only count NEW workloads, not updates
          console.log(`File ${file.name} summary:`);
          console.log(`  - New workloads saved: ${newWorkloadsCount}`);
          console.log(`  - Existing workloads updated: ${updatedWorkloadsCount}`);
          console.log(`  - Already existed (skipped): ${alreadyExistsCount}`);
          console.log(`  - Failed/skipped: ${skippedCount}`);
          console.log(`  - Total unique in dedupeMap: ${dedupeMap.size}`);
          console.log(`  - Total saved so far: ${savedDedupeKeys.size}`);

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

      // Final verification - check actual repository count
      const allWorkloadsInRepo = await workloadRepository.findAll();
      const actualUniqueCount = allWorkloadsInRepo.length;
      const deduplicatedCount = dedupeMap.size;
      
      console.log(`\n=== FINAL DEDUPLICATION SUMMARY ===`);
      console.log(`Total rows processed: ${totalRowsProcessed}`);
      console.log(`Total files processed: ${files.length}`);
      console.log(`Unique workloads in dedupeMap: ${deduplicatedCount}`);
      console.log(`Duplicates merged: ${totalDuplicatesRemoved}`);
      console.log(`Workloads saved to repository: ${totalWorkloadsSaved}`);
      console.log(`Actual workloads in repository: ${actualUniqueCount}`);
      console.log(`=====================================\n`);
      
      if (actualUniqueCount !== deduplicatedCount) {
        console.warn(`⚠️ WARNING: Repository count (${actualUniqueCount}) doesn't match dedupeMap count (${deduplicatedCount})`);
        console.warn(`This suggests some workloads may not have been saved or were duplicated`);
      }

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
