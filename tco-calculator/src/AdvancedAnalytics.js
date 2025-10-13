import React, { useState, useEffect } from 'react';
import { Line, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

function AdvancedAnalytics({ workloads, tco, roi }) {
  const [predictions, setPredictions] = useState(null);
  const [trends, setTrends] = useState(null);
  const [maturityScore, setMaturityScore] = useState(null);

  useEffect(() => {
    if (workloads && workloads.length > 0) {
      generatePredictions();
      generateTrends();
      calculateMaturityScore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workloads, tco, roi]);

  const generatePredictions = () => {
    // Predict cost trends over 36 months with growth factors
    const months = 36;
    const monthlyGcpCost = (tco.gcp || 0) / months;
    const monthlyAwsCost = (tco.aws || 0) / months;
    const monthlyAzureCost = (tco.azure || 0) / months;

    // Growth factors (workloads tend to grow over time)
    const growthRate = 0.015; // 1.5% monthly growth
    const optimizationFactor = 0.92; // 8% savings from optimizations over time

    const predictedGcp = [];
    const predictedAws = [];
    const predictedAzure = [];
    const labels = [];

    for (let i = 0; i < months; i++) {
      const month = i + 1;
      labels.push(`Month ${month}`);

      // Apply growth and optimization factors
      const growthMultiplier = Math.pow(1 + growthRate, i);
      const optimizationMultiplier = i > 6 ? optimizationFactor : 1; // Optimizations kick in after 6 months

      predictedGcp.push((monthlyGcpCost * growthMultiplier * optimizationMultiplier).toFixed(2));
      predictedAws.push((monthlyAwsCost * growthMultiplier * optimizationMultiplier).toFixed(2));
      predictedAzure.push((monthlyAzureCost * growthMultiplier * optimizationMultiplier).toFixed(2));
    }

    setPredictions({
      labels,
      datasets: [
        {
          label: 'GCP Predicted',
          data: predictedGcp,
          borderColor: 'rgba(66, 133, 244, 1)',
          backgroundColor: 'rgba(66, 133, 244, 0.1)',
          tension: 0.4,
        },
        {
          label: 'AWS Predicted',
          data: predictedAws,
          borderColor: 'rgba(255, 153, 0, 1)',
          backgroundColor: 'rgba(255, 153, 0, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Azure Predicted',
          data: predictedAzure,
          borderColor: 'rgba(0, 120, 212, 1)',
          backgroundColor: 'rgba(0, 120, 212, 0.1)',
          tension: 0.4,
        },
      ],
    });
  };

  const generateTrends = () => {
    // Analyze workload distribution and trends
    const typeDistribution = {};
    const osDistribution = {};
    let totalCpu = 0;
    let totalMemory = 0;
    let totalStorage = 0;

    workloads.forEach(w => {
      typeDistribution[w.type] = (typeDistribution[w.type] || 0) + 1;
      osDistribution[w.os] = (osDistribution[w.os] || 0) + 1;
      totalCpu += parseInt(w.cpu) || 0;
      totalMemory += parseInt(w.memory) || 0;
      totalStorage += parseInt(w.storage) || 0;
    });

    setTrends({
      typeDistribution: {
        labels: Object.keys(typeDistribution),
        datasets: [{
          data: Object.values(typeDistribution),
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
          ],
        }],
      },
      osDistribution: {
        labels: Object.keys(osDistribution),
        datasets: [{
          data: Object.values(osDistribution),
          backgroundColor: [
            'rgba(66, 133, 244, 0.7)',
            'rgba(52, 168, 83, 0.7)',
            'rgba(251, 188, 5, 0.7)',
          ],
        }],
      },
      totals: { totalCpu, totalMemory, totalStorage },
    });
  };

  const calculateMaturityScore = () => {
    // Calculate cloud readiness maturity score across 6 dimensions
    let strategyScore = 0;
    let organizationScore = 0;
    let platformScore = 0;
    let securityScore = 0;
    let operationsScore = 0;
    let peopleScore = 0;

    // Strategy: Based on workload diversity and planning
    const workloadTypes = new Set(workloads.map(w => w.type)).size;
    strategyScore = Math.min(100, (workloadTypes / 5) * 100); // More diverse = better strategy

    // Organization: Based on workload documentation (dependencies)
    const documentedWorkloads = workloads.filter(w => w.dependencies && w.dependencies.trim() !== '').length;
    organizationScore = (documentedWorkloads / workloads.length) * 100;

    // Platform: Based on resource sizing maturity
    const wellSizedWorkloads = workloads.filter(w =>
      parseInt(w.cpu) >= 2 && parseInt(w.memory) >= 4 && parseInt(w.storage) >= 10
    ).length;
    platformScore = (wellSizedWorkloads / workloads.length) * 100;

    // Security: Baseline score (would need more data for accurate assessment)
    securityScore = 60; // Conservative estimate

    // Operations: Based on monitoring readiness (storage/traffic data)
    const monitoredWorkloads = workloads.filter(w =>
      parseInt(w.monthlyTraffic) > 0 || parseInt(w.storage) > 0
    ).length;
    operationsScore = (monitoredWorkloads / workloads.length) * 100;

    // People: Baseline score (would need team assessment data)
    peopleScore = 55; // Conservative estimate

    setMaturityScore({
      labels: ['Strategy', 'Organization', 'Platform', 'Security', 'Operations', 'People'],
      datasets: [{
        label: 'Cloud Maturity Score',
        data: [strategyScore, organizationScore, platformScore, securityScore, operationsScore, peopleScore],
        backgroundColor: 'rgba(66, 133, 244, 0.2)',
        borderColor: 'rgba(66, 133, 244, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(66, 133, 244, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(66, 133, 244, 1)',
      }],
      overall: ((strategyScore + organizationScore + platformScore + securityScore + operationsScore + peopleScore) / 6).toFixed(1),
    });
  };

  const getMaturityLevel = (score) => {
    if (score >= 80) return { level: 'Optimized', color: 'success', description: 'Advanced cloud-native practices' };
    if (score >= 60) return { level: 'Managed', color: 'primary', description: 'Good foundation with room to grow' };
    if (score >= 40) return { level: 'Defined', color: 'info', description: 'Basic processes in place' };
    if (score >= 20) return { level: 'Initial', color: 'warning', description: 'Early stages of cloud adoption' };
    return { level: 'Ad-hoc', color: 'danger', description: 'Significant improvement needed' };
  };

  return (
    <div className="card mb-4">
      <div className="card-header bg-dark text-white">
        <h3 className="mb-0">📈 Advanced Analytics & Predictions</h3>
        <small>AI-powered insights, trends, and forecasting</small>
      </div>
      <div className="card-body">
        {workloads && workloads.length > 0 ? (
          <div>
            {/* Cloud Maturity Assessment */}
            {maturityScore && (
              <div className="row mb-4">
                <div className="col-md-6">
                  <h5>Cloud Maturity Assessment</h5>
                  <div className="card bg-light">
                    <div className="card-body text-center">
                      <div className="display-4 mb-2">
                        <span className={`badge bg-${getMaturityLevel(maturityScore.overall).color}`}>
                          {maturityScore.overall}
                        </span>
                      </div>
                      <h4 className={`text-${getMaturityLevel(maturityScore.overall).color}`}>
                        {getMaturityLevel(maturityScore.overall).level}
                      </h4>
                      <p className="text-muted">{getMaturityLevel(maturityScore.overall).description}</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <h5>Maturity Radar</h5>
                  <div style={{ height: '300px' }}>
                    <Radar
                      data={maturityScore}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          r: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { stepSize: 20 },
                          },
                        },
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cost Predictions */}
            {predictions && (
              <div className="mb-4">
                <h5>36-Month Cost Forecast</h5>
                <div className="card">
                  <div className="card-body">
                    <div style={{ height: '350px' }}>
                      <Line
                        data={predictions}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { position: 'top' },
                            title: {
                              display: true,
                              text: 'Predicted Monthly Cloud Costs (with 1.5% growth & 8% optimization after 6 months)',
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  let label = context.dataset.label || '';
                                  if (label) label += ': ';
                                  label += '$' + parseFloat(context.parsed.y).toLocaleString();
                                  return label;
                                },
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                callback: (value) => '$' + value.toLocaleString(),
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Workload Distribution Analysis */}
            {trends && (
              <div className="row mb-4">
                <div className="col-md-6">
                  <h5>Workload Type Distribution</h5>
                  <div className="card">
                    <div className="card-body">
                      <div style={{ height: '300px' }}>
                        <Doughnut
                          data={trends.typeDistribution}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { position: 'right' },
                            },
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <h5>Operating System Distribution</h5>
                  <div className="card">
                    <div className="card-body">
                      <div style={{ height: '300px' }}>
                        <Doughnut
                          data={trends.osDistribution}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { position: 'right' },
                            },
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Resource Totals */}
            {trends && (
              <div className="row">
                <div className="col-md-12">
                  <h5>Total Resource Requirements</h5>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="card bg-primary text-white">
                        <div className="card-body text-center">
                          <h2>{trends.totals.totalCpu}</h2>
                          <p className="mb-0">Total vCPUs</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card bg-success text-white">
                        <div className="card-body text-center">
                          <h2>{trends.totals.totalMemory} GB</h2>
                          <p className="mb-0">Total Memory</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card bg-info text-white">
                        <div className="card-body text-center">
                          <h2>{(trends.totals.totalStorage / 1024).toFixed(1)} TB</h2>
                          <p className="mb-0">Total Storage</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Key Insights */}
            <div className="alert alert-info mt-4">
              <h5>🔍 Key Insights</h5>
              <ul className="mb-0">
                <li>
                  <strong>Cost Trend:</strong> Your cloud costs are predicted to grow {((1.015 ** 36 - 1) * 100).toFixed(1)}% over 36 months due to workload growth, but optimizations can reduce costs by ~8% after the first 6 months.
                </li>
                <li>
                  <strong>ROI Optimization:</strong> GCP shows an ROI of {(roi.gcp || 0).toFixed(1)}%. Focus on reserved instances and committed use discounts to improve this by 15-30%.
                </li>
                <li>
                  <strong>Maturity:</strong> Your organization scores {maturityScore?.overall || 0}/100 in cloud maturity. Invest in training and automation to reach "Optimized" level (80+).
                </li>
                <li>
                  <strong>Resource Distribution:</strong> You have {workloads.length} workloads requiring {trends?.totals.totalCpu || 0} vCPUs. Consider containerization for workloads with {'<'}4 vCPUs to optimize resource utilization.
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="alert alert-warning">
            <strong>No workload data available.</strong>
            <p className="mb-0">Discover workloads first to see advanced analytics and predictions.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdvancedAnalytics;
