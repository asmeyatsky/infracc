import React, { useState } from 'react';
import { parseCSV, downloadCSVTemplate, exportWorkloadsToCSV } from './utils/csvImport';

function DiscoveryTool({ onDiscoveryComplete }) {
  const [discoveryMethod, setDiscoveryMethod] = useState('manual');
  const [workloads, setWorkloads] = useState([]);
  const [currentWorkload, setCurrentWorkload] = useState({
    name: '',
    type: 'vm',
    os: 'linux',
    cpu: 0,
    memory: 0,
    storage: 0,
    monthlyTraffic: 0,
    dependencies: '',
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

  const analyzeWorkloads = () => {
    // Pass discovered workloads to parent component
    if (onDiscoveryComplete) {
      onDiscoveryComplete(workloads);
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

  return (
    <div className="card mb-4">
      <div className="card-header bg-info text-white">
        <h3 className="mb-0">🔍 Infrastructure Discovery Tool</h3>
        <small>Inventory your existing workloads for migration planning</small>
      </div>
      <div className="card-body">
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
              className={`btn ${discoveryMethod === 'agent' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setDiscoveryMethod('agent')}
              disabled
            >
              Agentless Scan (Coming Soon)
            </button>
          </div>
        </div>

        {/* Manual Entry Form */}
        {discoveryMethod === 'manual' && (
          <div>
            <h5 className="mb-3">Add Workload</h5>
            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="form-label">Workload Name *</label>
                <input
                  type="text"
                  className="form-control"
                  name="name"
                  value={currentWorkload.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Web Server 01"
                />
              </div>
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

            <div className="mb-3">
              <label className="form-label">Dependencies (optional)</label>
              <input
                type="text"
                className="form-control"
                name="dependencies"
                value={currentWorkload.dependencies}
                onChange={handleInputChange}
                placeholder="e.g., Database Server, Load Balancer"
              />
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
                    <th>Type</th>
                    <th>OS</th>
                    <th>CPU</th>
                    <th>Memory</th>
                    <th>Storage</th>
                    <th>Traffic</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workloads.map((workload) => (
                    <tr key={workload.id}>
                      <td>{workload.name}</td>
                      <td><span className="badge bg-secondary">{workload.type}</span></td>
                      <td>{workload.os}</td>
                      <td>{workload.cpu} cores</td>
                      <td>{workload.memory} GB</td>
                      <td>{workload.storage} GB</td>
                      <td>{workload.monthlyTraffic} GB/mo</td>
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
              <button className="btn btn-primary btn-lg" onClick={analyzeWorkloads}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-graph-up me-2" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M0 0h1v15h15v1H0V0Zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07Z"/>
                </svg>
                Analyze & Generate Migration Strategy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiscoveryTool;
