/**
 * @file CurUploadButton.refactored.js
 * @description This file contains the refactored version of the CurUploadButton component.
 * The logic for file processing has been extracted into a separate FileUploadManager class
 * to improve modularity, testability, and maintainability.
 */

import React, { useState, useRef } from 'react';
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
    const MAX_PROCESSING_TIME_MS = 1800000; // 30 minutes max
    
    try {
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
          const workloads = await this._processFile(file);
          console.log(`[FileUploadManager] File ${file.name}: Parsed ${workloads.length} workloads`);
          
          if (workloads.length === 0) {
            console.warn(`[FileUploadManager] WARNING: File ${file.name} produced 0 workloads. Check file format.`);
            console.log(`[FileUploadManager] File size: ${file.size} bytes, type: ${file.type}`);
          }
          
          const { newWorkloads, updatedWorkloads } = await this._deduplicateAndSave(workloads, dedupeMap, savedDedupeKeys, onProgress);
          console.log(`[FileUploadManager] File ${file.name}: Saved ${newWorkloads} new, ${updatedWorkloads} updated workloads`);
          totalWorkloadsSaved += newWorkloads;
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

      return {
        totalWorkloadsSaved,
        uniqueWorkloads: dedupeMap.size,
      };
    } finally {
      this._isProcessing = false;
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
      toast.info(`Processing large file ${file.name} (${(fileSize / 1024 / 1024).toFixed(1)}MB) using streaming parser...`);
      return parseAwsCurStreaming(file, () => {});
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
    
    // PERFORMANCE: Load ALL existing workloads into memory at once (one call instead of 279K+ calls)
    onProgress({ status: 'Loading existing workloads...' });
    const existingWorkloads = await this.workloadRepository.findAll();
    const existingWorkloadMap = new Map();
    for (const workload of existingWorkloads) {
      const dedupeKey = `${workload.id || ''}_${(workload.service || '').trim()}_${(workload.region || '').trim()}`.toLowerCase();
      if (dedupeKey && dedupeKey !== '__') {
        existingWorkloadMap.set(dedupeKey, workload);
      }
    }
    console.log(`[FileUploadManager] Loaded ${existingWorkloadMap.size} existing workloads into memory`);
    
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
    
    for (let i = 0; i < workloadsToSave.length; i += BATCH_SIZE) {
      const batch = workloadsToSave.slice(i, i + BATCH_SIZE);
      onProgress({ status: `Saving batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(workloadsToSave.length / BATCH_SIZE)}...` });
      
      // Save batch in parallel (IndexedDB handles concurrent writes well)
      await Promise.all(batch.map(workload => this.workloadRepository.save(workload)));
      
      // Yield to event loop every batch
      if (i + BATCH_SIZE < workloadsToSave.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // Force final persistence
    await this.workloadRepository._forcePersist?.();

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

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length, currentFile: '', percent: 0 });

    const fileUploadManager = new FileUploadManager(workloadRepository);

    try {
      const { totalWorkloadsSaved, uniqueWorkloads } = await fileUploadManager.processFiles(files, (progress) => {
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
        <div>
          <p>{uploadProgress.status}</p>
          <p>{uploadProgress.currentFile}</p>
          <p>{uploadProgress.percent}%</p>
        </div>
      )}
    </div>
  );
}

export default CurUploadButton;
