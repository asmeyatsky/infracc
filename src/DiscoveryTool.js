import React, { useState } from 'react';
import { parseCSV, downloadCSVTemplate, exportWorkloadsToCSV } from './utils/csvImport';
import { getAllAwsServices, getAllAzureServices } from './utils/serviceMapping';

function DiscoveryTool({ onAnalysisComplete, sourceCloud = 'aws', onSourceCloudChange }) {
  const [discoveryMethod, setDiscoveryMethod] = useState('manual');
  const [workloads, setWorkloads] = useState([]);
  const [currentWorkload, setCurrentWorkload] = useState({
    name: '',
    service: '', // AWS/Azure service name
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

  const handleInputChange = (e) => {
    setCurrentWorkload({
      ...currentWorkload,
      [e.target.name]: e.target.value,
    });
  };

  const addWorkload = () => {
    if (currentWorkload.name.trim()) {
      setWorkloads([...workloads, { ...currentWorkload, id: Date.now() }]);
      setCurrentWorkload({
        name: '',
        type: 'vm',
        os: 'linux',
        cpu: 0,
        memory: 0,
        storage: 0,
        monthlyTraffic: 0,
        dependencies: '',
      });
    }
  };

  const removeWorkload = (id) => {
    setWorkloads(workloads.filter(w => w.id !== id));
  };

  const handleAnalysis = () => {
    // Pass discovered workloads to parent component
    if (onAnalysisComplete) {
      onAnalysisComplete(workloads);
    }
  };

  const handleCSVImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const importedWorkloads = parseCSV(csvText);
          setWorkloads([...workloads, ...importedWorkloads]);
          alert(`Successfully imported ${importedWorkloads.length} workloads!`);
        } catch (error) {
          alert('Error importing CSV: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = null;
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
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 0 0-2.915 15.452c-.07-.633-.134-1.606.027-2.297.145-.624.938-3.977.938-3.977s-.239-.479-.239-1.187c0-1.113.645-1.943 1.448-1.943.682 0 1.012.512 1.012 1.127 0 .686-.437 1.712-.663 2.66-.188.796.4 1.446.985 1.446 1.183 0 2.09-1.244 2.09-3.04 0-1.593-1.13-2.707-2.748-2.707-1.87 0-2.966 1.403-2.966 2.853 0 .544.21 1.128.475 1.444a.28.28 0 0 1 .03.259l-.229.934c-.033.137-.107.17-.246.103-.923-.429-1.5-1.781-1.5-2.867 0-2.344 1.703-4.497 4.91-4.497 2.583 0 4.59 1.838 4.59 4.294 0 2.566-1.617 4.625-3.858 4.625-.753 0-1.462-.39-1.705-1.062l-.467 1.777c-.165.633-.614 1.424-.914 1.907A8 8 0 0 0 8 0"/>
              </svg>
              AWS
            </button>
            <button
              type="button"
              className={`btn ${sourceCloud === 'azure' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => onSourceCloudChange && onSourceCloudChange('azure')}
              style={{ fontWeight: 'bold' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                <path d="M6.429 9.75h2.739v2.739h-2.739zm-2.739-2.739h2.739v2.739H3.69zm-2.739-2.739h2.739v2.739H.951zm2.739-2.739h2.739v2.739H3.69zm2.739-2.739h2.739v2.739H6.429zm2.739-2.739h2.739v2.739H9.168zm2.739-2.739h2.739v2.739h-2.739zm2.739-2.739h2.739v2.739h-2.739z"/>
              </svg>
              Azure
            </button>
          </div>
        </div>

        {/* Discovery Method Selection */}
        <div className="mb-4">
          <label className="form-label fw-bold">Discovery Method</label>
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${discoveryMethod === 'manual' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setDiscoveryMethod('manual')}
            >
              Manual Entry
            </button>
            <label className={`btn ${discoveryMethod === 'csv' ? 'btn-primary' : 'btn-outline-primary'} mb-0`}>
              📁 CSV Import
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                style={{ display: 'none' }}
              />
            </label>
            <button
              type="button"
              className={`btn ${discoveryMethod === 'api' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setDiscoveryMethod('api')}
            >
              {sourceCloud === 'aws' ? '☁️ AWS API Import' : '☁️ Azure API Import'}
            </button>
          </div>
        </div>

        {/* API Import */}
        {discoveryMethod === 'api' && (
          <div className="alert alert-info">
            <h5>Cloud API Import</h5>
            <p>Import workloads directly from your {sourceCloud.toUpperCase()} account:</p>
            <ul>
              <li><strong>AWS:</strong> Configure AWS credentials to discover EC2, RDS, S3, Lambda, and more</li>
              <li><strong>Azure:</strong> Configure Azure credentials to discover VMs, SQL Databases, Blob Storage, and more</li>
            </ul>
            <div className="mt-3">
              <button className="btn btn-outline-primary me-2" disabled>
                Configure {sourceCloud === 'aws' ? 'AWS' : 'Azure'} Credentials
              </button>
              <small className="text-muted">(Coming Soon - Use CSV import or manual entry for now)</small>
            </div>
          </div>
        )}

        {/* Manual Entry Form */}
        {discoveryMethod === 'manual' && (
          <div>
            <h5 className="mb-3">Add {sourceCloud.toUpperCase()} Workload</h5>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Workload Name *</label>
                <input
                  type="text"
                  className="form-control"
                  name="name"
                  value={currentWorkload.name}
                  onChange={handleInputChange}
                  placeholder={`e.g., ${sourceCloud === 'aws' ? 'EC2 Instance' : 'VM'} - web-server-01`}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">{sourceCloud === 'aws' ? 'AWS' : 'Azure'} Service *</label>
                <select
                  className="form-select"
                  name="service"
                  value={currentWorkload.service}
                  onChange={handleInputChange}
                >
                  <option value="">Select Service...</option>
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
                  <option value="application">Application Server</option>
                  <option value="container">Container</option>
                  <option value="function">Function/Serverless</option>
                </select>
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Operating System</label>
                <select
                  className="form-select"
                  name="os"
                  value={currentWorkload.os}
                  onChange={handleInputChange}
                >
                  <option value="linux">Linux</option>
                  <option value="windows">Windows</option>
                  <option value="other">Other</option>
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
                  placeholder={sourceCloud === 'aws' ? 'us-east-1' : 'eastus'}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-3 mb-3">
                <label className="form-label">CPUs (cores)</label>
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
            </div>

            <button className="btn btn-success" onClick={addWorkload}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-plus-circle me-2" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
              Add Workload
            </button>
          </div>
        )}

        {/* Discovered Workloads List */}
        {workloads.length > 0 && (
          <div className="mt-4">
            <h5 className="mb-3">Discovered Workloads ({workloads.length})</h5>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Service</th>
                    <th>Type</th>
                    <th>OS</th>
                    <th>CPU</th>
                    <th>Memory</th>
                    <th>Storage</th>
                    <th>Cost/Mo</th>
                    <th>Region</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workloads.map((workload) => (
                    <tr key={workload.id}>
                      <td>{workload.name}</td>
                      <td><span className="badge bg-info">{workload.service || 'N/A'}</span></td>
                      <td><span className="badge bg-secondary">{workload.type}</span></td>
                      <td>{workload.os}</td>
                      <td>{workload.cpu} cores</td>
                      <td>{workload.memory} GB</td>
                      <td>{workload.storage} GB</td>
                      <td>${(workload.monthlyCost || 0).toFixed(2)}</td>
                      <td>{workload.region || 'N/A'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => removeWorkload(workload.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="d-grid gap-2">
              <button className="btn btn-primary btn-lg" onClick={handleAnalysis}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-graph-up me-2" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M0 0h1v15h15v1H0V0Zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07Z"/>
                </svg>
                Analyze
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiscoveryTool;
