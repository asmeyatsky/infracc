/**
 * Report Summary View Component
 * 
 * Main component displaying comprehensive migration assessment report:
 * - Executive Summary with key metrics and charts
 * - Technology Summary
 * - Regional Breakdown
 * - Cost Comparison
 * - Migration Recommendations
 * - PDF Download
 */

import React, { useState, useEffect } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { ReportDataAggregator } from '../../domain/services/ReportDataAggregator.js';
import { GCPCostEstimator } from '../../domain/services/GCPCostEstimator.js';
import { generateComprehensiveReportPDF } from '../../utils/reportPdfGenerator.js';
import TechnologySummary from './TechnologySummary.js';
import RegionalBreakdown from './RegionalBreakdown.js';
import CostComparison from './CostComparison.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const ReportSummaryView = ({ workloads = [], assessmentResults = null, strategyResults = null }) => {
  const [reportData, setReportData] = useState(null);
  const [targetRegion, setTargetRegion] = useState('us-central1');

  useEffect(() => {
    if (workloads && workloads.length > 0) {
      const summary = ReportDataAggregator.generateReportSummary(workloads);
      setReportData(summary);
    }
  }, [workloads]);

  if (!reportData) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        Loading report data...
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Prepare complexity chart data
  const complexityChartData = {
    labels: ['Low (1-3)', 'Medium (4-6)', 'High (7-10)', 'Unassigned'],
    datasets: [{
      label: 'Workloads',
      data: [
        reportData.complexity.low.count,
        reportData.complexity.medium.count,
        reportData.complexity.high.count,
        reportData.complexity.unassigned.count
      ],
      backgroundColor: [
        'rgba(40, 167, 69, 0.8)',   // Green for Low
        'rgba(255, 193, 7, 0.8)',    // Yellow for Medium
        'rgba(220, 53, 69, 0.8)',    // Red for High
        'rgba(108, 117, 125, 0.8)'   // Gray for Unassigned
      ],
      borderColor: [
        'rgba(40, 167, 69, 1)',
        'rgba(255, 193, 7, 1)',
        'rgba(220, 53, 69, 1)',
        'rgba(108, 117, 125, 1)'
      ],
      borderWidth: 1
    }]
  };

  // Prepare readiness chart data
  const readinessChartData = {
    labels: ['Ready', 'Conditional', 'Not Ready', 'Unassigned'],
    datasets: [{
      label: 'Workloads',
      data: [
        reportData.readiness.ready.count,
        reportData.readiness.conditional.count,
        reportData.readiness.notReady.count,
        reportData.readiness.unassigned.count
      ],
      backgroundColor: [
        'rgba(40, 167, 69, 0.8)',   // Green for Ready
        'rgba(255, 193, 7, 0.8)',    // Yellow for Conditional
        'rgba(220, 53, 69, 0.8)',    // Red for Not Ready
        'rgba(108, 117, 125, 0.8)'   // Gray for Unassigned
      ],
      borderColor: [
        'rgba(40, 167, 69, 1)',
        'rgba(255, 193, 7, 1)',
        'rgba(220, 53, 69, 1)',
        'rgba(108, 117, 125, 1)'
      ],
      borderWidth: 1
    }]
  };

  // Prepare service cost chart data (top 10)
  const topServices = reportData.services.topServices.slice(0, 10);
  const serviceCostChartData = {
    labels: topServices.map(s => s.service),
    datasets: [{
      label: 'Monthly Cost (USD)',
      data: topServices.map(s => s.totalCost),
      backgroundColor: 'rgba(0, 123, 255, 0.8)',
      borderColor: 'rgba(0, 123, 255, 1)',
      borderWidth: 1
    }]
  };

  // Get top 5 services and regions for summary cards
  const top5Services = reportData.services.topServices.slice(0, 5);
  const top5Regions = reportData.regions.slice(0, 5);

  // Calculate wave distribution if strategy results available
  const waveDistribution = strategyResults?.wavePlan ? {
    wave1: strategyResults.wavePlan.wave1?.length || 0,
    wave2: strategyResults.wavePlan.wave2?.length || 0,
    wave3: strategyResults.wavePlan.wave3?.length || 0
  } : {
    wave1: 0,
    wave2: 0,
    wave3: 0
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h2 className="mb-0">
                <i className="bi bi-file-earmark-text me-2"></i>
                Migration Assessment Report
              </h2>
              <p className="mb-0 mt-2">
                Comprehensive analysis of {reportData.summary.totalWorkloads.toLocaleString()} workloads 
                across {reportData.summary.totalRegions} regions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card border-primary">
            <div className="card-body text-center">
              <h5 className="card-title text-primary">
                <i className="bi bi-server me-2"></i>
                Total Workloads
              </h5>
              <h2 className="text-primary">{reportData.summary.totalWorkloads.toLocaleString()}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-success">
            <div className="card-body text-center">
              <h5 className="card-title text-success">
                <i className="bi bi-currency-dollar me-2"></i>
                Monthly Cost
              </h5>
              <h2 className="text-success">{formatCurrency(reportData.summary.totalMonthlyCost)}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-warning">
            <div className="card-body text-center">
              <h5 className="card-title text-warning">
                <i className="bi bi-speedometer2 me-2"></i>
                Avg Complexity
              </h5>
              <h2 className="text-warning">
                {reportData.summary.averageComplexity 
                  ? reportData.summary.averageComplexity.toFixed(1) 
                  : 'N/A'}
              </h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-info">
            <div className="card-body text-center">
              <h5 className="card-title text-info">
                <i className="bi bi-globe me-2"></i>
                Regions
              </h5>
              <h2 className="text-info">{reportData.summary.totalRegions}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Readiness Distribution Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card border-success">
            <div className="card-body text-center">
              <h6 className="card-title text-success">Ready</h6>
              <h4>{reportData.readiness.ready.count.toLocaleString()}</h4>
              <small className="text-muted">
                {formatCurrency(reportData.readiness.ready.totalCost)}
              </small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-warning">
            <div className="card-body text-center">
              <h6 className="card-title text-warning">Conditional</h6>
              <h4>{reportData.readiness.conditional.count.toLocaleString()}</h4>
              <small className="text-muted">
                {formatCurrency(reportData.readiness.conditional.totalCost)}
              </small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-danger">
            <div className="card-body text-center">
              <h6 className="card-title text-danger">Not Ready</h6>
              <h4>{reportData.readiness.notReady.count.toLocaleString()}</h4>
              <small className="text-muted">
                {formatCurrency(reportData.readiness.notReady.totalCost)}
              </small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-secondary">
            <div className="card-body text-center">
              <h6 className="card-title text-secondary">Unassigned</h6>
              <h4>{reportData.readiness.unassigned.count.toLocaleString()}</h4>
              <small className="text-muted">
                {formatCurrency(reportData.readiness.unassigned.totalCost)}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Complexity Distribution</h5>
            </div>
            <div className="card-body">
              <Doughnut 
                data={complexityChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.parsed || 0;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${label}: ${value} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Migration Readiness</h5>
            </div>
            <div className="card-body">
              <Doughnut 
                data={readinessChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.parsed || 0;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${label}: ${value} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top Services Chart */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Top 10 AWS Services by Cost</h5>
            </div>
            <div className="card-body">
              <Bar 
                data={serviceCostChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `Cost: ${formatCurrency(context.parsed.y)}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return formatCurrency(value);
                        }
                      }
                    }
                  }
                }}
                height={300}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Services and Regions */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Top 5 AWS Services</h5>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                {top5Services.map((service, index) => (
                  <li key={service.service} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <strong>{index + 1}.</strong> {service.service}
                      <br />
                      <small className="text-muted">→ {service.gcpService}</small>
                    </span>
                    <span className="badge bg-primary rounded-pill">
                      {formatCurrency(service.totalCost)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">Top 5 Regions</h5>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                {top5Regions.map((region, index) => (
                  <li key={region.region} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <strong>{index + 1}.</strong> {region.region}
                      <br />
                      <small className="text-muted">{region.count} workloads</small>
                    </span>
                    <span className="badge bg-info rounded-pill">
                      {formatCurrency(region.totalCost)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Wave Distribution */}
      {strategyResults && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">Migration Wave Distribution</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 text-center">
                    <h3 className="text-primary">Wave 1</h3>
                    <h2>{waveDistribution.wave1 || 0}</h2>
                    <small className="text-muted">Quick Wins</small>
                  </div>
                  <div className="col-md-4 text-center">
                    <h3 className="text-warning">Wave 2</h3>
                    <h2>{waveDistribution.wave2 || 0}</h2>
                    <small className="text-muted">Standard</small>
                  </div>
                  <div className="col-md-4 text-center">
                    <h3 className="text-danger">Wave 3</h3>
                    <h2>{waveDistribution.wave3 || 0}</h2>
                    <small className="text-muted">Complex</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technology Summary */}
      <div className="row mb-4">
        <div className="col-12">
          <TechnologySummary workloads={workloads} />
        </div>
      </div>

      {/* Regional Breakdown */}
      <div className="row mb-4">
        <div className="col-12">
          <RegionalBreakdown workloads={workloads} />
        </div>
      </div>

      {/* Cost Comparison */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-body">
              <label htmlFor="targetRegion" className="form-label">
                <strong>Target GCP Region:</strong>
              </label>
              <select
                id="targetRegion"
                className="form-select"
                value={targetRegion}
                onChange={(e) => setTargetRegion(e.target.value)}
              >
                <option value="us-central1">US Central (Iowa)</option>
                <option value="us-east1">US East (South Carolina)</option>
                <option value="us-west1">US West (Oregon)</option>
                <option value="europe-west1">Europe (Belgium)</option>
                <option value="europe-west4">Europe (Netherlands)</option>
                <option value="asia-east1">Asia (Taiwan)</option>
                <option value="asia-southeast1">Asia (Singapore)</option>
              </select>
            </div>
          </div>
          <CostComparison 
            serviceAggregation={reportData.services.allServices}
            targetRegion={targetRegion}
          />
        </div>
      </div>

      {/* PDF Download Button */}
      <div className="row mb-4">
        <div className="col-12 text-center">
          <button 
            className="btn btn-primary btn-lg"
            onClick={async () => {
              try {
                const reportData = ReportDataAggregator.generateReportSummary(workloads);
                const serviceAggregation = ReportDataAggregator.aggregateByService(workloads);
                const estimates = await GCPCostEstimator.estimateAllServiceCosts(serviceAggregation, targetRegion);
                
                await generateComprehensiveReportPDF(
                  reportData,
                  estimates,
                  strategyResults,
                  assessmentResults,
                  {
                    projectName: 'AWS to GCP Migration Assessment',
                    targetRegion
                  }
                );
              } catch (error) {
                console.error('PDF generation failed:', error);
                alert(`PDF generation failed: ${error.message}`);
              }
            }}
          >
            <i className="bi bi-download me-2"></i>
            Download Comprehensive PDF Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportSummaryView;
