/**
 * Dashboard Overview
 * Executive summary of the entire cloud migration analysis
 */

import React from 'react';

const DashboardOverview = ({ 
  tcoResults, 
  workloadStats, 
  projectStats, 
  onNavigate 
}) => {
  const getROIStatus = (roi) => {
    if (roi > 50) return { level: 'excellent', color: 'success', icon: '🎉' };
    if (roi > 25) return { level: 'good', color: 'primary', icon: '👍' };
    if (roi > 0) return { level: 'fair', color: 'warning', icon: '⚠️' };
    return { level: 'poor', color: 'danger', icon: '❌' };
  };

  const getRiskStatus = (level) => {
    if (level === 'low') return { color: 'success', icon: '🟢' };
    if (level === 'medium') return { color: 'warning', icon: '🟡' };
    return { color: 'danger', icon: '🔴' };
  };

  const roiStatus = getROIStatus(tcoResults?.roi || 0);
  const riskStatus = getRiskStatus(projectStats?.riskLevel || 'medium');

  return (
    <div className="dashboard-overview">
      <div className="overview-header">
        <h2>_migration Accelerator Dashboard</h2>
        <p className="text-muted">Executive summary of your cloud migration analysis</p>
      </div>

      {/* Key Metrics */}
      <div className="key-metrics-grid">
        <div className="metric-card primary">
          <div className="metric-header">
            <div className="metric-icon">💰</div>
            <div className="metric-title">Total Investment</div>
          </div>
          <div className="metric-value">
            ${(tcoResults?.totalCloudTCO || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-trend positive">
            vs On-Premise: {(tcoResults?.onPremiseTCO ? 
              ((tcoResults.onPremiseTCO - (tcoResults.totalCloudTCO || 0)) / tcoResults.onPremiseTCO * 100) : 0).toFixed(1)}%
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-header">
            <div className="metric-icon">📈</div>
            <div className="metric-title">Total Savings</div>
          </div>
          <div className="metric-value">
            ${(tcoResults?.savings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-trend positive">
            Over {tcoResults?.timeframe || 36} months
          </div>
        </div>

        <div className="metric-card roi">
          <div className="metric-header">
            <div className="metric-icon">{roiStatus.icon}</div>
            <div className="metric-title">ROI</div>
          </div>
          <div className="metric-value text-{roiStatus.color}">
            {(tcoResults?.roi || 0).toFixed(2)}%
          </div>
          <div className={`metric-trend ${roiStatus.color}`}>
            {roiStatus.level} performance
          </div>
        </div>

        <div className="metric-card info">
          <div className="metric-header">
            <div className="metric-icon">📊</div>
            <div className="metric-title">Workloads</div>
          </div>
          <div className="metric-value">
            {workloadStats?.total || 0}
          </div>
          <div className="metric-trend">
            {workloadStats?.migratable || 0} ready for migration
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="row">
          <div className="col-md-8">
            <div className="card h-100">
              <div className="card-header">
                <h5>Migration Progress</h5>
              </div>
              <div className="card-body">
                <div className="progress-overview mb-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Completion</span>
                    <span>{projectStats?.completion || 0}%</span>
                  </div>
                  <div className="progress" style={{ height: '24px' }}>
                    <div 
                      className="progress-bar bg-success" 
                      role="progressbar" 
                      style={{ width: `${projectStats?.completion || 0}%` }}
                    >
                      {projectStats?.completion || 0}%
                    </div>
                  </div>
                </div>

                <div className="milestones">
                  <div className="d-flex justify-content-between">
                    <span>Assessment Complete</span>
                    <span>{projectStats?.assessmentComplete ? '✅' : '⏳'}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Planning Complete</span>
                    <span>{projectStats?.planningComplete ? '✅' : '⏳'}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Execution Started</span>
                    <span>{projectStats?.executionStarted ? '✅' : '⏳'}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Go-Live Date</span>
                    <span>{projectStats?.goLiveDate || 'TBD'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card h-100">
              <div className="card-header">
                <h5>Risk Overview</h5>
              </div>
              <div className="card-body">
                <div className="risk-indicator mb-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <span className="fs-4 me-2">{riskStatus.icon}</span>
                    <span className={`fw-bold text-capitalize ${riskStatus.color}`}>
                      {projectStats?.riskLevel || 'medium'} Risk
                    </span>
                  </div>
                </div>

                <div className="risk-factors">
                  <div className="mb-2">
                    <small className="text-muted">Cost Risk</small>
                    <div className="progress" style={{ height: '6px' }}>
                      <div 
                        className={`progress-bar bg-${riskStatus.color}`} 
                        style={{ width: `${projectStats?.costRisk || 50}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Technical Risk</small>
                    <div className="progress" style={{ height: '6px' }}>
                      <div 
                        className={`progress-bar bg-${riskStatus.color}`} 
                        style={{ width: `${projectStats?.technicalRisk || 50}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <small className="text-muted">Business Risk</small>
                    <div className="progress" style={{ height: '6px' }}>
                      <div 
                        className={`progress-bar bg-${riskStatus.color}`} 
                        style={{ width: `${projectStats?.businessRisk || 50}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="recommendations-section">
        <div className="card">
          <div className="card-header">
            <h5>🎯 Executive Recommendations</h5>
          </div>
          <div className="card-body">
            <div className="recommendations-grid">
              <div className="recommendation-item">
                <div className="rec-icon">💡</div>
                <div className="rec-content">
                  <h6>Immediate Actions</h6>
                  <ul className="mb-0">
                    <li>Finalize cloud provider selection based on ROI analysis</li>
                    <li>Establish migration timeline with clear milestones</li>
                    <li>Secure budget approval for migration costs</li>
                  </ul>
                </div>
              </div>
              
              <div className="recommendation-item">
                <div className="rec-icon">⚡</div>
                <div className="rec-content">
                  <h6>Optimization Opportunities</h6>
                  <ul className="mb-0">
                    <li>Implement reserved instances for predictable workloads</li>
                    <li>Use auto-scaling for variable workloads</li>
                    <li>Optimize storage classes based on access patterns</li>
                  </ul>
                </div>
              </div>
              
              <div className="recommendation-item">
                <div className="rec-icon">🛡️</div>
                <div className="rec-content">
                  <h6>Risk Mitigation</h6>
                  <ul className="mb-0">
                    <li>Implement phased migration approach</li>
                    <li>Establish comprehensive backup strategies</li>
                    <li>Plan for rollback procedures</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="dashboard-navigation mt-4">
        <h5>Continue Your Analysis</h5>
        <div className="navigation-grid">
          <button 
            className="nav-card"
            onClick={() => onNavigate?.('tco')}
          >
            <div className="nav-icon">💰</div>
            <div className="nav-title">TCO Calculator</div>
            <div className="nav-description">Detailed cost analysis</div>
          </button>
          
          <button 
            className="nav-card"
            onClick={() => onNavigate?.('strategy')}
          >
            <div className="nav-icon">🏗️</div>
            <div className="nav-title">Migration Strategy</div>
            <div className="nav-description">Plan your migration approach</div>
          </button>
          
          <button 
            className="nav-card"
            onClick={() => onNavigate?.('executive')}
          >
            <div className="nav-icon">📊</div>
            <div className="nav-title">Executive Dashboard</div>
            <div className="nav-description">Comprehensive analytics</div>
          </button>
          
          <button 
            className="nav-card"
            onClick={() => onNavigate?.('report')}
          >
            <div className="nav-icon">📝</div>
            <div className="nav-title">Generate Report</div>
            <div className="nav-description">Export your analysis</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;