/**
 * Enhanced Assessment Component
 * 
 * Architectural Intent:
 * - Presentation layer component (UI only)
 * - Uses application use cases (no business logic)
 * - Clean separation of concerns
 * - Delegates all business operations to use cases
 */

import React, { useState, useEffect } from 'react';
import { getContainer } from '../../infrastructure/dependency_injection/Container.js';
import { getAgenticContainer } from '../../agentic/dependency_injection/AgenticContainer.js';
import { Workload } from '../../domain/entities/Workload.js';
import { CloudProvider, CloudProviderType } from '../../domain/value_objects/CloudProvider.js';

/**
 * Enhanced Assessment Component - Fully Agentic
 * 
 * Agents autonomously handle all assessment operations with AI enhancement
 */

/**
 * Enhanced Assessment Component
 * 
 * Uses Clean Architecture:
 * - Presentation Layer: This component (UI only)
 * - Application Layer: Use cases (AssessWorkloadUseCase)
 * - Domain Layer: Entities, value objects, services
 * - Infrastructure Layer: Repositories, adapters
 */
function EnhancedAssessment({ workloads: workloadsProp, onAssessmentComplete }) {
  const [workloads, setWorkloads] = useState([]);
  const [assessments, setAssessments] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [includeCodeMod, setIncludeCodeMod] = useState(false);

  // Get agentic layer - agents handle everything autonomously
  const agenticContainer = getAgenticContainer();
  const assessmentAgent = agenticContainer.assessmentAgent;
  const workloadRepository = getContainer().workloadRepository;

  // Convert prop workloads to domain entities
  useEffect(() => {
    const loadWorkloads = async () => {
      try {
        // Convert plain objects to Workload entities
        const workloadEntities = workloadsProp.map(w => {
          try {
            return Workload.fromJSON({
              ...w,
              sourceProvider: w.sourceProvider || 'aws'
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

        // Auto-assess workloads when they're loaded (agentic)
        if (workloadEntities.length > 0 && assessments.size === 0) {
          const workloadIds = workloadEntities.map(w => w.id);
          assessmentAgent.assessBatch({
            workloadIds,
            parallel: true
          }).then(batchResult => {
            const newAssessments = new Map();
            batchResult.results.forEach((assessment, index) => {
              if (assessment && !assessment.error) {
                newAssessments.set(workloadIds[index], assessment);
              }
            });
            setAssessments(newAssessments);
            
            if (onAssessmentComplete) {
              const assessmentData = Array.from(newAssessments.values()).map(a => 
                typeof a.toJSON === 'function' ? a.toJSON() : a
              );
              onAssessmentComplete(assessmentData);
            }
          }).catch(error => {
            console.error('Auto-assessment failed:', error);
          });
        }
      } catch (error) {
        console.error('Error loading workloads:', error);
        setError('Failed to load workloads');
      }
    };

    if (workloadsProp && workloadsProp.length > 0) {
      loadWorkloads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workloadsProp]);

  /**
   * Assess a single workload - Agentic (autonomous)
   */
  const handleAssessWorkload = async (workloadId) => {
    setLoading(true);
    setError(null);

    try {
      // Agent autonomously assesses with AI enhancement
      const assessment = await assessmentAgent.execute({
        workloadId,
        useAIEnhancement: true,
        includeCodeMod
      });

      // Update state
      setAssessments(prev => {
        const next = new Map(prev);
        next.set(workloadId, assessment);
        return next;
      });

      // Update workload with assessment
      const workload = await workloadRepository.findById(workloadId);
      if (workload) {
        setWorkloads(prev => prev.map(w => 
          w.id === workloadId ? workload : w
        ));
      }
    } catch (error) {
      console.error('Assessment failed:', error);
      setError(`Assessment failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Assess all workloads - Agentic batch processing (autonomous)
   */
  const handleAssessAll = async () => {
    setLoading(true);
    setError(null);

    try {
      // Agent autonomously processes all workloads in parallel with AI
      const workloadIds = workloads.map(w => w.id);
      const batchResult = await assessmentAgent.assessBatch({
        workloadIds,
        parallel: true
      });
      const results = batchResult.results;
      
      // Update assessments
      const newAssessments = new Map();
      results.forEach((assessment, index) => {
        if (assessment && !assessment.error) {
          newAssessments.set(workloadIds[index], assessment);
        }
      });
      
      setAssessments(newAssessments);

      // Notify parent
      if (onAssessmentComplete) {
        const assessmentData = Array.from(newAssessments.values()).map(a => 
          typeof a.toJSON === 'function' ? a.toJSON() : a
        );
        onAssessmentComplete(assessmentData);
      }
    } catch (error) {
      console.error('Agentic batch assessment failed:', error);
      setError(`Agentic assessment failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (workloads.length === 0) {
    return (
      <div className="alert alert-info">
        No workloads available for assessment. Please discover workloads first.
      </div>
    );
  }

  return (
    <div>
      {/* Agentic Status */}
      <div className="card mb-3" style={{background: 'linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%)', border: '1px solid var(--primary-200)'}}>
        <div className="card-body">
          <div className="d-flex align-items-center gap-3">
            <div style={{fontSize: '2rem'}}>🤖</div>
            <div>
              <h6 className="mb-1" style={{color: 'var(--primary-700)', fontWeight: 600}}>Autonomous Assessment Agent</h6>
              <small className="text-muted">
                AI-powered agents are autonomously assessing workloads with intelligent insights and recommendations
              </small>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-primary text-white">
          <h3 className="mb-0">🔬 Autonomous Workload Assessment</h3>
          <small>AI-powered agents assess infrastructure and applications with Google Cloud CodeMod integration</small>
        </div>
        <div className="card-body">
          {/* CodeMod Option */}
        <div className="mb-4">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="includeCodeMod"
              checked={includeCodeMod}
              onChange={(e) => setIncludeCodeMod(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="includeCodeMod">
              <strong>Include Google Cloud CodeMod Analysis</strong>
              <br />
              <small className="text-muted">
                Analyze application code for accurate service mappings and migration recommendations
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

        {/* Actions */}
        <div className="mb-4">
          <button
            className="btn btn-primary me-2"
            onClick={handleAssessAll}
            disabled={loading || workloads.length === 0}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Assessing...
              </>
            ) : (
              `Assess All ${workloads.length} Workloads`
            )}
          </button>
        </div>

        {/* Workloads List */}
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Workload</th>
                <th>Service</th>
                <th>Type</th>
                <th>Status</th>
                <th>Complexity</th>
                <th>Readiness</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workloads.map((workload) => {
                const assessment = assessments.get(workload.id);
                const isAssessing = loading && !assessment;

                return (
                  <tr key={workload.id}>
                    <td>
                      <strong>{workload.name}</strong>
                      <br />
                      <small className="text-muted">{workload.sourceProvider.displayName}</small>
                    </td>
                    <td>{workload.service || 'N/A'}</td>
                    <td>
                      <span className="badge bg-secondary">
                        {workload.type.displayName}
                      </span>
                    </td>
                    <td>
                      {assessment ? (
                        <span className="badge bg-success">Assessed</span>
                      ) : isAssessing ? (
                        <span className="badge bg-warning">Assessing...</span>
                      ) : (
                        <span className="badge bg-secondary">Not Assessed</span>
                      )}
                    </td>
                    <td>
                      {assessment ? (
                        <div>
                          <div className="progress" style={{ height: '20px' }}>
                            <div
                              className={`progress-bar ${
                                assessment.complexityScore >= 7
                                  ? 'bg-danger'
                                  : assessment.complexityScore >= 4
                                  ? 'bg-warning'
                                  : 'bg-success'
                              }`}
                              role="progressbar"
                              style={{ width: `${assessment.complexityScore * 10}%` }}
                            >
                              {assessment.complexityScore}/10
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {assessment ? (
                        <div>
                          <strong>{assessment.getReadinessScore()}%</strong>
                          <div className="progress mt-1" style={{ height: '10px' }}>
                            <div
                              className="progress-bar bg-info"
                              role="progressbar"
                              style={{ width: `${assessment.getReadinessScore()}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleAssessWorkload(workload.id)}
                        disabled={loading}
                      >
                        {assessment ? 'Re-assess' : 'Assess'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Assessment Details */}
        {assessments.size > 0 && (
          <div className="mt-4">
            <h5>Assessment Summary</h5>
            <div className="row">
              <div className="col-md-4">
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">Average Complexity</h6>
                    <h3>
                      {(
                        Array.from(assessments.values())
                          .reduce((sum, a) => sum + a.complexityScore, 0) /
                        assessments.size
                      ).toFixed(1)}
                      /10
                    </h3>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">Average Readiness</h6>
                    <h3>
                      {Math.round(
                        Array.from(assessments.values())
                          .reduce((sum, a) => sum + a.getReadinessScore(), 0) /
                        assessments.size
                      )}
                      %
                    </h3>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">High Risk Workloads</h6>
                    <h3>
                      {
                        Array.from(assessments.values()).filter(a => a.hasHighRisk())
                          .length
                      }
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default EnhancedAssessment;
