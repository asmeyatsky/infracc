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
  }

  async processFiles(files, onProgress) {
    let totalWorkloadsSaved = 0;
    const dedupeMap = new Map();
    const savedDedupeKeys = new Set();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress({
        current: i + 1,
        total: files.length,
        currentFile: file.name,
        status: `Processing ${file.name}...`,
        percent: Math.round((i / files.length) * 100),
      });

      try {
        const workloads = await this._processFile(file);
        const { newWorkloads, updatedWorkloads } = await this._deduplicateAndSave(workloads, dedupeMap, savedDedupeKeys, onProgress);
        totalWorkloadsSaved += newWorkloads;
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        toast.error(`Error processing ${file.name}: ${error.message}`);
      }
    }

    return {
      totalWorkloadsSaved,
      uniqueWorkloads: dedupeMap.size,
    };
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
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvText = e.target.result;
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
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
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
      allData.push(...importedData);
    }

    return allData;
  }

  async _deduplicateAndSave(workloads, dedupeMap, savedDedupeKeys, onProgress) {
    let newWorkloadsCount = 0;
    let updatedWorkloadsCount = 0;
    const batchSize = 100;

    for (let i = 0; i < workloads.length; i += batchSize) {
      const batch = workloads.slice(i, i + batchSize);
      onProgress({ status: `Deduplicating and saving batch ${Math.floor(i / batchSize) + 1}...` });

      for (const data of batch) {
        const resourceId = String(data.id || '').trim();
        const service = String(data.service || '').trim();
        const region = String(data.region || '').trim();
        const dedupeKey = `${resourceId}_${service}_${region}`.toLowerCase();

        if (!dedupeKey || dedupeKey === '__') continue;

        const existingWorkload = await this.workloadRepository.findById(dedupeKey);

        if (existingWorkload) {
          const currentCost = existingWorkload.monthlyCost.value || 0;
          const newCost = currentCost + (data.monthlyCost || 0);

          if (Math.abs(newCost - currentCost) > 0.01) {
            const updatedWorkload = new Workload({ ...existingWorkload.toJSON(), monthlyCost: newCost });
            await this.workloadRepository.save(updatedWorkload);
            updatedWorkloadsCount++;
          }
        } else {
          const workload = new Workload({ ...data, id: dedupeKey, sourceProvider: 'aws' });
          await this.workloadRepository.save(workload);
          newWorkloadsCount++;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to event loop
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

      const summaryMessage = `Successfully imported ${totalWorkloadsSaved} new workloads (${uniqueWorkloads} total unique workloads).`;
      toast.success(summaryMessage);

      if (onUploadComplete) {
        onUploadComplete({
          count: totalWorkloadsSaved,
          summary: {
            uniqueWorkloads: uniqueWorkloads,
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
