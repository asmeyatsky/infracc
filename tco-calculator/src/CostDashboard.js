import React, { useState, useEffect } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

function CostDashboard({ workloads }) {
  const [timeRange, setTimeRange] = useState('30days');

  // Simulate cost data based on workloads
  const generateCostData = () => {
    if (!workloads || workloads.length === 0) {
      return {
        current: { gcp: 0, aws: 0, azure: 0 },
        historical: [],
        byService: {},
        byWorkload: [],
      };
    }

    // Calculate current costs based on workloads
    const costPerCPU = 30; // $30/month per vCPU
    const costPerGB = 4; // $4/month per GB RAM
    const costPerGBStorage = 0.5; // $0.50/month per GB storage

    let gcpCost = 0;
    let awsCost = 0;
    let azureCost = 0;
    const byService = {
      compute: 0,
      storage: 0,
      database: 0,
      networking: 0,
      other: 0,
    };
    const byWorkload = [];

    workloads.forEach(workload => {
      const workloadCost =
        (workload.cpu * costPerCPU) +
        (workload.memory * costPerGB) +
        (workload.storage * costPerGBStorage) +
        (workload.monthlyTraffic * 0.1);

      // Distribute across clouds (for demo purposes)
      gcpCost += workloadCost * 0.6;
      awsCost += workloadCost * 0.25;
      azureCost += workloadCost * 0.15;

      // By service type
      if (workload.type === 'vm' || workload.type === 'container' || workload.type === 'application') {
        byService.compute += workloadCost;
      } else if (workload.type === 'storage') {
        byService.storage += workloadCost;
      } else if (workload.type === 'database') {
        byService.database += workloadCost;
      } else {
        byService.other += workloadCost;
      }

      byWorkload.push({
        name: workload.name,
        cost: workloadCost,
        type: workload.type,
      });
    });

    // Generate historical data (last 30 days)
    const historical = [];
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variance = 0.85 + Math.random() * 0.3; // 85-115% of base cost

      historical.push({
        date: date.toISOString().split('T')[0],
        gcp: gcpCost * variance,
        aws: awsCost * variance,
        azure: azureCost * variance,
        total: (gcpCost + awsCost + azureCost) * variance,
      });
    }

    return {
      current: { gcp: gcpCost, aws: awsCost, azure: azureCost },
      historical,
      byService,
      byWorkload: byWorkload.sort((a, b) => b.cost - a.cost).slice(0, 10),
    };
  };

  const [costData, setCostData] = useState(() => generateCostData());

  useEffect(() => {
    setCostData(generateCostData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workloads, timeRange]);

  const totalCurrentCost = costData.current.gcp + costData.current.aws + costData.current.azure;

  // Historical trend chart data
  const trendChartData = {
    labels: costData.historical.map(d => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        label: 'GCP',
        data: costData.historical.map(d => d.gcp),
        borderColor: '#4285F4',
        backgroundColor: 'rgba(66, 133, 244, 0.1)',
        tension: 0.4,
      },
      {
        label: 'AWS',
        data: costData.historical.map(d => d.aws),
        borderColor: '#FF9900',
        backgroundColor: 'rgba(255, 153, 0, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Azure',
        data: costData.historical.map(d => d.azure),
        borderColor: '#0078D4',
        backgroundColor: 'rgba(0, 120, 212, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Multi-Cloud Cost Trend',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toFixed(0);
          }
        }
      }
    }
  };

  // Cloud distribution doughnut chart
  const distributionChartData = {
    labels: ['GCP', 'AWS', 'Azure'],
    datasets: [
      {
        data: [costData.current.gcp, costData.current.aws, costData.current.azure],
        backgroundColor: [
          'rgba(66, 133, 244, 0.8)',
          'rgba(255, 153, 0, 0.8)',
          'rgba(0, 120, 212, 0.8)',
        ],
        borderColor: [
          '#4285F4',
          '#FF9900',
          '#0078D4',
        ],
        borderWidth: 2,
      },
    ],
  };

  const distributionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: 'Cost Distribution by Cloud',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: $${context.parsed.toFixed(2)} (${percentage}%)`;
          }
        }
      }
    },
  };

  // Service breakdown bar chart
  const serviceChartData = {
    labels: ['Compute', 'Storage', 'Database', 'Networking', 'Other'],
    datasets: [
      {
        label: 'Cost by Service',
        data: [
          costData.byService.compute,
          costData.byService.storage,
          costData.byService.database,
          costData.byService.networking,
          costData.byService.other,
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(201, 203, 207, 0.8)',
        ],
      },
    ],
  };

  const serviceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Cost by Service Type',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `$${context.parsed.y.toFixed(2)}/month`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toFixed(0);
          }
        }
      }
    }
  };

  // Calculate month-over-month change (simulated)
  const lastMonthCost = totalCurrentCost * (0.92 + Math.random() * 0.16); // 92-108% of current
  const costChange = ((totalCurrentCost - lastMonthCost) / lastMonthCost) * 100;

  // Projected next month (simulated trend)
  const projectedNextMonth = totalCurrentCost * (1.02 + Math.random() * 0.06); // 102-108% growth

  return (
    <div className="card mb-4">
      <div className="card-header bg-dark text-white">
        <h3 className="mb-0">📊 FinOps Cost Dashboard</h3>
        <small>Real-time multi-cloud cost monitoring and optimization</small>
      </div>
      <div className="card-body">
        {workloads.length === 0 ? (
          <div className="alert alert-info">
            <strong>No workload data available.</strong> Add workloads in the Discovery tab to see cost analytics.
          </div>
        ) : (
          <>
            {/* Time Range Selector */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="btn-group" role="group">
                  <button
                    type="button"
                    className={`btn ${timeRange === '7days' ? 'btn-dark' : 'btn-outline-dark'}`}
                    onClick={() => setTimeRange('7days')}
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    className={`btn ${timeRange === '30days' ? 'btn-dark' : 'btn-outline-dark'}`}
                    onClick={() => setTimeRange('30days')}
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    className={`btn ${timeRange === '90days' ? 'btn-dark' : 'btn-outline-dark'}`}
                    onClick={() => setTimeRange('90days')}
                  >
                    Last 90 Days
                  </button>
                </div>
              </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="row mb-4">
              <div className="col-md-3 mb-3">
                <div className="card text-center h-100">
                  <div className="card-body">
                    <h6 className="text-muted mb-2">Current Monthly Cost</h6>
                    <h2 className="mb-1">${totalCurrentCost.toFixed(2)}</h2>
                    <span className={`badge ${costChange >= 0 ? 'bg-danger' : 'bg-success'}`}>
                      {costChange >= 0 ? '▲' : '▼'} {Math.abs(costChange).toFixed(1)}% vs last month
                    </span>
                  </div>
                </div>
              </div>

              <div className="col-md-3 mb-3">
                <div className="card text-center h-100" style={{backgroundColor: '#E8F5E9'}}>
                  <div className="card-body">
                    <h6 className="text-muted mb-2">GCP Spending</h6>
                    <h2 className="mb-1" style={{color: '#4285F4'}}>${costData.current.gcp.toFixed(2)}</h2>
                    <span className="badge bg-secondary">
                      {((costData.current.gcp / totalCurrentCost) * 100).toFixed(1)}% of total
                    </span>
                  </div>
                </div>
              </div>

              <div className="col-md-3 mb-3">
                <div className="card text-center h-100" style={{backgroundColor: '#FFF3E0'}}>
                  <div className="card-body">
                    <h6 className="text-muted mb-2">AWS Spending</h6>
                    <h2 className="mb-1" style={{color: '#FF9900'}}>${costData.current.aws.toFixed(2)}</h2>
                    <span className="badge bg-secondary">
                      {((costData.current.aws / totalCurrentCost) * 100).toFixed(1)}% of total
                    </span>
                  </div>
                </div>
              </div>

              <div className="col-md-3 mb-3">
                <div className="card text-center h-100" style={{backgroundColor: '#E3F2FD'}}>
                  <div className="card-body">
                    <h6 className="text-muted mb-2">Azure Spending</h6>
                    <h2 className="mb-1" style={{color: '#0078D4'}}>${costData.current.azure.toFixed(2)}</h2>
                    <span className="badge bg-secondary">
                      {((costData.current.azure / totalCurrentCost) * 100).toFixed(1)}% of total
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Forecast & Budget Alert */}
            <div className="row mb-4">
              <div className="col-md-6 mb-3">
                <div className="card h-100">
                  <div className="card-header bg-info text-white">
                    <strong>📈 Next Month Forecast</strong>
                  </div>
                  <div className="card-body">
                    <h3>${projectedNextMonth.toFixed(2)}</h3>
                    <p className="mb-2">
                      Projected increase: <strong>${(projectedNextMonth - totalCurrentCost).toFixed(2)}</strong>
                    </p>
                    <div className="progress" style={{height: '25px'}}>
                      <div
                        className="progress-bar bg-info"
                        style={{width: '100%'}}
                      >
                        Trending: +{(((projectedNextMonth - totalCurrentCost) / totalCurrentCost) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6 mb-3">
                <div className="card h-100">
                  <div className="card-header bg-warning text-dark">
                    <strong>⚠️ Budget Alert</strong>
                  </div>
                  <div className="card-body">
                    <p className="mb-2">Monthly Budget: <strong>$15,000</strong></p>
                    <p className="mb-2">Current Spend: <strong>${totalCurrentCost.toFixed(2)}</strong></p>
                    <div className="progress" style={{height: '25px'}}>
                      <div
                        className={`progress-bar ${totalCurrentCost / 15000 > 0.9 ? 'bg-danger' : totalCurrentCost / 15000 > 0.75 ? 'bg-warning' : 'bg-success'}`}
                        style={{width: `${Math.min((totalCurrentCost / 15000) * 100, 100)}%`}}
                      >
                        {((totalCurrentCost / 15000) * 100).toFixed(1)}%
                      </div>
                    </div>
                    {totalCurrentCost / 15000 > 0.9 && (
                      <div className="alert alert-danger mt-2 mb-0">
                        <small><strong>Warning:</strong> You've exceeded 90% of your budget!</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="row mb-4">
              <div className="col-lg-8 mb-3">
                <div className="card h-100">
                  <div className="card-body">
                    <div style={{ height: '350px' }}>
                      <Line data={trendChartData} options={trendChartOptions} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4 mb-3">
                <div className="card h-100">
                  <div className="card-body">
                    <div style={{ height: '350px' }}>
                      <Doughnut data={distributionChartData} options={distributionChartOptions} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Breakdown */}
            <div className="row mb-4">
              <div className="col-md-6 mb-3">
                <div className="card h-100">
                  <div className="card-body">
                    <div style={{ height: '300px' }}>
                      <Bar data={serviceChartData} options={serviceChartOptions} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6 mb-3">
                <div className="card h-100">
                  <div className="card-header">
                    <strong>Top 10 Costliest Workloads</strong>
                  </div>
                  <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="table table-sm table-hover mb-0">
                      <thead>
                        <tr>
                          <th>Workload</th>
                          <th>Type</th>
                          <th className="text-end">Monthly Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {costData.byWorkload.map((workload, index) => (
                          <tr key={index}>
                            <td>{workload.name}</td>
                            <td>
                              <span className="badge bg-secondary">{workload.type}</span>
                            </td>
                            <td className="text-end">${workload.cost.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="row">
              <div className="col-12">
                <div className="card">
                  <div className="card-header bg-success text-white">
                    <strong>💡 Cost Optimization Opportunities</strong>
                  </div>
                  <div className="card-body">
                    <ul className="mb-0">
                      <li>Potential savings with committed use discounts: <strong>~${(totalCurrentCost * 0.3).toFixed(2)}/month</strong></li>
                      <li>Rightsizing underutilized resources could save: <strong>~${(totalCurrentCost * 0.15).toFixed(2)}/month</strong></li>
                      <li>{costData.byWorkload.filter(w => w.cost < 10).length} low-cost workloads could be consolidated</li>
                      <li>Review idle resources in off-peak hours for additional savings</li>
                    </ul>
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

export default CostDashboard;
