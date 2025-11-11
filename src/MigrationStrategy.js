import React from 'react';
import { getAwsToGcpMapping, getAzureToGcpMapping, suggestMigrationWave } from './utils/serviceMapping';

function MigrationStrategy({ workloads, sourceCloud = 'aws' }) {
  // 6 R's Migration Strategy Analysis using service mapping
  const analyzeStrategy = (workload) => {
    const { service, type, os, cpu, memory } = workload;
    
    // If service is specified, use service mapping
    if (service) {
      const mapping = sourceCloud === 'aws' 
        ? getAwsToGcpMapping(service)
        : getAzureToGcpMapping(service);
      
      return {
        strategy: mapping.migrationStrategy,
        targetService: mapping.gcpService,
        effort: mapping.effort,
        color: mapping.effort === 'Low' ? 'success' : mapping.effort === 'Medium' ? 'warning' : 'danger',
        description: mapping.notes,
        considerations: mapping.considerations,
        gcpApi: mapping.gcpApi,
        migrationWave: suggestMigrationWave(mapping, workload),
        sourceService: service
      };
    }

    // Fallback to rule-based analysis if no service specified
    if (type === 'container') {
      return {
        strategy: 'Replatform',
        targetService: 'Google Kubernetes Engine (GKE)',
        effort: 'Medium',
        color: 'warning',
        description: 'Migrate containers to GKE for better orchestration and scalability',
        considerations: ['Container definitions need translation', 'Storage classes need remapping', 'Load balancer configurations vary'],
        migrationWave: 'Wave 2 - Standard Migrations',
        sourceService: 'Container Service'
      };
    }

    if (type === 'database') {
      return {
        strategy: 'Replatform',
        targetService: 'Cloud SQL / Cloud Spanner',
        effort: 'Medium',
        color: 'warning',
        description: 'Migrate to managed database service for reduced operational overhead',
        considerations: ['Version compatibility check required', 'Backup and restore procedures differ', 'High availability configurations differ'],
        migrationWave: 'Wave 2 - Standard Migrations',
        sourceService: 'Database Service'
      };
    }

    if (type === 'storage') {
      return {
        strategy: 'Rehost',
        targetService: 'Cloud Storage / Persistent Disk',
        effort: 'Low',
        color: 'success',
        description: 'Simple migration to cloud storage with minimal changes',
        considerations: ['Bucket naming conventions differ', 'ACL and IAM models vary', 'Lifecycle policies need translation'],
        migrationWave: 'Wave 1 - Quick Wins',
        sourceService: 'Storage Service'
      };
    }

    if (type === 'function') {
      return {
        strategy: 'Replatform',
        targetService: 'Cloud Functions',
        effort: 'Medium',
        color: 'warning',
        description: 'Serverless functions with similar concepts',
        considerations: ['Function runtime and triggers may need adjustment', 'Event structure differences', 'Cold start behavior differs'],
        migrationWave: 'Wave 2 - Standard Migrations',
        sourceService: 'Serverless Function'
      };
    }

    if (cpu >= 16 || memory >= 64) {
      return {
        strategy: 'Refactor',
        targetService: 'Compute Engine (Optimized)',
        effort: 'High',
        color: 'danger',
        description: 'Large workload - consider refactoring for cloud-native architecture',
        considerations: ['Instance types may differ - review sizing', 'Storage attachment methods vary', 'Networking configuration needs adjustment'],
        migrationWave: 'Wave 3 - Complex Migrations',
        sourceService: 'Large VM'
      };
    }

    if (os === 'windows' && type === 'application') {
      return {
        strategy: 'Rehost',
        targetService: 'Compute Engine (Windows)',
        effort: 'Low',
        color: 'success',
        description: 'Lift-and-shift to Compute Engine with minimal changes',
        considerations: ['Windows licensing handled differently', 'Domain join configuration varies'],
        migrationWave: 'Wave 1 - Quick Wins',
        sourceService: 'Windows VM'
      };
    }

    // Default recommendation
    return {
      strategy: 'Rehost',
      targetService: 'Compute Engine',
      effort: 'Low',
      color: 'success',
      description: 'Standard lift-and-shift migration to Compute Engine',
      considerations: ['Instance types may differ - review sizing', 'Storage attachment methods vary'],
      migrationWave: 'Wave 1 - Quick Wins',
      sourceService: 'VM'
    };
  };

  const getStrategyIcon = (strategy) => {
    const icons = {
      'Rehost': '🚚',
      'Replatform': '🔄',
      'Refactor': '🔨',
      'Repurchase': '🛒',
      'Retire': '🗑️',
      'Retain': '⏸️'
    };
    return icons[strategy] || '📦';
  };

  const strategySummary = workloads.reduce((acc, workload) => {
    const analysis = analyzeStrategy(workload);
    acc[analysis.strategy] = (acc[analysis.strategy] || 0) + 1;
    return acc;
  }, {});

  const totalWorkloads = workloads.length;

  return (
    <div className="card mb-4">
      <div className="card-header bg-primary text-white">
        <h3 className="mb-0">🎯 Migration Strategy Recommendations</h3>
        <small>Based on the 6 R's migration framework</small>
      </div>
      <div className="card-body">
        {workloads.length === 0 ? (
          <div className="alert alert-info">
            <strong>No workloads discovered yet.</strong> Add workloads using the Discovery Tool above to get migration recommendations.
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="row mb-4">
              <div className="col-12">
                <h5 className="mb-3">Migration Strategy Distribution</h5>
              </div>
              {Object.entries(strategySummary).map(([strategy, count]) => (
                <div key={strategy} className="col-md-4 col-lg-2 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h2 className="mb-1">{getStrategyIcon(strategy)}</h2>
                      <h6 className="card-title mb-1">{strategy}</h6>
                      <p className="card-text">
                        <strong>{count}</strong> workload{count !== 1 ? 's' : ''}
                        <br />
                        <small className="text-muted">{((count / totalWorkloads) * 100).toFixed(0)}%</small>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Recommendations */}
            <h5 className="mb-3">Detailed Recommendations</h5>
            <div className="accordion" id="migrationAccordion">
              {workloads.map((workload, index) => {
                const analysis = analyzeStrategy(workload);
                return (
                  <div key={workload.id} className="accordion-item">
                    <h2 className="accordion-header" id={`heading${index}`}>
                      <button
                        className="accordion-button collapsed"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#collapse${index}`}
                        aria-expanded="false"
                        aria-controls={`collapse${index}`}
                      >
                        <span className="me-3">{getStrategyIcon(analysis.strategy)}</span>
                        <strong>{workload.name}</strong>
                        <span className={`badge bg-${analysis.color} ms-3`}>{analysis.strategy}</span>
                        <span className="badge bg-secondary ms-2">Effort: {analysis.effort}</span>
                      </button>
                    </h2>
                    <div
                      id={`collapse${index}`}
                      className="accordion-collapse collapse"
                      aria-labelledby={`heading${index}`}
                      data-bs-parent="#migrationAccordion"
                    >
                      <div className="accordion-body">
                        <div className="row">
                          <div className="col-md-6">
                            <h6>Workload Details</h6>
                            <ul className="list-unstyled">
                              <li><strong>Type:</strong> {workload.type}</li>
                              <li><strong>OS:</strong> {workload.os}</li>
                              <li><strong>Resources:</strong> {workload.cpu} cores, {workload.memory} GB RAM</li>
                              <li><strong>Storage:</strong> {workload.storage} GB</li>
                              <li><strong>Network:</strong> {workload.monthlyTraffic} GB/month</li>
                              {workload.dependencies && (
                                <li><strong>Dependencies:</strong> {workload.dependencies}</li>
                              )}
                            </ul>
                          </div>
                          <div className="col-md-6">
                            <h6>Migration Recommendation</h6>
                            <div className={`alert alert-${analysis.color}`}>
                              <strong>Strategy:</strong> {analysis.strategy}
                              <br />
                              <strong>Target Service:</strong> {analysis.targetService}
                              <br />
                              <strong>Effort Level:</strong> {analysis.effort}
                              <br />
                              <br />
                              {analysis.description}
                            </div>

                            <h6 className="mt-3">Next Steps</h6>
                            <ol className="small">
                              <li>Review workload compatibility with {analysis.targetService}</li>
                              <li>Estimate detailed migration costs using TCO Calculator</li>
                              <li>Create migration wave plan ({analysis.migrationWave})</li>
                              <li>Set up GCP landing zone infrastructure</li>
                              <li>Execute migration in test environment</li>
                              <li>Validate performance and cost optimization</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 6 R's Reference */}
            <div className="mt-4">
              <h5 className="mb-3">📚 The 6 R's Migration Framework</h5>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-title">🚚 Rehost (Lift & Shift)</h6>
                      <p className="card-text small">Move applications without changes. Quick but doesn't leverage cloud benefits.</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-title">🔄 Replatform (Lift, Tinker & Shift)</h6>
                      <p className="card-text small">Make minimal cloud optimizations (e.g., managed databases) without changing core architecture.</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-title">🔨 Refactor (Re-architect)</h6>
                      <p className="card-text small">Redesign using cloud-native features. Highest effort but maximum cloud benefits.</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-title">🛒 Repurchase (Replace)</h6>
                      <p className="card-text small">Move to a different product, typically SaaS.</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-title">🗑️ Retire</h6>
                      <p className="card-text small">Decommission applications no longer needed.</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-title">⏸️ Retain (Revisit)</h6>
                      <p className="card-text small">Keep on-premises for now, migrate later.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MigrationStrategy;
