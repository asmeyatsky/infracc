/**
 * Enhanced Migration Strategy Component
 * 
 * Architectural Intent:
 * - Presentation layer component (UI only)
 * - Uses use cases for business operations
 * - Clean separation of concerns
 */

import React, { useState, useEffect } from 'react';
import { getAgenticContainer } from '../../agentic/dependency_injection/AgenticContainer.js';
import { getContainer } from '../../infrastructure/dependency_injection/Container.js';
import { Workload } from '../../domain/entities/Workload.js';

/**
 * Enhanced Migration Strategy Component - Fully Agentic
 * 
 * Planning agents autonomously generate migration strategies with AI optimization
 */

/**
 * Enhanced Migration Strategy Component
 * 
 * Uses Clean Architecture:
 * - Uses GenerateMigrationPlanUseCase
 * - Uses PlanMigrationWavesUseCase
 * - Displays migration plan with CodeMod enhancements
 */
function EnhancedMigrationStrategy({ workloads: workloadsProp, sourceCloud = 'aws', assessment }) {
  const [workloads, setWorkloads] = useState([]);
  const [migrationPlan, setMigrationPlan] = useState(null);
  const [wavePlan, setWavePlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useCodeMod, setUseCodeMod] = useState(false);

  // Get agentic layer - agents handle everything autonomously
  const agenticContainer = getAgenticContainer();
  const planningAgent = agenticContainer.planningAgent;
  const workloadRepository = getContainer().workloadRepository;

  // Convert prop workloads to domain entities
  useEffect(() => {
    const loadWorkloads = async () => {
      try {
        const workloadEntities = workloadsProp.map(w => {
          try {
            if (w instanceof Workload) {
              return w;
            }
            return Workload.fromJSON({
              ...w,
              sourceProvider: w.sourceProvider || sourceCloud
            });
          } catch (error) {
            console.warn('Failed to create Workload entity:', error);
            return null;
          }
        }).filter(w => w !== null);

        // Save workloads to repository
        for (const workload of workloadEntities) {
          await workloadRepository.save(workload);
        }

        setWorkloads(workloadEntities);
      } catch (error) {
        console.error('Error loading workloads:', error);
        setError('Failed to load workloads');
      }
    };

    if (workloadsProp && workloadsProp.length > 0) {
      loadWorkloads();
    }
  }, [workloadsProp, sourceCloud, workloadRepository]);

  /**
   * Generate migration plan - Agentic (autonomous with AI optimization)
   */
  const handleGeneratePlan = async () => {
    if (workloads.length === 0) {
      alert('Please add workloads first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const workloadIds = workloads.map(w => w.id);

      // Planning agent autonomously generates complete strategy with AI optimization
      const result = await planningAgent.generateAutonomousStrategy({
        workloadIds,
        useCodeMod
      });

      setMigrationPlan(result.migrationPlan);
      setWavePlan(result.wavePlan);
    } catch (error) {
      console.error('Agentic migration planning failed:', error);
      setError(`Agentic planning failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate plan when workloads are available - Agentic
  useEffect(() => {
    if (workloads.length > 0 && !migrationPlan && !loading) {
      handleGeneratePlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workloads.length]);

  if (workloads.length === 0) {
    return (
      <div className="alert alert-info">
        No workloads available for migration planning. Please discover and assess workloads first.
      </div>
    );
  }

  return (
    <div>
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h3 className="mb-0">📋 Migration Strategy Planning</h3>
          <small>Generate comprehensive migration plan with service mappings and wave planning</small>
        </div>
        <div className="card-body">
          {/* CodeMod Option */}
          <div className="mb-4">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="useCodeMod"
                checked={useCodeMod}
                onChange={(e) => setUseCodeMod(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="useCodeMod">
                <strong>Use Google Cloud CodeMod for Enhanced Service Mapping</strong>
                <br />
                <small className="text-muted">
                  Analyze application code for more accurate service mappings and migration recommendations
                </small>
              </label>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            className="btn btn-primary btn-lg"
            onClick={handleGeneratePlan}
            disabled={loading || workloads.length === 0}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Generating Plan...
              </>
            ) : (
              'Generate Migration Plan'
            )}
          </button>
        </div>
      </div>

      {/* Migration Plan Results */}
      {migrationPlan && (
        <div className="card mb-4">
          <div className="card-header bg-success text-white">
            <h4 className="mb-0">Migration Plan Generated</h4>
          </div>
          <div className="card-body">
            {/* Plan Metrics */}
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="card">
                  <div className="card-body text-center">
                    <h5>{migrationPlan.metrics.totalWorkloads}</h5>
                    <small className="text-muted">Total Workloads</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card">
                  <div className="card-body text-center">
                    <h5>{migrationPlan.metrics.totalDuration} weeks</h5>
                    <small className="text-muted">Estimated Duration</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card">
                  <div className="card-body text-center">
                    <h5>{migrationPlan.metrics.averageComplexity}/10</h5>
                    <small className="text-muted">Avg Complexity</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card">
                  <div className="card-body text-center">
                    <h5>
                      Wave 1: {migrationPlan.metrics.waveDistribution.wave1} | 
                      Wave 2: {migrationPlan.metrics.waveDistribution.wave2} | 
                      Wave 3: {migrationPlan.metrics.waveDistribution.wave3}
                    </h5>
                    <small className="text-muted">Wave Distribution</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy Distribution */}
            <div className="mb-4">
              <h5>Strategy Distribution</h5>
              <div className="row">
                {Object.entries(migrationPlan.metrics.strategyDistribution).map(([strategy, count]) => (
                  <div key={strategy} className="col-md-2 mb-2">
                    <div className="card">
                      <div className="card-body text-center">
                        <strong>{count}</strong>
                        <br />
                        <small className="text-capitalize">{strategy}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Migration Plan Items */}
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Workload</th>
                    <th>Source Service</th>
                    <th>Target GCP Service</th>
                    <th>Strategy</th>
                    <th>Effort</th>
                    <th>Wave</th>
                    <th>Duration</th>
                    <th>CodeMod</th>
                  </tr>
                </thead>
                <tbody>
                  {migrationPlan.planItems.map((item) => (
                    <tr key={item.workloadId}>
                      <td>
                        <strong>{item.workloadName}</strong>
                      </td>
                      <td>{item.sourceService || 'N/A'}</td>
                      <td>
                        <strong>{item.serviceMapping.gcpService}</strong>
                        <br />
                        <small className="text-muted">{item.serviceMapping.gcpApi}</small>
                      </td>
                      <td>
                        <span className={`badge bg-${
                          item.serviceMapping.migrationStrategy === 'rehost' ? 'success' :
                          item.serviceMapping.migrationStrategy === 'replatform' ? 'warning' :
                          'danger'
                        }`}>
                          {item.serviceMapping.migrationStrategy.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge bg-${
                          item.serviceMapping.effort === 'low' ? 'success' :
                          item.serviceMapping.effort === 'medium' ? 'warning' :
                          'danger'
                        }`}>
                          {item.serviceMapping.effort.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-info">Wave {item.migrationWave}</span>
                      </td>
                      <td>{item.estimatedDuration} weeks</td>
                      <td>
                        {item.codeModResults ? (
                          <span className="badge bg-success">Yes</span>
                        ) : (
                          <span className="badge bg-secondary">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Wave Plan */}
      {wavePlan && (
        <div className="card">
          <div className="card-header bg-info text-white">
            <h4 className="mb-0">Migration Wave Plan</h4>
          </div>
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-md-4">
                <div className="card border-success">
                  <div className="card-header bg-success text-white">
                    <h5>Wave 1: Quick Wins ({wavePlan.summary.distribution.wave1.count})</h5>
                  </div>
                  <div className="card-body">
                    <p className="text-muted">Low complexity, no dependencies</p>
                    <p><strong>Duration:</strong> {wavePlan.summary.estimatedDuration.wave1} weeks</p>
                    <ul>
                      {wavePlan.wave1.map(w => (
                        <li key={w.id}>{w.name} (Complexity: {w.complexityScore}/10)</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-warning">
                  <div className="card-header bg-warning text-dark">
                    <h5>Wave 2: Standard ({wavePlan.summary.distribution.wave2.count})</h5>
                  </div>
                  <div className="card-body">
                    <p className="text-muted">Medium complexity</p>
                    <p><strong>Duration:</strong> {wavePlan.summary.estimatedDuration.wave2} weeks</p>
                    <ul>
                      {wavePlan.wave2.map(w => (
                        <li key={w.id}>{w.name} (Complexity: {w.complexityScore}/10)</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-danger">
                  <div className="card-header bg-danger text-white">
                    <h5>Wave 3: Complex ({wavePlan.summary.distribution.wave3.count})</h5>
                  </div>
                  <div className="card-body">
                    <p className="text-muted">High complexity, dependencies</p>
                    <p><strong>Duration:</strong> {wavePlan.summary.estimatedDuration.wave3} weeks</p>
                    <ul>
                      {wavePlan.wave3.map(w => (
                        <li key={w.id}>{w.name} (Complexity: {w.complexityScore}/10)</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="alert alert-info">
              <h5>Wave Plan Summary</h5>
              <p><strong>Total Workloads:</strong> {wavePlan.summary.total}</p>
              <p><strong>Average Complexity:</strong> {wavePlan.summary.averageComplexity}/10</p>
              <p><strong>Total Estimated Duration:</strong> {wavePlan.summary.totalDuration} weeks</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedMigrationStrategy;
