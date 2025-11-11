import React, { useState, useEffect } from 'react';

function WavePlanner({ workloads }) {
  const [waves, setWaves] = useState([]);
  const [selectedWave, setSelectedWave] = useState(null);
  const [autoGenerating, setAutoGenerating] = useState(false);

  // Auto-generate migration waves based on workload dependencies and complexity
  const autoGenerateWaves = () => {
    setAutoGenerating(true);

    if (!workloads || workloads.length === 0) {
      alert('No workloads discovered. Please add workloads first.');
      setAutoGenerating(false);
      return;
    }

    // Group workloads by dependency complexity and type
    const workloadsCopy = [...workloads];
    const generatedWaves = [];

    // Wave 1: Low-risk, independent workloads (no dependencies, storage, simple VMs)
    const wave1Workloads = workloadsCopy.filter(w =>
      !w.dependencies || w.dependencies.trim() === '' || w.type === 'storage'
    );
    if (wave1Workloads.length > 0) {
      generatedWaves.push({
        id: Date.now() + 1,
        name: 'Wave 1: Pilot / Low-Risk Workloads',
        description: 'Independent workloads with minimal dependencies, ideal for pilot migration',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
        endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 weeks
        workloads: wave1Workloads,
        status: 'planned',
        risks: ['Team learning curve', 'Tooling setup'],
        milestones: ['Complete infrastructure setup', 'Migrate first workload', 'Validate monitoring'],
      });
    }

    // Wave 2: Database and data workloads
    const wave2Workloads = workloadsCopy.filter(w =>
      w.type === 'database' && !wave1Workloads.includes(w)
    );
    if (wave2Workloads.length > 0) {
      generatedWaves.push({
        id: Date.now() + 2,
        name: 'Wave 2: Data Layer Migration',
        description: 'Database and data infrastructure workloads',
        startDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 weeks
        endDate: new Date(Date.now() + 63 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 9 weeks
        workloads: wave2Workloads,
        status: 'planned',
        risks: ['Data migration complexity', 'Downtime requirements', 'Data integrity validation'],
        milestones: ['Complete data replication setup', 'Test data migration', 'Cutover databases'],
      });
    }

    // Wave 3: Application servers with dependencies
    const wave3Workloads = workloadsCopy.filter(w =>
      (w.type === 'application' || w.type === 'vm') &&
      w.dependencies && w.dependencies.trim() !== '' &&
      !wave1Workloads.includes(w) && !wave2Workloads.includes(w)
    );
    if (wave3Workloads.length > 0) {
      generatedWaves.push({
        id: Date.now() + 3,
        name: 'Wave 3: Application Workloads',
        description: 'Application servers and dependent workloads',
        startDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 weeks
        endDate: new Date(Date.now() + 98 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 weeks
        workloads: wave3Workloads,
        status: 'planned',
        risks: ['Application dependencies', 'Integration testing', 'Performance validation'],
        milestones: ['Migrate core applications', 'Complete integration testing', 'User acceptance testing'],
      });
    }

    // Wave 4: Containerized and modernization candidates
    const wave4Workloads = workloadsCopy.filter(w =>
      w.type === 'container' && !wave1Workloads.includes(w) && !wave2Workloads.includes(w) && !wave3Workloads.includes(w)
    );
    if (wave4Workloads.length > 0) {
      generatedWaves.push({
        id: Date.now() + 4,
        name: 'Wave 4: Containerized Workloads',
        description: 'Container-based applications and services',
        startDate: new Date(Date.now() + 105 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 weeks
        endDate: new Date(Date.now() + 126 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 18 weeks
        workloads: wave4Workloads,
        status: 'planned',
        risks: ['Container orchestration', 'Service mesh setup', 'CI/CD pipeline migration'],
        milestones: ['Setup GKE cluster', 'Migrate container workloads', 'Configure auto-scaling'],
      });
    }

    // Catch any remaining workloads
    const allWaveWorkloads = [...wave1Workloads, ...wave2Workloads, ...wave3Workloads, ...wave4Workloads];
    const remainingWorkloads = workloadsCopy.filter(w => !allWaveWorkloads.includes(w));

    if (remainingWorkloads.length > 0) {
      generatedWaves.push({
        id: Date.now() + 5,
        name: 'Wave 5: Remaining Workloads',
        description: 'Additional workloads and optimization',
        startDate: new Date(Date.now() + 133 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 19 weeks
        endDate: new Date(Date.now() + 154 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 22 weeks
        workloads: remainingWorkloads,
        status: 'planned',
        risks: ['Complex dependencies', 'Legacy application challenges'],
        milestones: ['Complete migration', 'Decommission on-premise', 'Optimize cloud resources'],
      });
    }

    setWaves(generatedWaves);
    setAutoGenerating(false);
  };

  const addWave = () => {
    const newWave = {
      id: Date.now(),
      name: `Wave ${waves.length + 1}`,
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      workloads: [],
      status: 'planned',
      risks: [],
      milestones: [],
    };
    setWaves([...waves, newWave]);
    setSelectedWave(newWave.id);
  };

  const updateWave = (waveId, field, value) => {
    setWaves(waves.map(w => w.id === waveId ? { ...w, [field]: value } : w));
  };

  const deleteWave = (waveId) => {
    if (window.confirm('Delete this wave?')) {
      setWaves(waves.filter(w => w.id !== waveId));
      if (selectedWave === waveId) setSelectedWave(null);
    }
  };

  const addWorkloadToWave = (waveId, workload) => {
    setWaves(waves.map(w => {
      if (w.id === waveId && !w.workloads.find(wl => wl.id === workload.id)) {
        return { ...w, workloads: [...w.workloads, workload] };
      }
      return w;
    }));
  };

  const removeWorkloadFromWave = (waveId, workloadId) => {
    setWaves(waves.map(w => {
      if (w.id === waveId) {
        return { ...w, workloads: w.workloads.filter(wl => wl.id !== workloadId) };
      }
      return w;
    }));
  };

  const getWaveProgress = (wave) => {
    if (wave.status === 'completed') return 100;
    if (wave.status === 'in-progress') return 50;
    return 0;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'primary';
      case 'at-risk': return 'warning';
      case 'blocked': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-header bg-primary text-white">
        <h3 className="mb-0">📅 Migration Wave Planning</h3>
        <small>Organize workload migration into sequential waves</small>
      </div>
      <div className="card-body">
        {/* Actions */}
        <div className="d-flex gap-2 mb-4">
          <button className="btn btn-success" onClick={autoGenerateWaves} disabled={autoGenerating}>
            {autoGenerating ? 'Generating...' : '✨ Auto-Generate Waves'}
          </button>
          <button className="btn btn-outline-primary" onClick={addWave}>
            ➕ Add Wave Manually
          </button>
        </div>

        {/* Timeline Visualization */}
        {waves.length > 0 && (
          <div className="mb-4">
            <h5>Migration Timeline</h5>
            <div className="timeline-container" style={{ position: 'relative', padding: '20px 0' }}>
              {waves.map((wave, index) => {
                const progress = getWaveProgress(wave);
                const startDate = new Date(wave.startDate);
                const endDate = new Date(wave.endDate);
                const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

                return (
                  <div key={wave.id} className="mb-3">
                    <div className="d-flex align-items-center mb-1">
                      <span className={`badge bg-${getStatusColor(wave.status)} me-2`}>
                        {wave.status.replace('-', ' ').toUpperCase()}
                      </span>
                      <strong>{wave.name}</strong>
                      <span className="text-muted ms-2" style={{ fontSize: '0.9em' }}>
                        ({wave.startDate} → {wave.endDate} | {duration} days)
                      </span>
                    </div>
                    <div className="progress" style={{ height: '30px', cursor: 'pointer' }} onClick={() => setSelectedWave(wave.id)}>
                      <div
                        className={`progress-bar bg-${getStatusColor(wave.status)}`}
                        style={{ width: `${progress}%` }}
                      >
                        {wave.workloads.length} workloads
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Wave Details */}
        {waves.length > 0 && (
          <div className="row">
            <div className="col-md-4">
              <h5>Waves</h5>
              <div className="list-group">
                {waves.map(wave => (
                  <button
                    key={wave.id}
                    className={`list-group-item list-group-item-action ${selectedWave === wave.id ? 'active' : ''}`}
                    onClick={() => setSelectedWave(wave.id)}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{wave.name}</strong>
                        <br />
                        <small>{wave.workloads.length} workloads</small>
                      </div>
                      <span className={`badge bg-${getStatusColor(wave.status)}`}>
                        {wave.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="col-md-8">
              {selectedWave && (() => {
                const wave = waves.find(w => w.id === selectedWave);
                return wave ? (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5>Wave Details</h5>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteWave(wave.id)}>
                        Delete Wave
                      </button>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Wave Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={wave.name}
                        onChange={(e) => updateWave(wave.id, 'name', e.target.value)}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={wave.description}
                        onChange={(e) => updateWave(wave.id, 'description', e.target.value)}
                      />
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-4">
                        <label className="form-label">Start Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={wave.startDate}
                          onChange={(e) => updateWave(wave.id, 'startDate', e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">End Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={wave.endDate}
                          onChange={(e) => updateWave(wave.id, 'endDate', e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Status</label>
                        <select
                          className="form-select"
                          value={wave.status}
                          onChange={(e) => updateWave(wave.id, 'status', e.target.value)}
                        >
                          <option value="planned">Planned</option>
                          <option value="in-progress">In Progress</option>
                          <option value="at-risk">At Risk</option>
                          <option value="blocked">Blocked</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Workloads in this Wave ({wave.workloads.length})</label>
                      {wave.workloads.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Resources</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {wave.workloads.map(wl => (
                                <tr key={wl.id}>
                                  <td>{wl.name}</td>
                                  <td><span className="badge bg-secondary">{wl.type}</span></td>
                                  <td>{wl.cpu}c / {wl.memory}GB</td>
                                  <td>
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => removeWorkloadFromWave(wave.id, wl.id)}
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-muted">No workloads assigned to this wave yet.</p>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Add Workload to Wave</label>
                      <select
                        className="form-select"
                        onChange={(e) => {
                          const workload = workloads.find(w => w.id === parseInt(e.target.value));
                          if (workload) {
                            addWorkloadToWave(wave.id, workload);
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="">Select a workload...</option>
                        {workloads.filter(w => !wave.workloads.find(wl => wl.id === w.id)).map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="alert alert-info">
                      <strong>📊 Wave Statistics:</strong>
                      <ul className="mb-0 mt-2">
                        <li>Total CPU: {wave.workloads.reduce((sum, w) => sum + (parseInt(w.cpu) || 0), 0)} cores</li>
                        <li>Total Memory: {wave.workloads.reduce((sum, w) => sum + (parseInt(w.memory) || 0), 0)} GB</li>
                        <li>Total Storage: {wave.workloads.reduce((sum, w) => sum + (parseInt(w.storage) || 0), 0)} GB</li>
                        <li>Duration: {Math.ceil((new Date(wave.endDate) - new Date(wave.startDate)) / (1000 * 60 * 60 * 24))} days</li>
                      </ul>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        )}

        {waves.length === 0 && (
          <div className="alert alert-info">
            <strong>No migration waves planned yet.</strong>
            <p className="mb-0">Use "Auto-Generate Waves" to create a recommended migration plan, or add waves manually.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WavePlanner;
