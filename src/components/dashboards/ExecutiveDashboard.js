/**
 * Executive Dashboard
 * High-level view for C-suite: ROI, costs, timelines, business impact
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const ExecutiveDashboard = ({ projectData, migrationPlan, discoveryResults }) => {
  const { user, hasPermission } = useAuth();

  // Calculate high-level metrics
  const metrics = calculateExecutiveMetrics(projectData, migrationPlan, discoveryResults);

  return (
    <div className="executive-dashboard">
      {/* Header */}
      <div className="dashboard-header mb-4">
        <h2>Executive Overview</h2>
        <p className="text-muted">Cloud Migration Strategic Summary</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <MetricCard
            title="Total Investment"
            value={`$${metrics.totalInvestment.toLocaleString()}`}
            icon="💰"
            trend={metrics.investmentTrend}
            description="One-time + 12-month operational"
          />
        </div>
        <div className="col-md-3">
          <MetricCard
            title="3-Year ROI"
            value={`${metrics.roi}%`}
            icon="📈"
            trend={{ direction: 'up', value: metrics.roi }}
            description="Return on investment over 36 months"
            positive={metrics.roi > 0}
          />
        </div>
        <div className="col-md-3">
          <MetricCard
            title="Migration Timeline"
            value={`${metrics.timelineMonths} months`}
            icon="⏱️"
            description="From assessment to final cutover"
          />
        </div>
        <div className="col-md-3">
          <MetricCard
            title="Risk Level"
            value={metrics.riskLevel}
            icon="⚠️"
            description="Overall migration risk assessment"
            className={`risk-${metrics.riskLevel.toLowerCase()}`}
          />
        </div>
      </div>

      {/* Business Value Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Business Value Proposition</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h6>Cost Savings</h6>
              <ul className="business-benefits-list">
                <li>
                  <strong>${metrics.annualSavings.toLocaleString()}</strong> annual operational savings
                </li>
                <li>
                  <strong>{metrics.costReductionPercent}%</strong> reduction in infrastructure costs
                </li>
                <li>
                  <strong>${metrics.laborSavings.toLocaleString()}</strong> in automation and efficiency gains
                </li>
              </ul>
            </div>
            <div className="col-md-6">
              <h6>Strategic Benefits</h6>
              <ul className="business-benefits-list">
                <li>Enhanced scalability for business growth</li>
                <li>Improved disaster recovery (99.9% SLA)</li>
                <li>Faster time-to-market for new features</li>
                <li>Reduced technical debt and modernized stack</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown Chart */}
      <div className="row mb-4">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Cost Analysis</h5>
            </div>
            <div className="card-body">
              <CostComparisonChart
                onPremise={metrics.onPremiseCosts}
                cloud={metrics.cloudCosts}
                timeframe={36}
              />
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Investment Breakdown</h5>
            </div>
            <div className="card-body">
              <InvestmentBreakdownChart data={metrics.investmentBreakdown} />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Migration Timeline & Milestones</h5>
          <span className="badge bg-primary">
            {migrationPlan?.timeline?.totalWeeks || 0} weeks
          </span>
        </div>
        <div className="card-body">
          <ExecutiveTimeline
            phases={migrationPlan?.timeline?.phases || []}
            milestones={migrationPlan?.timeline?.milestones || []}
          />
        </div>
      </div>

      {/* Risk & Mitigation */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Strategic Risks & Mitigation</h5>
        </div>
        <div className="card-body">
          <ExecutiveRiskSummary risks={migrationPlan?.riskAnalysis || []} />
        </div>
      </div>

      {/* Recommendations */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Strategic Recommendations</h5>
        </div>
        <div className="card-body">
          <ExecutiveRecommendations recommendations={metrics.recommendations} />
        </div>
      </div>

      {/* Decision Points */}
      {hasPermission('approveMigrationPlan') && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Approval Required</h5>
          </div>
          <div className="card-body">
            <ApprovalSection
              projectData={projectData}
              migrationPlan={migrationPlan}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, icon, trend, description, positive, className = '' }) => (
  <div className={`card metric-card ${className}`}>
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <span className="metric-icon">{icon}</span>
        {trend && (
          <span className={`trend ${trend.direction === 'up' ? 'trend-up' : 'trend-down'}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
          </span>
        )}
      </div>
      <h6 className="text-muted small mb-1">{title}</h6>
      <h3 className={`mb-1 ${positive !== undefined ? (positive ? 'text-success' : 'text-danger') : ''}`}>
        {value}
      </h3>
      {description && <p className="small text-muted mb-0">{description}</p>}
    </div>
  </div>
);

// Cost Comparison Chart Component
const CostComparisonChart = ({ onPremise, cloud, timeframe }) => {
  // Generate data for comparison
  const months = [];
  const onPremData = [];
  const cloudData = [];
  const savingsData = [];

  for (let i = 0; i <= timeframe; i += 6) {
    months.push(`Month ${i}`);
    onPremData.push(onPremise.monthly * i);
    cloudData.push(cloud.monthly * i + cloud.migration);
    savingsData.push((onPremise.monthly * i) - (cloud.monthly * i + cloud.migration));
  }

  return (
    <div>
      <div className="chart-legend mb-3">
        <span className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#dc3545' }}></span>
          On-Premise
        </span>
        <span className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#0d6efd' }}></span>
          Google Cloud
        </span>
        <span className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#198754' }}></span>
          Cumulative Savings
        </span>
      </div>

      <div className="cost-comparison-bars">
        {months.map((month, idx) => (
          <div key={idx} className="cost-bar-group">
            <div className="bar-label">{month}</div>
            <div className="bars">
              <div
                className="bar bar-onprem"
                style={{ width: `${(onPremData[idx] / Math.max(...onPremData)) * 100}%` }}
                title={`On-Prem: $${onPremData[idx].toLocaleString()}`}
              >
                ${(onPremData[idx] / 1000).toFixed(0)}K
              </div>
              <div
                className="bar bar-cloud"
                style={{ width: `${(cloudData[idx] / Math.max(...onPremData)) * 100}%` }}
                title={`Cloud: $${cloudData[idx].toLocaleString()}`}
              >
                ${(cloudData[idx] / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="savings-label">
              Savings: ${(savingsData[idx] / 1000).toFixed(0)}K
            </div>
          </div>
        ))}
      </div>

      <div className="alert alert-success mt-3">
        <strong>Break-even Point:</strong> Month {calculateBreakEven(cloud, onPremise)} |
        <strong className="ms-3">3-Year Savings:</strong> ${((onPremise.monthly - cloud.monthly) * 36 - cloud.migration).toLocaleString()}
      </div>
    </div>
  );
};

// Investment Breakdown Chart
const InvestmentBreakdownChart = ({ data }) => (
  <div className="investment-breakdown">
    {data.map((item, idx) => (
      <div key={idx} className="investment-item mb-3">
        <div className="d-flex justify-content-between mb-1">
          <span>{item.category}</span>
          <strong>${item.amount.toLocaleString()}</strong>
        </div>
        <div className="progress" style={{ height: '8px' }}>
          <div
            className="progress-bar"
            style={{ width: `${item.percentage}%` }}
            role="progressbar"
          ></div>
        </div>
        <small className="text-muted">{item.percentage}% of total</small>
      </div>
    ))}
  </div>
);

// Executive Timeline Component
const ExecutiveTimeline = ({ phases, milestones }) => (
  <div className="executive-timeline">
    <div className="timeline-phases">
      {phases.map((phase, idx) => (
        <div key={idx} className="timeline-phase">
          <div className="phase-header">
            <h6>{phase.name}</h6>
            <span className="badge bg-secondary">{phase.duration} weeks</span>
          </div>
          <div className="phase-bar">
            <div
              className="phase-progress"
              style={{ width: '0%' }}
            ></div>
          </div>
        </div>
      ))}
    </div>

    <div className="timeline-milestones mt-4">
      <h6>Key Milestones</h6>
      <div className="milestones-list">
        {milestones.slice(0, 5).map((milestone, idx) => (
          <div key={idx} className="milestone-item">
            <span className="milestone-icon">🎯</span>
            <div>
              <strong>{milestone.name}</strong>
              <span className="text-muted ms-2">Week {milestone.week}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Executive Risk Summary
const ExecutiveRiskSummary = ({ risks }) => {
  const criticalRisks = risks.filter(r => r.severity === 'critical' || r.severity === 'high');

  return (
    <div>
      {criticalRisks.length > 0 ? (
        <>
          <div className="alert alert-warning">
            <strong>{criticalRisks.length}</strong> high-priority risks identified and mitigation strategies defined.
          </div>
          <div className="risk-summary-list">
            {criticalRisks.map((risk, idx) => (
              <div key={idx} className="risk-item card mb-2">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-1">
                        <span className={`badge bg-${risk.severity === 'critical' ? 'danger' : 'warning'} me-2`}>
                          {risk.severity}
                        </span>
                        {risk.category}
                      </h6>
                      <p className="mb-2">{risk.risk}</p>
                      <div className="mitigation">
                        <strong className="small">Mitigation:</strong>
                        <p className="small text-muted mb-0">{risk.mitigation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="alert alert-success">
          No critical risks identified. Migration plan follows best practices with standard risk mitigation strategies.
        </div>
      )}
    </div>
  );
};

// Executive Recommendations
const ExecutiveRecommendations = ({ recommendations }) => (
  <div className="recommendations-list">
    {recommendations.map((rec, idx) => (
      <div key={idx} className="recommendation-card card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-start">
            <span className={`badge bg-${rec.priority === 'critical' ? 'danger' : rec.priority === 'high' ? 'warning' : 'info'} me-3`}>
              {rec.priority}
            </span>
            <div className="flex-grow-1">
              <h6 className="mb-1">{rec.title}</h6>
              <p className="mb-2">{rec.description}</p>
              {rec.businessImpact && (
                <div className="business-impact">
                  <strong className="small text-success">Business Impact:</strong>
                  <p className="small mb-0">{rec.businessImpact}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Approval Section
const ApprovalSection = ({ projectData, migrationPlan }) => {
  const [approved, setApproved] = React.useState(false);
  const [comments, setComments] = React.useState('');

  const handleApprove = () => {
    // In production, this would call an API
    console.log('Migration plan approved:', { projectData, comments });
    setApproved(true);
  };

  if (approved) {
    return (
      <div className="alert alert-success">
        <h5>✓ Migration Plan Approved</h5>
        <p>The migration plan has been approved and the team can proceed with execution.</p>
      </div>
    );
  }

  return (
    <div>
      <p>Review the migration plan details above. Your approval is required to proceed.</p>

      <div className="approval-checklist mb-3">
        <h6>Approval Checklist:</h6>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="budgetCheck" />
          <label className="form-check-label" htmlFor="budgetCheck">
            Budget allocation approved (${ migrationPlan?.costBreakdown?.total?.toLocaleString() || 'TBD'})
          </label>
        </div>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="timelineCheck" />
          <label className="form-check-label" htmlFor="timelineCheck">
            Timeline acceptable ({migrationPlan?.timeline?.totalMonths || 'TBD'} months)
          </label>
        </div>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="riskCheck" />
          <label className="form-check-label" htmlFor="riskCheck">
            Risk mitigation strategies acceptable
          </label>
        </div>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="roiCheck" />
          <label className="form-check-label" htmlFor="roiCheck">
            Expected ROI meets business objectives
          </label>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Comments (optional):</label>
        <textarea
          className="form-control"
          rows="3"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Add any comments or conditions..."
        ></textarea>
      </div>

      <div className="d-flex gap-2">
        <button className="btn btn-success" onClick={handleApprove}>
          ✓ Approve Migration Plan
        </button>
        <button className="btn btn-outline-secondary">
          Request More Information
        </button>
      </div>
    </div>
  );
};

// Helper Functions
const calculateExecutiveMetrics = (projectData, migrationPlan, discoveryResults) => {
  const onPremiseMonthly = 50000; // Mock data
  const cloudMonthly = 35000;
  const migrationCost = migrationPlan?.costBreakdown?.total || 250000;

  const annualSavings = (onPremiseMonthly - cloudMonthly) * 12;
  const threeYearSavings = annualSavings * 3 - migrationCost;
  const roi = (threeYearSavings / migrationCost) * 100;

  return {
    totalInvestment: migrationCost + (cloudMonthly * 12),
    roi: Math.round(roi),
    timelineMonths: migrationPlan?.timeline?.totalMonths || 6,
    riskLevel: migrationPlan?.summary?.riskLevel || 'Medium',
    annualSavings,
    costReductionPercent: Math.round(((onPremiseMonthly - cloudMonthly) / onPremiseMonthly) * 100),
    laborSavings: 120000, // Annual labor savings from automation
    onPremiseCosts: {
      monthly: onPremiseMonthly,
      annual: onPremiseMonthly * 12,
    },
    cloudCosts: {
      monthly: cloudMonthly,
      annual: cloudMonthly * 12,
      migration: migrationCost,
    },
    investmentBreakdown: [
      { category: 'Migration Services', amount: migrationCost * 0.4, percentage: 40 },
      { category: 'Infrastructure (12 months)', amount: cloudMonthly * 12, percentage: 35 },
      { category: 'Training & Change Management', amount: migrationCost * 0.15, percentage: 15 },
      { category: 'Contingency', amount: migrationCost * 0.10, percentage: 10 },
    ],
    investmentTrend: { direction: 'down', value: 30 },
    recommendations: [
      {
        priority: 'high',
        title: 'Accelerate Timeline with Pilot Wave',
        description: 'Start with low-risk workloads to validate approach and build team confidence',
        businessImpact: 'Reduces overall project risk and accelerates time-to-value',
      },
      {
        priority: 'medium',
        title: 'Invest in Team Training',
        description: 'Allocate budget for GCP certification and hands-on training',
        businessImpact: 'Reduces dependency on external consultants, builds internal capability',
      },
      {
        priority: 'medium',
        title: 'Implement FinOps from Day One',
        description: 'Set up cost monitoring, budgets, and optimization processes early',
        businessImpact: 'Ensures cost savings are realized and prevents cloud cost overruns',
      },
    ],
  };
};

const calculateBreakEven = (cloud, onPremise) => {
  const monthlySavings = onPremise.monthly - cloud.monthly;
  const breakEvenMonths = Math.ceil(cloud.migration / monthlySavings);
  return breakEvenMonths;
};

export default ExecutiveDashboard;
