/**
 * Migration Strategy Planner
 * Advanced planning tool for cloud migration
 */

import React, { useState } from 'react';

const MigrationStrategyPlanner = ({ workloads, onStrategyPlan }) => {
  const [strategy, setStrategy] = useState({
    approach: 'liftAndShift', // liftAndShift, rePlatform, reArchitect, retire, retain
    timeline: 12,
    waves: [
      {
        id: 1,
        name: 'Wave 1: Foundation',
        applications: [],
        timeline: 3,
        priority: 'high',
        dependencies: []
      }
    ],
    riskLevel: 'medium',
    budget: 0,
    successMetrics: []
  });

  const [newWave, setNewWave] = useState({
    name: '',
    timeline: 3,
    priority: 'medium'
  });

  const approachOptions = [
    { value: 'liftAndShift', label: 'Lift & Shift', description: 'Move applications with minimal changes' },
    { value: 'rePlatform', label: 'Re-platform', description: 'Move applications with minor optimizations' },
    { value: 'reArchitect', label: 'Re-architect', description: 'Redesign applications for cloud native' },
    { value: 'retire', label: 'Retire', description: 'Retire unnecessary applications' },
    { value: 'retain', label: 'Retain', description: 'Keep on-premise for specific reasons' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  const riskOptions = [
    { value: 'low', label: 'Low Risk', color: 'bg-success' },
    { value: 'medium', label: 'Medium Risk', color: 'bg-warning' },
    { value: 'high', label: 'High Risk', color: 'bg-danger' }
  ];

  const addWave = () => {
    if (newWave.name.trim()) {
      const wave = {
        id: Date.now(),
        ...newWave,
        applications: [],
        dependencies: []
      };
      setStrategy({
        ...strategy,
        waves: [...strategy.waves, wave]
      });
      setNewWave({ name: '', timeline: 3, priority: 'medium' });
    }
  };

  const removeWave = (waveId) => {
    setStrategy({
      ...strategy,
      waves: strategy.waves.filter(wave => wave.id !== waveId)
    });
  };

  const assignApplication = (workloadId, waveId) => {
    setStrategy({
      ...strategy,
      waves: strategy.waves.map(wave => 
        wave.id === waveId 
          ? { ...wave, applications: [...wave.applications, workloadId] }
          : wave
      )
    });
  };

  const removeApplication = (workloadId, waveId) => {
    setStrategy({
      ...strategy,
      waves: strategy.waves.map(wave => 
        wave.id === waveId 
          ? { ...wave, applications: wave.applications.filter(id => id !== workloadId) }
          : wave
      )
    });
  };

  const handleStrategyChange = (field, value) => {
    setStrategy({
      ...strategy,
      [field]: value
    });
  };

  const calculateTotalTimeline = () => {
    return strategy.waves.reduce((total, wave) => total + wave.timeline, 0);
  };

  const calculateRiskScore = () => {
    // Simple risk calculation based on various factors
    let riskScore = 50; // Base risk score
    
    if (strategy.approach === 'reArchitect') riskScore += 30;
    if (strategy.approach === 'liftAndShift') riskScore += 10;
    if (strategy.riskLevel === 'high') riskScore += 20;
    if (strategy.riskLevel === 'low') riskScore -= 20;
    
    return Math.min(100, Math.max(0, riskScore));
  };

  return (
    <div className="migration-strategy-planner">
      <div className="strategy-header">
        <h3>🏗️ Migration Strategy Planner</h3>
        <p>Plan your cloud migration approach and timeline</p>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">
              <h5>Migration Approach</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Select Approach</label>
                <select
                  className="form-control"
                  value={strategy.approach}
                  onChange={(e) => handleStrategyChange('approach', e.target.value)}
                >
                  {approachOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="approach-info">
                {approachOptions.find(opt => opt.value === strategy.approach)?.description}
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-header">
              <h5>Risk Assessment</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Risk Level</label>
                <select
                  className="form-control"
                  value={strategy.riskLevel}
                  onChange={(e) => handleStrategyChange('riskLevel', e.target.value)}
                >
                  {riskOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="risk-score">
                <div className="score-meter">
                  <div 
                    className="score-fill" 
                    style={{ width: `${calculateRiskScore()}%` }}
                  ></div>
                </div>
                <div className="score-text">
                  Risk Score: {calculateRiskScore()}/100
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">
              <h5>Project Timeline & Budget</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Total Timeline (months)</label>
                <input
                  type="number"
                  className="form-control"
                  value={strategy.timeline}
                  onChange={(e) => handleStrategyChange('timeline', parseInt(e.target.value))}
                  min="6"
                  max="60"
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label">Budget ($)</label>
                <input
                  type="number"
                  className="form-control"
                  value={strategy.budget}
                  onChange={(e) => handleStrategyChange('budget', parseFloat(e.target.value))}
                  placeholder="0"
                />
              </div>
              
              <div className="timeline-summary">
                <div className="summary-item">
                  <span>Planned Timeline: {calculateTotalTimeline()} months</span>
                </div>
                <div className="summary-item">
                  <span>Estimated Completion: {new Date(Date.now() + calculateTotalTimeline() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5>Success Metrics</h5>
            </div>
            <div className="card-body">
              <div className="success-metrics">
                <div className="form-check mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="metric-cost"
                    defaultChecked
                  />
                  <label className="form-check-label" htmlFor="metric-cost">
                    Cost Optimization (Target: 20-30% reduction)
                  </label>
                </div>
                <div className="form-check mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="metric-performance"
                    defaultChecked
                  />
                  <label className="form-check-label" htmlFor="metric-performance">
                    Performance Improvement (Target: 15-25%)
                  </label>
                </div>
                <div className="form-check mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="metric-reliability"
                    defaultChecked
                  />
                  <label className="form-check-label" htmlFor="metric-reliability">
                    Reliability (Target: 99.9% uptime)
                  </label>
                </div>
                <div className="form-check mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="metric-security"
                  />
                  <label className="form-check-label" htmlFor="metric-security">
                    Security Posture Improvement
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Waves Section */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5>Migration Waves</h5>
          <button 
            className="btn btn-sm btn-primary"
            data-bs-toggle="modal"
            data-bs-target="#addWaveModal"
          >
            + Add Wave
          </button>
        </div>
        <div className="card-body">
          {strategy.waves.map(wave => (
            <div key={wave.id} className="wave-card mb-3 p-3 border rounded">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6>{wave.name} <span className="badge bg-info">{wave.timeline} months</span></h6>
                <button 
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => removeWave(wave.id)}
                >
                  Remove
                </button>
              </div>
              
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-2">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-control form-control-sm"
                      value={wave.priority}
                      onChange={(e) => {
                        const updatedWaves = strategy.waves.map(w => 
                          w.id === wave.id ? { ...w, priority: e.target.value } : w
                        );
                        setStrategy({ ...strategy, waves: updatedWaves });
                      }}
                    >
                      {priorityOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="assigned-apps">
                <h6>Assigned Applications ({wave.applications.length})</h6>
                {wave.applications.length > 0 ? (
                  <div className="apps-list">
                    {workloads
                      .filter(w => wave.applications.includes(w.id))
                      .map(workload => (
                        <span 
                          key={workload.id}
                          className="badge bg-light text-dark me-2 mb-2 d-inline-flex align-items-center"
                        >
                          {workload.name}
                          <button 
                            className="btn-close btn-close-white ms-2"
                            style={{ fontSize: '0.6rem' }}
                            onClick={() => removeApplication(workload.id, wave.id)}
                          ></button>
                        </span>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted">No applications assigned</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Applications Assignment */}
      {workloads && workloads.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h5>Assign Applications to Waves</h5>
          </div>
          <div className="card-body">
            <div className="row">
              {workloads.map(workload => (
                <div key={workload.id} className="col-md-6 col-lg-4 mb-3">
                  <div className="application-card p-3 border rounded">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="mb-1">{workload.name}</h6>
                        <small className="text-muted">{workload.type}</small>
                      </div>
                      <select
                        className="form-select form-select-sm"
                        value=""
                        onChange={(e) => assignApplication(workload.id, e.target.value)}
                      >
                        <option value="">Assign to Wave...</option>
                        {strategy.waves.map(wave => (
                          <option key={wave.id} value={wave.id}>{wave.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-2">
                      <span className="badge bg-secondary me-1">{workload.os}</span>
                      <span className="badge bg-info me-1">{workload.cpu} vCPU</span>
                      <span className="badge bg-info">{workload.memory} GB</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Wave Modal */}
      <div className="modal fade" id="addWaveModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Migration Wave</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Wave Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newWave.name}
                  onChange={(e) => setNewWave({...newWave, name: e.target.value})}
                  placeholder="e.g., Critical Systems, Non-critical, etc."
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Timeline (months)</label>
                <input
                  type="number"
                  className="form-control"
                  value={newWave.timeline}
                  onChange={(e) => setNewWave({...newWave, timeline: parseInt(e.target.value)})}
                  min="1"
                  max="24"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Priority</label>
                <select
                  className="form-control"
                  value={newWave.priority}
                  onChange={(e) => setNewWave({...newWave, priority: e.target.value})}
                >
                  {priorityOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-primary" onClick={addWave} data-bs-dismiss="modal">Add Wave</button>
            </div>
          </div>
        </div>
      </div>

      <div className="strategy-actions mt-4">
        <button 
          className="btn btn-success btn-lg px-4"
          onClick={() => onStrategyPlan?.(strategy)}
        >
          Generate Migration Plan
        </button>
      </div>
    </div>
  );
};

export default MigrationStrategyPlanner;