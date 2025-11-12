/**
 * Enhanced Discovery Tool Component
 * 
 * Architectural Intent:
 * - Presentation layer component (UI only)
 * - Uses domain entities (Workload)
 * - Uses use cases for business operations
 * - Clean separation of concerns
 */

import React, { useState, useEffect } from 'react';
import { getContainer } from '../../infrastructure/dependency_injection/Container.js';
import { Workload } from '../../domain/entities/Workload.js';
import { CloudProvider, CloudProviderType } from '../../domain/value_objects/CloudProvider.js';
import { WorkloadType, WorkloadTypeEnum } from '../../domain/value_objects/WorkloadType.js';
import { parseCSV, downloadCSVTemplate } from '../../utils/csvImport.js';
import { parseAwsCur, parseAwsBillSimple } from '../../utils/awsBomImport.js';
import { getAllAwsServices, getAllAzureServices } from '../../utils/serviceMapping.js';

/**
 * Enhanced Discovery Tool Component
 * 
 * Uses Clean Architecture:
 * - Creates domain entities (Workload)
 * - Uses repository for persistence
 * - No business logic in component
 */
function EnhancedDiscoveryTool({ onAnalysisComplete, sourceCloud = 'aws', onSourceCloudChange }) {
  const [discoveryMethod, setDiscoveryMethod] = useState('csv'); // Default to CSV Import for file uploads
  const [awsBomFormat, setAwsBomFormat] = useState('cur'); // 'cur' or 'simple'
  const [workloads, setWorkloads] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);

  // Debug: Log when component renders
  useEffect(() => {
    console.log('EnhancedDiscoveryTool rendered, discoveryMethod:', discoveryMethod);
  }, [discoveryMethod]);
  const [currentWorkload, setCurrentWorkload] = useState({
    name: '',
    service: '',
    type: 'vm',
    os: 'linux',
    cpu: 0,
    memory: 0,
    storage: 0,
    monthlyTraffic: 0,
    dependencies: '',
    region: 'us-east-1',
    monthlyCost: 0,
  });

  // Get dependencies from container
  const container = getContainer();
  const workloadRepository = container.workloadRepository;

  // Load existing workloads
  useEffect(() => {
    const loadWorkloads = async () => {
      try {
        const allWorkloads = await workloadRepository.findAll();
        const filteredWorkloads = allWorkloads.filter(
          w => w.sourceProvider.type === sourceCloud
        );
        setWorkloads(filteredWorkloads);
      } catch (error) {
        console.error('Error loading workloads:', error);
      }
    };

    loadWorkloads();
  }, [sourceCloud, workloadRepository]);

  const handleInputChange = (e) => {
    setCurrentWorkload({
      ...currentWorkload,
      [e.target.name]: e.target.value,
    });
  };

  /**
   * Add workload using domain entity
   */
  const addWorkload = async () => {
    if (!currentWorkload.name.trim()) {
      alert('Workload name is required');
      return;
    }

    try {
      // Create domain entity
      const workload = new Workload({
        name: currentWorkload.name,
        service: currentWorkload.service,
        type: currentWorkload.type,
        sourceProvider: sourceCloud,
        cpu: parseFloat(currentWorkload.cpu) || 0,
        memory: parseFloat(currentWorkload.memory) || 0,
        storage: parseFloat(currentWorkload.storage) || 0,
        monthlyCost: parseFloat(currentWorkload.monthlyCost) || 0,
        region: currentWorkload.region,
        os: currentWorkload.os,
        monthlyTraffic: parseFloat(currentWorkload.monthlyTraffic) || 0,
        dependencies: currentWorkload.dependencies
          ? currentWorkload.dependencies.split(',').map(d => d.trim())
          : []
      });

      // Save to repository
      await workloadRepository.save(workload);

      // Update UI
      setWorkloads([...workloads, workload]);
      setCurrentWorkload({
        name: '',
        service: '',
        type: 'vm',
        os: 'linux',
        cpu: 0,
        memory: 0,
        storage: 0,
        monthlyTraffic: 0,
        dependencies: '',
        region: 'us-east-1',
        monthlyCost: 0,
      });
    } catch (error) {
      console.error('Error adding workload:', error);
      alert(`Error adding workload: ${error.message}`);
    }
  };

  /**
   * Remove workload using repository
   */
  const removeWorkload = async (id) => {
    try {
      await workloadRepository.delete(id);
      setWorkloads(workloads.filter(w => w.id !== id));
    } catch (error) {
      console.error('Error removing workload:', error);
      alert(`Error removing workload: ${error.message}`);
    }
  };

  /**
   * Handle analysis completion
   */
  const handleAnalysis = async () => {
    if (workloads.length === 0) {
      alert('Please add at least one workload');
      return;
    }

    // Convert domain entities to plain objects for parent component
    const workloadsData = workloads.map(w => w.toJSON());

    if (onAnalysisComplete) {
      onAnalysisComplete(workloadsData);
    }
  };

  /**
   * Process a single CSV file
   */
  const processCSVFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvText = e.target.result;
          let importedData = [];

          // Try AWS BOM formats first if source is AWS
          if (sourceCloud === 'aws') {
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
          } else {
            // Standard CSV for non-AWS or fallback
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
   */
  const processZipFile = async (file) => {
    try {
      // Dynamic import of JSZip (if available)
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
      for (const csvFile of csvFiles) {
        try {
          const csvText = await csvFile.entry.async('string');
          let importedData = [];

          // Try AWS BOM formats first if source is AWS
          if (sourceCloud === 'aws') {
            try {
              if (awsBomFormat === 'cur') {
                importedData = parseAwsCur(csvText);
              } else {
                importedData = parseAwsBillSimple(csvText);
              }
            } catch (awsError) {
              console.warn(`AWS BOM parsing failed for ${csvFile.name}, trying standard CSV:`, awsError);
              importedData = parseCSV(csvText);
            }
          } else {
            importedData = parseCSV(csvText);
          }

          allData.push(...importedData);
        } catch (error) {
          console.warn(`Error processing ${csvFile.name} from ZIP:`, error);
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
   * Handle CSV import (supports multiple files and ZIP archives)
   */
  const handleCSVImport = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setImporting(true);
    setImportProgress({ current: 0, total: files.length, currentFile: '' });

    try {
      let allImportedData = [];
      let processedCount = 0;

      for (const file of files) {
        setImportProgress({
          current: processedCount + 1,
          total: files.length,
          currentFile: file.name
        });

        try {
          let fileData = [];

          // Check if it's a ZIP file
          if (file.name.toLowerCase().endsWith('.zip')) {
            fileData = await processZipFile(file);
          } else if (file.name.toLowerCase().endsWith('.csv')) {
            fileData = await processCSVFile(file);
          } else {
            console.warn(`Skipping unsupported file: ${file.name}`);
            continue;
          }

          allImportedData.push(...fileData);
          processedCount++;
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          // Continue with other files
        }
      }

      if (allImportedData.length === 0) {
        alert('No valid data found in uploaded files');
        setImporting(false);
        setImportProgress(null);
        event.target.value = null;
        return;
      }

      // Convert to domain entities
      setImportProgress({ ...importProgress, status: 'Creating workloads...' });
      const importedWorkloads = await Promise.all(
        allImportedData.map(async (data) => {
          try {
            const workload = new Workload({
              ...data,
              sourceProvider: sourceCloud,
              dependencies: data.dependencies 
                ? (Array.isArray(data.dependencies) ? data.dependencies : data.dependencies.split(',').map(d => d.trim()))
                : []
            });
            
            // Save to repository
            await workloadRepository.save(workload);
            return workload;
          } catch (error) {
            console.warn('Failed to create workload from CSV:', error);
            return null;
          }
        })
      );

      const validWorkloads = importedWorkloads.filter(w => w !== null);
      setWorkloads([...workloads, ...validWorkloads]);
      alert(`Successfully imported ${validWorkloads.length} workloads from ${processedCount} file(s)!`);
    } catch (error) {
      alert('Error importing files: ' + error.message);
    } finally {
      setImporting(false);
      setImportProgress(null);
      event.target.value = null;
    }
  };

  const getServiceOptions = () => {
    return sourceCloud === 'aws' ? getAllAwsServices() : getAllAzureServices();
  };

  return (
    <div className="card mb-4">
      <div className="card-header bg-info text-white">
        <h3 className="mb-0">🔍 Cloud Workload Discovery Tool</h3>
        <small>Discover and inventory your {sourceCloud.toUpperCase()} workloads for GCP migration</small>
      </div>
      <div className="card-body">
        {/* Source Cloud Selection */}
        <div className="mb-4">
          <label className="form-label fw-bold">Source Cloud Platform</label>
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${sourceCloud === 'aws' ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={() => onSourceCloudChange && onSourceCloudChange('aws')}
              style={{ fontWeight: 'bold' }}
            >
              AWS
            </button>
            <button
              type="button"
              className={`btn ${sourceCloud === 'azure' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => onSourceCloudChange && onSourceCloudChange('azure')}
              style={{ fontWeight: 'bold' }}
            >
              Azure
            </button>
          </div>
        </div>

        {/* File Upload Section - Always Visible */}
        <div className="card mb-4 border-primary">
          <div className="card-header bg-primary text-white">
            <h4 className="mb-0">📁 Upload CSV Files or ZIP Archive</h4>
          </div>
          <div className="card-body">
            {sourceCloud === 'aws' && (
              <div className="mb-3">
                <label className="form-label fw-bold">AWS Bill Format</label>
                <div className="btn-group w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${awsBomFormat === 'cur' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setAwsBomFormat('cur')}
                  >
                    AWS CUR (Cost & Usage Report)
                  </button>
                  <button
                    type="button"
                    className={`btn ${awsBomFormat === 'simple' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setAwsBomFormat('simple')}
                  >
                    Simplified AWS Bill
                  </button>
                  <button
                    type="button"
                    className={`btn ${awsBomFormat === 'standard' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setAwsBomFormat('standard')}
                  >
                    Standard CSV
                  </button>
                </div>
              </div>
            )}
            <div className="mb-3">
              <label className="form-label fw-bold">Upload CSV File(s) or ZIP Archive</label>
              <input
                type="file"
                className="form-control form-control-lg"
                accept=".csv,.zip"
                multiple
                onChange={handleCSVImport}
                disabled={importing}
                style={{ fontSize: '1rem', padding: '0.75rem' }}
              />
              <small className="form-text text-muted d-block mt-2">
                {sourceCloud === 'aws' && awsBomFormat === 'cur' && 
                  'Upload AWS Cost and Usage Report (CUR) CSV export(s) or ZIP archive containing CSV files'}
                {sourceCloud === 'aws' && awsBomFormat === 'simple' && 
                  'Upload simplified AWS bill CSV(s) or ZIP archive. Columns: Service, Resource ID, Instance Type, Region, Monthly Cost'}
                {sourceCloud === 'aws' && awsBomFormat === 'standard' && 
                  'Upload standard CSV file(s) or ZIP archive. Columns: name, type, cpu, memory, storage, monthlyCost'}
                {sourceCloud !== 'aws' && 
                  'Upload CSV file(s) or ZIP archive. Columns: name, type, cpu, memory, storage, monthlyCost'}
                <br />
                <strong className="text-primary">💡 You can select multiple CSV files or upload a ZIP file containing multiple CSVs.</strong>
              </small>
              {importing && importProgress && (
                <div className="mt-3">
                  <div className="progress" style={{ height: '30px' }}>
                    <div 
                      className="progress-bar progress-bar-striped progress-bar-animated" 
                      role="progressbar"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    >
                      {importProgress.current} / {importProgress.total}
                    </div>
                  </div>
                  <small className="text-muted d-block mt-2">
                    Processing: <strong>{importProgress.currentFile}</strong>
                    {importProgress.status && ` - ${importProgress.status}`}
                  </small>
                </div>
              )}
            </div>
            <div className="btn-group">
              {sourceCloud === 'aws' && awsBomFormat !== 'standard' ? (
                <button
                  className="btn btn-outline-secondary"
                  onClick={downloadAwsBomTemplate}
                >
                  Download AWS BOM Template
                </button>
              ) : (
                <button
                  className="btn btn-outline-secondary"
                  onClick={downloadCSVTemplate}
                >
                  Download CSV Template
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Discovery Method */}
        <div className="mb-4">
          <label className="form-label fw-bold">Or Add Workloads Manually</label>
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${discoveryMethod === 'manual' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setDiscoveryMethod('manual')}
            >
              Manual Entry
            </button>
            <button
              type="button"
              className={`btn ${discoveryMethod === 'csv' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setDiscoveryMethod('csv')}
            >
              CSV Import Details
            </button>
          </div>
        </div>

        {discoveryMethod === 'manual' && (
          <div className="card mb-4">
            <div className="card-header">Add Workload</div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Workload Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={currentWorkload.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Cloud Service</label>
                  <select
                    className="form-select"
                    name="service"
                    value={currentWorkload.service}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Service</option>
                    {getServiceOptions().map(service => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Type</label>
                  <select
                    className="form-select"
                    name="type"
                    value={currentWorkload.type}
                    onChange={handleInputChange}
                  >
                    <option value="vm">Virtual Machine</option>
                    <option value="database">Database</option>
                    <option value="storage">Storage</option>
                    <option value="application">Application</option>
                    <option value="container">Container</option>
                    <option value="function">Serverless Function</option>
                  </select>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">OS</label>
                  <select
                    className="form-select"
                    name="os"
                    value={currentWorkload.os}
                    onChange={handleInputChange}
                  >
                    <option value="linux">Linux</option>
                    <option value="windows">Windows</option>
                  </select>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Region</label>
                  <input
                    type="text"
                    className="form-control"
                    name="region"
                    value={currentWorkload.region}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-3 mb-3">
                  <label className="form-label">CPU Cores</label>
                  <input
                    type="number"
                    className="form-control"
                    name="cpu"
                    value={currentWorkload.cpu}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Memory (GB)</label>
                  <input
                    type="number"
                    className="form-control"
                    name="memory"
                    value={currentWorkload.memory}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Storage (GB)</label>
                  <input
                    type="number"
                    className="form-control"
                    name="storage"
                    value={currentWorkload.storage}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Monthly Cost ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    name="monthlyCost"
                    value={currentWorkload.monthlyCost}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Monthly Traffic (GB)</label>
                  <input
                    type="number"
                    className="form-control"
                    name="monthlyTraffic"
                    value={currentWorkload.monthlyTraffic}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Dependencies (comma-separated IDs)</label>
                  <input
                    type="text"
                    className="form-control"
                    name="dependencies"
                    value={currentWorkload.dependencies}
                    onChange={handleInputChange}
                    placeholder="workload1, workload2"
                  />
                </div>
              </div>

              <button className="btn btn-primary" onClick={addWorkload}>
                Add Workload
              </button>
            </div>
          </div>
        )}

        {discoveryMethod === 'csv' && (
          <div className="card mb-4">
            <div className="card-header">CSV Import</div>
            <div className="card-body">
              {sourceCloud === 'aws' && (
                <div className="mb-3">
                  <label className="form-label fw-bold">AWS Bill Format</label>
                  <div className="btn-group w-100" role="group">
                    <button
                      type="button"
                      className={`btn ${awsBomFormat === 'cur' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setAwsBomFormat('cur')}
                    >
                      AWS CUR (Cost & Usage Report)
                    </button>
                    <button
                      type="button"
                      className={`btn ${awsBomFormat === 'simple' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setAwsBomFormat('simple')}
                    >
                      Simplified AWS Bill
                    </button>
                    <button
                      type="button"
                      className={`btn ${awsBomFormat === 'standard' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setAwsBomFormat('standard')}
                    >
                      Standard CSV
                    </button>
                  </div>
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">Upload CSV File(s) or ZIP Archive</label>
                <input
                  type="file"
                  className="form-control"
                  accept=".csv,.zip"
                  multiple
                  onChange={handleCSVImport}
                  disabled={importing}
                />
                <small className="form-text text-muted">
                  {sourceCloud === 'aws' && awsBomFormat === 'cur' && 
                    'Upload AWS Cost and Usage Report (CUR) CSV export(s) or ZIP archive containing CSV files'}
                  {sourceCloud === 'aws' && awsBomFormat === 'simple' && 
                    'Upload simplified AWS bill CSV(s) or ZIP archive. Columns: Service, Resource ID, Instance Type, Region, Monthly Cost'}
                  {sourceCloud === 'aws' && awsBomFormat === 'standard' && 
                    'Upload standard CSV file(s) or ZIP archive. Columns: name, type, cpu, memory, storage, monthlyCost'}
                  {sourceCloud !== 'aws' && 
                    'Upload CSV file(s) or ZIP archive. Columns: name, type, cpu, memory, storage, monthlyCost'}
                  <br />
                  <strong>You can select multiple CSV files or upload a ZIP file containing multiple CSVs.</strong>
                </small>
                {importing && importProgress && (
                  <div className="mt-2">
                    <div className="progress">
                      <div 
                        className="progress-bar progress-bar-striped progress-bar-animated" 
                        role="progressbar"
                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                      >
                        {importProgress.current} / {importProgress.total}
                      </div>
                    </div>
                    <small className="text-muted d-block mt-1">
                      Processing: {importProgress.currentFile}
                      {importProgress.status && ` - ${importProgress.status}`}
                    </small>
                  </div>
                )}
              </div>
              <div className="btn-group">
                {sourceCloud === 'aws' && awsBomFormat !== 'standard' ? (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={downloadAwsBomTemplate}
                  >
                    Download AWS BOM Template
                  </button>
                ) : (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={downloadCSVTemplate}
                  >
                    Download CSV Template
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workloads Summary */}
        <div className="card">
          <div className="card-header">
            Discovered Workloads ({workloads.length.toLocaleString()})
          </div>
          <div className="card-body">
            {workloads.length === 0 ? (
              <p className="text-muted">No workloads discovered yet. Add workloads above.</p>
            ) : (
              <>
                <div className="alert alert-success">
                  <i className="bi bi-check-circle me-2"></i>
                  <strong>{workloads.length.toLocaleString()} workloads</strong> discovered successfully.
                  <br />
                  <small className="text-muted">Detailed workload information available in PDF report. UI rendering disabled for performance with large workload counts.</small>
                </div>
                <div className="mt-3">
                  <button
                    className="btn btn-success btn-lg"
                    onClick={handleAnalysis}
                  >
                    Complete Discovery & Analyze
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnhancedDiscoveryTool;
