/**
 * @file CurUploadButton.refactored.js
 * @description This file contains the refactored version of the CurUploadButton component.
 * The logic for file processing has been extracted into a separate FileUploadManager class
 * to improve modularity, testability, and maintainability.
 */

import React, { useState, useRef, useEffect } from 'react';
import { getContainer } from '../infrastructure/dependency_injection/Container.js';
import { Workload } from '../domain/entities/Workload.js';
import { parseAwsCur, parseAwsBillSimple } from '../utils/awsBomImport.js';
import { parseCSV } from '../utils/csvImport.js';
import { parseAwsCurStreaming } from '../utils/streamingCsvParser.js';
import { toast } from 'react-toastify';
import { agentEventEmitter } from '../agentic/core/AgentEventEmitter.js';
import { agentStatusManager, AgentStatus } from '../agentic/core/AgentStatusManager.js';

// #region FileUploadManager Class
class FileUploadManager {
  constructor(workloadRepository) {
    this.workloadRepository = workloadRepository;
    this.largeFileThreshold = 50 * 1024 * 1024; // 50MB
    this._isProcessing = false; // Guard against concurrent processing
  }

  async processFiles(files, onProgress) {
    // SAFETY: Guard against concurrent processing
    if (this._isProcessing) {
      throw new Error('File processing already in progress. Please wait for current operation to complete.');
    }
    
    this._isProcessing = true;
    const processingStartTime = Date.now();
    const MAX_PROCESSING_TIME_MS = 7200000; // 120 minutes (2 hours) max - allows time for multiple large files
    
    // CRITICAL: Track totalRawCost from CSV parser metadata (correct cost before aggregation)
    let totalRawCost = 0;
    
    // CRITICAL: Save processing state periodically for crash recovery
    const saveCheckpoint = (state) => {
      try {
        const checkpoint = {
          timestamp: Date.now(),
          filesProcessed: state.filesProcessed || 0,
          totalFiles: files.length,
          currentFile: state.currentFile || '',
          totalWorkloadsSaved: state.totalWorkloadsSaved || 0,
          processingStartTime
        };
        localStorage.setItem('fileUploadCheckpoint', JSON.stringify(checkpoint));
      } catch (e) {
        console.warn('[FileUploadManager] Failed to save checkpoint:', e);
      }
    };
    
    // CRITICAL: Add global error handlers to catch crashes
    const originalErrorHandler = window.onerror;
    const originalRejectionHandler = window.onunhandledrejection;
    
    // Define rejection handler in outer scope so it can be removed in finally
    const rejectionHandler = (event) => {
      const errorInfo = {
        timestamp: new Date().toISOString(),
        reason: event.reason?.toString(),
        stack: event.reason?.stack,
        message: event.reason?.message
      };
      console.error('[FileUploadManager] UNHANDLED PROMISE REJECTION:', errorInfo);
      
      // CRITICAL: Save to localStorage in format UI can read (both formats for compatibility)
      try {
        // Save to fileUploadCrashLogs (structured format)
        const existingLogs = JSON.parse(localStorage.getItem('fileUploadCrashLogs') || '[]');
        existingLogs.push(errorInfo);
        if (existingLogs.length > 10) {
          existingLogs.shift();
        }
        localStorage.setItem('fileUploadCrashLogs', JSON.stringify(existingLogs));
        
        // ALSO save to crashLogs (string array format for UI display)
        const existingCrashLogs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
        const logMessage = `[${errorInfo.timestamp}] File Upload Error: ${errorInfo.message || errorInfo.reason || 'Unknown error'}\nStack: ${errorInfo.stack || 'No stack trace'}`;
        existingCrashLogs.push(logMessage);
        if (existingCrashLogs.length > 50) {
          existingCrashLogs.shift();
        }
        localStorage.setItem('crashLogs', JSON.stringify(existingCrashLogs));
        
        // Update UI crash log count if button exists
        try {
          const countEl = document.getElementById('crash-logs-count');
          if (countEl) {
            countEl.textContent = existingCrashLogs.length;
          }
        } catch (e) {
          // Ignore UI update errors
        }
      } catch (e) {
        // Even if structured save fails, try simple string save
        try {
          const simpleLog = `[${new Date().toISOString()}] File Upload Crash: ${String(event.reason)}`;
          const existing = JSON.parse(localStorage.getItem('crashLogs') || '[]');
          existing.push(simpleLog);
          localStorage.setItem('crashLogs', JSON.stringify(existing.slice(-50)));
        } catch (e2) {
          // Last resort - try direct write
          try {
            localStorage.setItem('fileUploadLastError', String(event.reason));
          } catch (e3) {
            // All logging failed - can't do anything
          }
        }
      }
      
      event.preventDefault(); // Prevent default browser error handling
    };
    
    // CRITICAL: Add beforeunload handler to detect browser tab crashes
    const beforeUnloadHandler = (event) => {
      console.warn('[FileUploadManager] Browser tab closing during file upload!');
      saveCheckpoint({
        filesProcessed: 0,
        currentFile: 'UNKNOWN - Browser closing',
        totalWorkloadsSaved: 0
      });
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
    
    try {
      // Set up global error handlers
      window.onerror = (message, source, lineno, colno, error) => {
        const errorInfo = {
          timestamp: new Date().toISOString(),
          message: String(message),
          source: String(source),
          lineno,
          colno,
          stack: error?.stack,
          name: error?.name
        };
        console.error('[FileUploadManager] GLOBAL ERROR:', errorInfo);
        
        // CRITICAL: Save to localStorage in format UI can read
        try {
          // Save to fileUploadCrashLogs (structured format)
          const existingLogs = JSON.parse(localStorage.getItem('fileUploadCrashLogs') || '[]');
          existingLogs.push(errorInfo);
          if (existingLogs.length > 10) {
            existingLogs.shift();
          }
          localStorage.setItem('fileUploadCrashLogs', JSON.stringify(existingLogs));
          
          // ALSO save to crashLogs (string array format for UI display)
          const existingCrashLogs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
          const logMessage = `[${errorInfo.timestamp}] Global Error: ${errorInfo.message}\nSource: ${errorInfo.source}:${errorInfo.lineno}:${errorInfo.colno}\nStack: ${errorInfo.stack || 'No stack trace'}`;
          existingCrashLogs.push(logMessage);
          if (existingCrashLogs.length > 50) {
            existingCrashLogs.shift();
          }
          localStorage.setItem('crashLogs', JSON.stringify(existingCrashLogs));
          
          // Update UI crash log count
          try {
            const countEl = document.getElementById('crash-logs-count');
            if (countEl) {
              countEl.textContent = existingCrashLogs.length;
            }
          } catch (e) {
            // Ignore UI update errors
          }
        } catch (e) {
          // Fallback: try simple string save
          try {
            const simpleLog = `[${new Date().toISOString()}] Global Error: ${String(message)}`;
            const existing = JSON.parse(localStorage.getItem('crashLogs') || '[]');
            existing.push(simpleLog);
            localStorage.setItem('crashLogs', JSON.stringify(existing.slice(-50)));
          } catch (e2) {
            // All logging failed
          }
        }
        
        if (originalErrorHandler) {
          originalErrorHandler(message, source, lineno, colno, error);
        }
        return false; // Don't prevent default handling
      };
      
      window.addEventListener('unhandledrejection', rejectionHandler);
      
      let totalWorkloadsSaved = 0;
      const dedupeMap = new Map();
      const savedDedupeKeys = new Set();

      console.log(`[FileUploadManager] Processing ${files.length} file(s)`);

      for (let i = 0; i < files.length; i++) {
        // SAFETY: Check for timeout
        if (Date.now() - processingStartTime > MAX_PROCESSING_TIME_MS) {
          throw new Error(`File processing exceeded maximum time (${MAX_PROCESSING_TIME_MS}ms). Please try with fewer files.`);
        }
        
        const file = files[i];
        
        // SAFETY: Validate file
        if (!file || !file.name) {
          console.warn(`[FileUploadManager] Skipping invalid file at index ${i}`);
          continue;
        }
        
        console.log(`[FileUploadManager] Processing file ${i + 1}/${files.length}: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
        
        try {
          onProgress({
            current: i + 1,
            total: files.length,
            currentFile: file.name,
            status: `Processing ${file.name}...`,
            percent: Math.round((i / files.length) * 100),
          });
        } catch (progressError) {
          console.warn('[FileUploadManager] Error calling onProgress:', progressError);
          // Continue processing even if progress callback fails
        }

        try {
          // CRITICAL: Save checkpoint before processing each file
          saveCheckpoint({
            filesProcessed: i,
            currentFile: file.name,
            totalWorkloadsSaved
          });
          
          // CRITICAL: Check memory before processing (lowered threshold)
          if (performance.memory) {
            const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
            const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
            const usagePercent = (usedMB / limitMB) * 100;
            if (usagePercent > 85) {
              throw new Error(`Memory usage too high (${usagePercent.toFixed(1)}%). Please close other tabs and try again, or process fewer files at once. Consider processing files individually.`);
            }
            
            // Warn at 75%
            if (usagePercent > 75) {
              console.warn(`[FileUploadManager] Memory usage high (${usagePercent.toFixed(1)}%) before processing file ${i + 1}. Consider processing fewer files.`);
            }
          }
          
          const workloads = await this._processFile(file);
          console.log(`[FileUploadManager] File ${file.name}: Parsed ${workloads.length} workloads`);
          
          // CRITICAL: Preserve totalRawCost from CSV parser metadata (correct cost before aggregation)
          if (workloads._metadata && workloads._metadata.totalRawCost) {
            totalRawCost += workloads._metadata.totalRawCost;
            console.log(`[FileUploadManager] File ${file.name}: totalRawCost = $${workloads._metadata.totalRawCost.toFixed(2)} (cumulative: $${totalRawCost.toFixed(2)})`);
          }
          
          if (workloads.length === 0) {
            console.warn(`[FileUploadManager] WARNING: File ${file.name} produced 0 workloads. Check file format.`);
            console.log(`[FileUploadManager] File size: ${file.size} bytes, type: ${file.type}`);
          }
          
          const { newWorkloads, updatedWorkloads } = await this._deduplicateAndSave(workloads, dedupeMap, savedDedupeKeys, onProgress);
          console.log(`[FileUploadManager] File ${file.name}: Saved ${newWorkloads} new, ${updatedWorkloads} updated workloads`);
          totalWorkloadsSaved += newWorkloads;
          
          // CRITICAL: Clear repository cache after each file to free memory
          // This prevents memory accumulation across multiple large files
          try {
            if (this.workloadRepository._cache) {
              const cacheSizeBefore = this.workloadRepository._cache.size;
              this.workloadRepository._cache.clear();
              console.log(`[FileUploadManager] Cleared repository cache (freed ${cacheSizeBefore.toLocaleString()} workloads from memory)`);
              
              // Force garbage collection hint
              if (global.gc) {
                global.gc();
              } else if (window.gc) {
                window.gc();
              }
            }
          } catch (cacheError) {
            console.warn('[FileUploadManager] Failed to clear cache:', cacheError);
          }
          
          // CRITICAL: Save checkpoint after each file completes
          saveCheckpoint({
            filesProcessed: i + 1,
            currentFile: file.name,
            totalWorkloadsSaved
          });
        } catch (error) {
          console.error(`[FileUploadManager] Error processing ${file.name}:`, error);
          console.error(`[FileUploadManager] Error stack:`, error.stack);
          try {
            toast.error(`Error processing ${file.name}: ${error.message}`);
          } catch (toastError) {
            // Ignore toast errors
          }
          // Continue with next file instead of stopping
        }
      }

      console.log(`[FileUploadManager] Total: ${totalWorkloadsSaved} new workloads saved, ${dedupeMap.size} unique workloads`);
      console.log(`[FileUploadManager] Total raw cost from all files: $${totalRawCost.toFixed(2)}`);
      
      // CRITICAL: Validate totalRawCost is reasonable before returning
      if (totalRawCost > 10000000) { // > $10M per month is suspicious
        console.error(`[FileUploadManager] ERROR: totalRawCost seems very high: $${totalRawCost.toLocaleString()}`);
        console.error(`[FileUploadManager] This may indicate a calculation error. Please verify CSV data.`);
        console.error(`[FileUploadManager] Files processed: ${files.length}`);
        console.error(`[FileUploadManager] Workloads: ${totalWorkloadsSaved} new, ${dedupeMap.size} unique`);
      }

      return {
        totalWorkloadsSaved,
        uniqueWorkloads: dedupeMap.size,
        totalRawCost: totalRawCost, // CRITICAL: Return totalRawCost from CSV parser (correct cost)
      };
    } catch (error) {
      // CRITICAL: Catch any errors that might crash the app
      console.error('[FileUploadManager] FATAL ERROR in processFiles:', error);
      console.error('[FileUploadManager] Error stack:', error?.stack);
      console.error('[FileUploadManager] Error name:', error?.name);
      console.error('[FileUploadManager] Error message:', error?.message);
      
      // Try to show error to user
      try {
        toast.error(`Fatal error during file processing: ${error?.message || 'Unknown error'}. Check console for details.`, { autoClose: 15000 });
      } catch (toastError) {
        console.error('[FileUploadManager] Could not show toast error:', toastError);
      }
      
      throw error; // Re-throw to let caller handle it
    } finally {
      // Restore original error handlers
      if (originalErrorHandler) {
        window.onerror = originalErrorHandler;
      } else {
        window.onerror = null;
      }
      window.removeEventListener('unhandledrejection', rejectionHandler);
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      if (originalRejectionHandler) {
        window.onunhandledrejection = originalRejectionHandler;
      }
      
      // Clear checkpoint on successful completion
      try {
        localStorage.removeItem('fileUploadCheckpoint');
      } catch (e) {
        console.warn('[FileUploadManager] Failed to clear checkpoint:', e);
      }
      
      this._isProcessing = false;
      console.log('[FileUploadManager] Cleanup complete, processing flag reset');
    }
  }

  async _processFile(file) {
    if (file.name.toLowerCase().endsWith('.zip')) {
      return this._processZipFile(file);
    } else if (file.name.toLowerCase().endsWith('.csv')) {
      return this._processCsvFile(file);
    } else {
      console.warn(`Skipping unsupported file: ${file.name}`);
      return [];
    }
  }

  async _processCsvFile(file, awsBomFormat = 'cur') {
    const fileSize = file.size;

    if (fileSize > this.largeFileThreshold) {
      const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1);
      const estimatedMinutes = Math.ceil(fileSizeMB / 100); // Rough estimate: 1 min per 100MB
      toast.info(`Processing large file ${file.name} (${fileSizeMB}MB). Estimated time: ~${estimatedMinutes} minute(s). This may take a while...`, { autoClose: 10000 });
      return parseAwsCurStreaming(file, (progress) => {
        // Log progress for large files
        if (progress && progress.status) {
          console.log(`[FileUploadManager] ${file.name}: ${progress.status}`);
        }
      }, { workloadRepository: this.workloadRepository });
    }

    return new Promise((resolve, reject) => {
      // SAFETY: Add timeout to prevent hanging forever
      const FILE_READ_TIMEOUT_MS = 60000; // 60 seconds max
      const timeoutId = setTimeout(() => {
        reject(new Error(`File read timeout after ${FILE_READ_TIMEOUT_MS}ms. File may be too large or corrupted: ${file.name}`));
      }, FILE_READ_TIMEOUT_MS);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        clearTimeout(timeoutId);
        try {
          const csvText = e.target.result;
          if (!csvText || csvText.length === 0) {
            reject(new Error(`File is empty: ${file.name}`));
            return;
          }
          let importedData = [];
          if (awsBomFormat === 'cur') {
            importedData = parseAwsCur(csvText);
          } else {
            importedData = parseAwsBillSimple(csvText);
          }
          resolve(importedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      reader.onabort = () => {
        clearTimeout(timeoutId);
        reject(new Error(`File read was aborted: ${file.name}`));
      };
      reader.readAsText(file);
    });
  }

  async _processZipFile(file, awsBomFormat = 'cur') {
    const JSZipModule = await import('jszip');
    const JSZip = JSZipModule.default || JSZipModule;
    const zip = await JSZip.loadAsync(file);
    const allData = [];

    for (const relativePath in zip.files) {
      if (!relativePath.toLowerCase().endsWith('.csv')) continue;

      const zipEntry = zip.files[relativePath];
      const blob = await zipEntry.async('blob');
      // Create a File object from the blob to pass to _processCsvFile
      const csvFile = new File([blob], zipEntry.name, { type: 'text/csv' });
      const importedData = await this._processCsvFile(csvFile, awsBomFormat);
      
      // FIX: Avoid stack overflow with large arrays (279K+ items)
      // Spread operator (...) and push.apply() can exceed call stack/argument limits with very large arrays
      // Use a simple loop for very large arrays - this is the safest approach
      if (importedData.length > 10000) {
        // For very large arrays, use a loop to push items one by one or in small batches
        // This avoids any stack overflow or argument limit issues
        const BATCH_SIZE = 1000;
        for (let i = 0; i < importedData.length; i += BATCH_SIZE) {
          const end = Math.min(i + BATCH_SIZE, importedData.length);
          for (let j = i; j < end; j++) {
            allData.push(importedData[j]);
          }
          // Yield to event loop periodically to prevent blocking UI
          if (i % (BATCH_SIZE * 10) === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      } else {
        // For smaller arrays, spread operator is safe and more readable
        allData.push(...importedData);
      }
    }

    return allData;
  }

  async _deduplicateAndSave(workloads, dedupeMap, savedDedupeKeys, onProgress) {
    console.log(`[FileUploadManager] Deduplicating and saving ${workloads.length} workloads...`);
    
    // CRITICAL: Memory-aware workload loading strategy
    // Strategy: Only load from IndexedDB on FIRST file, then use in-memory dedupeMap for subsequent files
    const existingWorkloadMap = new Map();
    const isFirstFile = dedupeMap.size === 0;
    
    // Check memory before loading
    let shouldLoadFromDB = isFirstFile;
    if (performance.memory) {
      const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
      const usagePercent = (usedMB / limitMB) * 100;
      
      if (usagePercent > 70) {
        console.warn(`[FileUploadManager] Memory usage high (${usagePercent.toFixed(1)}%), skipping IndexedDB load. Using in-memory dedupe map only.`);
        shouldLoadFromDB = false;
      }
    }
    
    if (shouldLoadFromDB) {
      // CRITICAL: Clear cache first to avoid double-loading
      if (this.workloadRepository._cache) {
        this.workloadRepository._cache.clear();
      }
      
      onProgress({ status: 'Loading existing workloads from storage...' });
      const existingWorkloads = await this.workloadRepository.findAll();
      for (const workload of existingWorkloads) {
        const dedupeKey = `${workload.id || ''}_${(workload.service || '').trim()}_${(workload.region || '').trim()}`.toLowerCase();
        if (dedupeKey && dedupeKey !== '__') {
          existingWorkloadMap.set(dedupeKey, workload);
          // Also add to dedupeMap for subsequent files
          dedupeMap.set(dedupeKey, workload);
        }
      }
      console.log(`[FileUploadManager] Loaded ${existingWorkloadMap.size} existing workloads from IndexedDB`);
    } else {
      // Use dedupeMap from previous files (already in memory, no IndexedDB load)
      console.log(`[FileUploadManager] Using in-memory dedupe map (${dedupeMap.size} entries) - skipping IndexedDB load to save memory`);
      for (const [key, workload] of dedupeMap.entries()) {
        existingWorkloadMap.set(key, workload);
      }
    }
    
    // Process all workloads in memory first (no async calls in loop)
    const workloadsToSave = [];
    let newWorkloadsCount = 0;
    let updatedWorkloadsCount = 0;
    const BATCH_SIZE = 5000; // Increased from 100 to 5000 for better performance
    
    onProgress({ status: 'Processing workloads...' });
    
    for (let i = 0; i < workloads.length; i++) {
      if (i % 50000 === 0 && i > 0) {
        onProgress({ status: `Processing ${i.toLocaleString()}/${workloads.length.toLocaleString()} workloads...` });
        // Yield to event loop periodically
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      const data = workloads[i];
      const resourceId = String(data.id || '').trim();
      const service = String(data.service || '').trim();
      const region = String(data.region || '').trim();
      const dedupeKey = `${resourceId}_${service}_${region}`.toLowerCase();

      if (!dedupeKey || dedupeKey === '__') {
        continue;
      }

      // Extract monthlyCost properly - handle both number and Money object
      let monthlyCostValue = 0;
      if (data.monthlyCost !== undefined && data.monthlyCost !== null) {
        if (typeof data.monthlyCost === 'object' && 'amount' in data.monthlyCost) {
          monthlyCostValue = parseFloat(data.monthlyCost.amount) || 0;
        } else if (typeof data.monthlyCost === 'object' && '_amount' in data.monthlyCost) {
          monthlyCostValue = parseFloat(data.monthlyCost._amount) || 0;
        } else {
          monthlyCostValue = parseFloat(data.monthlyCost) || 0;
        }
      }

      const existingWorkload = existingWorkloadMap.get(dedupeKey);

      if (existingWorkload) {
        // Extract current cost properly - handle Money object
        let currentCost = 0;
        if (existingWorkload.monthlyCost) {
          if (typeof existingWorkload.monthlyCost === 'object' && 'amount' in existingWorkload.monthlyCost) {
            currentCost = existingWorkload.monthlyCost.amount;
          } else if (typeof existingWorkload.monthlyCost === 'object' && 'value' in existingWorkload.monthlyCost) {
            currentCost = existingWorkload.monthlyCost.value;
          } else if (typeof existingWorkload.monthlyCost === 'number') {
            currentCost = existingWorkload.monthlyCost;
          }
        }
        
        const newCost = currentCost + monthlyCostValue;

        if (Math.abs(newCost - currentCost) > 0.01) {
          const existingData = existingWorkload.toJSON ? existingWorkload.toJSON() : existingWorkload;
          const updatedWorkload = new Workload({ ...existingData, monthlyCost: newCost });
          workloadsToSave.push(updatedWorkload);
          existingWorkloadMap.set(dedupeKey, updatedWorkload); // Update map for subsequent files
          dedupeMap.set(dedupeKey, updatedWorkload); // CRITICAL: Update dedupeMap for subsequent files
          updatedWorkloadsCount++;
          
          // Log first few updates
          if (updatedWorkloadsCount <= 3) {
            console.log(`[UPLOAD] Updated workload ${dedupeKey}:`, {
              currentCost,
              newCostValue: monthlyCostValue,
              totalCost: newCost
            });
          }
        }
      } else {
        try {
          const workloadData = {
            id: dedupeKey,
            name: data.name || resourceId.split('/').pop() || dedupeKey,
            service: data.service || 'EC2',
            type: data.type || 'vm',
            sourceProvider: 'aws',
            cpu: data.cpu || 0,
            memory: data.memory || 0,
            storage: data.storage || 0,
            monthlyCost: monthlyCostValue,
            region: data.region || 'us-east-1',
            os: data.os || 'linux',
            monthlyTraffic: data.monthlyTraffic || 0,
            dependencies: data.dependencies || []
          };
          
          // Log first few to verify costs are being set
          if (newWorkloadsCount <= 5) {
            console.log(`[UPLOAD] Workload ${newWorkloadsCount}:`, {
              id: dedupeKey,
              dataMonthlyCost: data.monthlyCost,
              dataMonthlyCostType: typeof data.monthlyCost,
              extractedValue: monthlyCostValue,
              extractedType: typeof monthlyCostValue,
              workloadData: { ...workloadData, monthlyCost: monthlyCostValue }
            });
          }
          
          const workload = new Workload(workloadData);
          workloadsToSave.push(workload);
          existingWorkloadMap.set(dedupeKey, workload); // Add to map for subsequent files
          dedupeMap.set(dedupeKey, workload); // CRITICAL: Add to dedupeMap for subsequent files
          newWorkloadsCount++;
          
          // Log first few to verify they're being created
          if (newWorkloadsCount <= 3) {
            console.log(`[UPLOAD] Created workload: ${workload.id} (${workload.name})`);
          }
        } catch (error) {
          console.error(`[UPLOAD] Failed to create workload ${dedupeKey}:`, error);
        }
      }
    }
    
    // PERFORMANCE: Batch save all workloads at once instead of individual saves
    console.log(`[FileUploadManager] Saving ${workloadsToSave.length} workloads in batches...`);
    onProgress({ status: `Saving ${workloadsToSave.length.toLocaleString()} workloads...` });
    
    // CRITICAL: Adaptive batch size based on memory usage
    let adaptiveBatchSize = BATCH_SIZE;
    if (performance.memory) {
      const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
      const usagePercent = (usedMB / limitMB) * 100;
      // Reduce batch size if memory is high
      if (usagePercent > 80) {
        adaptiveBatchSize = Math.floor(BATCH_SIZE / 2);
        console.warn(`[FileUploadManager] Memory usage high (${usagePercent.toFixed(1)}%), reducing batch size to ${adaptiveBatchSize}`);
      }
    }
    
    for (let i = 0; i < workloadsToSave.length; i += adaptiveBatchSize) {
      // CRITICAL: Check memory before each batch
      if (performance.memory) {
        const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
        const usagePercent = (usedMB / limitMB) * 100;
        if (usagePercent > 95) {
          throw new Error(`Memory usage critical (${usagePercent.toFixed(1)}%). Aborting save operation to prevent crash.`);
        }
      }
      
      const batch = workloadsToSave.slice(i, i + adaptiveBatchSize);
      onProgress({ status: `Saving batch ${Math.floor(i / adaptiveBatchSize) + 1}/${Math.ceil(workloadsToSave.length / adaptiveBatchSize)}...` });
      
      try {
        // CRITICAL: Wrap IndexedDB operations in try-catch to handle quota errors
        await Promise.all(batch.map(async (workload) => {
          try {
            await this.workloadRepository.save(workload);
          } catch (saveError) {
            // Check for IndexedDB quota errors
            if (saveError.name === 'QuotaExceededError' || saveError.message?.includes('quota')) {
              console.error('[FileUploadManager] IndexedDB quota exceeded!', saveError);
              throw new Error('Browser storage quota exceeded. Please clear browser data or use a different browser.');
            }
            // Re-throw other errors
            throw saveError;
          }
        }));
      } catch (batchError) {
        console.error(`[FileUploadManager] Error saving batch ${Math.floor(i / adaptiveBatchSize) + 1}:`, batchError);
        // CRITICAL: Save error to crash logs in UI-readable format
        try {
          const errorInfo = {
            timestamp: new Date().toISOString(),
            error: 'Batch save failed',
            batchNumber: Math.floor(i / adaptiveBatchSize) + 1,
            message: batchError.message,
            stack: batchError.stack
          };
          
          // Save to structured format
          const existingLogs = JSON.parse(localStorage.getItem('fileUploadCrashLogs') || '[]');
          existingLogs.push(errorInfo);
          localStorage.setItem('fileUploadCrashLogs', JSON.stringify(existingLogs.slice(-10)));
          
          // ALSO save to crashLogs for UI display
          const existingCrashLogs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
          const logMessage = `[${errorInfo.timestamp}] Batch Save Failed (batch ${errorInfo.batchNumber}): ${errorInfo.message}\nStack: ${errorInfo.stack || 'No stack trace'}`;
          existingCrashLogs.push(logMessage);
          if (existingCrashLogs.length > 50) {
            existingCrashLogs.shift();
          }
          localStorage.setItem('crashLogs', JSON.stringify(existingCrashLogs));
          
          // Update UI crash log count
          try {
            const countEl = document.getElementById('crash-logs-count');
            if (countEl) {
              countEl.textContent = existingCrashLogs.length;
            }
          } catch (e) {
            // Ignore UI update errors
          }
        } catch (e) {
          // Fallback: try simple string save
          try {
            const simpleLog = `[${new Date().toISOString()}] Batch Save Error: ${String(batchError)}`;
            const existing = JSON.parse(localStorage.getItem('crashLogs') || '[]');
            existing.push(simpleLog);
            localStorage.setItem('crashLogs', JSON.stringify(existing.slice(-50)));
          } catch (e2) {
            // All logging failed
          }
        }
        throw batchError;
      }
      
      // Yield to event loop every batch
      if (i + adaptiveBatchSize < workloadsToSave.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // Force final persistence with error handling
    try {
      await this.workloadRepository._forcePersist?.();
    } catch (persistError) {
      console.error('[FileUploadManager] Error during final persistence:', persistError);
      if (persistError.name === 'QuotaExceededError' || persistError.message?.includes('quota')) {
        throw new Error('Browser storage quota exceeded during final save. Some data may not be persisted.');
      }
      // Continue even if persistence fails - data is already saved
    }

    return { newWorkloads: newWorkloadsCount, updatedWorkloads: updatedWorkloadsCount };
  }
}
// #endregion

function CurUploadButton({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);
  const container = getContainer();
  const workloadRepository = container.workloadRepository;
  
  // CRITICAL: Check for crash logs and checkpoints on mount - display in UI, not just console
  useEffect(() => {
    try {
      const checkpoint = localStorage.getItem('fileUploadCheckpoint');
      const crashLogs = localStorage.getItem('fileUploadCrashLogs');
      const csvCrashState = localStorage.getItem('csvParserCrashState');
      const uiCrashLogs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
      
      if (checkpoint || crashLogs || csvCrashState || uiCrashLogs.length > 0) {
        // Build user-friendly crash message
        let crashMessage = '⚠️ Previous upload session may have crashed.\n\n';
        
        if (checkpoint) {
          try {
            const cp = JSON.parse(checkpoint);
            const timeAgo = Math.round((Date.now() - cp.timestamp) / 1000 / 60);
            crashMessage += `Checkpoint: ${cp.filesProcessed}/${cp.totalFiles} files processed ${timeAgo} minutes ago.\nLast file: ${cp.currentFile}\n\n`;
          } catch (e) {
            crashMessage += 'Checkpoint data found (unable to parse).\n\n';
          }
        }
        
        if (csvCrashState) {
          try {
            const state = JSON.parse(csvCrashState);
            crashMessage += `CSV Parser Error: ${state.error}\nProcessed ${state.lineNumber?.toLocaleString() || 0} lines before crash.\n\n`;
          } catch (e) {
            crashMessage += 'CSV parser crash state found.\n\n';
          }
        }
        
        if (uiCrashLogs.length > 0) {
          crashMessage += `Found ${uiCrashLogs.length} crash log(s). Click "📋 View Crash Logs" button (top-right) to see details.`;
        }
        
        // Show in toast (visible in UI)
        toast.error(crashMessage, { 
          autoClose: 15000,
          style: { whiteSpace: 'pre-line', maxWidth: '500px' }
        });
        
        // Update crash log count in UI
        try {
          const countEl = document.getElementById('crash-logs-count');
          if (countEl) {
            countEl.textContent = uiCrashLogs.length;
            // Make button visible if it exists
            const button = document.getElementById('view-crash-logs-btn');
            if (button && uiCrashLogs.length > 0) {
              button.style.display = 'block';
            }
          }
        } catch (e) {
          // Ignore UI update errors
        }
      }
    } catch (e) {
      // Even if parsing fails, try to show something
      try {
        toast.error('Error checking crash logs. Check localStorage manually.', { autoClose: 5000 });
      } catch (e2) {
        // Can't show toast either
      }
    }
  }, []);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length, currentFile: '', percent: 0 });

    const fileUploadManager = new FileUploadManager(workloadRepository);

    try {
      const { totalWorkloadsSaved, uniqueWorkloads, totalRawCost } = await fileUploadManager.processFiles(files, (progress) => {
        setUploadProgress(prev => ({ ...prev, ...progress }));
      });

      // CRITICAL: Force persistence to IndexedDB before completing upload
      console.log(`[UPLOAD] Processing complete. Forcing persistence to IndexedDB...`);
      console.log(`[UPLOAD] Expected: ${uniqueWorkloads} unique workloads, ${totalWorkloadsSaved} new workloads saved`);
      
      // Update progress during persistence
      setUploadProgress(prev => ({ ...prev, status: 'Saving to database...', percent: 90 }));
      
      // Force persistence multiple times to ensure it completes
      for (let i = 0; i < 3; i++) {
        if (typeof workloadRepository._forcePersist === 'function') {
          console.log(`[UPLOAD] Starting forced persistence attempt ${i + 1}/3...`);
          await workloadRepository._forcePersist();
          console.log(`[UPLOAD] Forced persistence attempt ${i + 1}/3 completed`);
          setUploadProgress(prev => ({ ...prev, status: `Saving to database... (${i + 1}/3)`, percent: 90 + (i + 1) * 3 }));
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Update progress during verification
      setUploadProgress(prev => ({ ...prev, status: 'Verifying saved workloads...', percent: 98 }));
      
      // Reload from storage to verify workloads are saved
      if (typeof workloadRepository._loadFromStorage === 'function') {
        console.log('[UPLOAD] Reloading from IndexedDB...');
        await workloadRepository._loadFromStorage();
        console.log('[UPLOAD] Reloaded from IndexedDB');
      }
      
      // Verify workloads are actually in the repository
      console.log('[UPLOAD] Verifying workloads in repository...');
      const verifyWorkloads = await workloadRepository.findAll();
      console.log(`[UPLOAD] Verified ${verifyWorkloads.length} workloads in repository (expected: ${uniqueWorkloads})`);
      
      if (verifyWorkloads.length === 0) {
        console.error('[UPLOAD] ERROR: No workloads found in repository after upload!');
        console.error('[UPLOAD] Check IndexedDB in DevTools: Application → IndexedDB → WorkloadRepository → workloads');
        console.error('[UPLOAD] Repository cache size:', workloadRepository._cache?.size || 'unknown');
        toast.error('Files processed but no workloads found in repository. Please check console for errors.', { autoClose: 10000 });
        return;
      }
      
      if (verifyWorkloads.length < uniqueWorkloads * 0.9) {
        console.warn(`[UPLOAD] WARNING: Only ${verifyWorkloads.length} workloads found, expected ~${uniqueWorkloads}`);
      }

      const summaryMessage = `Successfully imported ${totalWorkloadsSaved} new workloads (${verifyWorkloads.length} total unique workloads).`;
      toast.success(summaryMessage);

      if (onUploadComplete) {
        onUploadComplete({
          count: totalWorkloadsSaved,
          summary: {
            uniqueWorkloads: verifyWorkloads.length, // Use verified count
            workloadsSaved: totalWorkloadsSaved,
            totalMonthlyCost: totalRawCost > 0 ? totalRawCost : undefined, // CRITICAL: Use totalRawCost from CSV parser (correct cost)
            totalRawCost: totalRawCost > 0 ? totalRawCost : undefined, // Also include as totalRawCost for reference
          },
          files: files,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
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
        {uploading ? 'Uploading...' : 'Upload CUR'}
      </button>
      {uploading && uploadProgress && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{uploadProgress.status || 'Processing...'}</div>
          {uploadProgress.currentFile && (
            <div style={{ fontSize: '0.9em', color: '#6c757d', marginBottom: '5px' }}>
              File: {uploadProgress.currentFile}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, backgroundColor: '#e9ecef', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  backgroundColor: '#007bff', 
                  height: '100%', 
                  width: `${uploadProgress.percent || 0}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <span style={{ fontSize: '0.9em', fontWeight: 'bold', minWidth: '50px' }}>
              {uploadProgress.percent || 0}%
            </span>
          </div>
          {uploadProgress.linesProcessed && (
            <div style={{ fontSize: '0.8em', color: '#6c757d', marginTop: '5px' }}>
              Lines: {uploadProgress.linesProcessed.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CurUploadButton;
