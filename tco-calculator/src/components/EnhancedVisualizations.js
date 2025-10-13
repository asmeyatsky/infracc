/**
 * Enhanced TCO Visualizations
 * Advanced charts and graphs for TCO analysis
 */

import React from 'react';
import { 
  Bar, 
  Line, 
  Pie, 
  Scatter,
  Radar
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale
);

// Enhanced TCO Comparison Chart
export const TcoComparisonChart = ({ data, options }) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'TCO Comparison Analysis',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += '$' + context.parsed.y.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString('en-US');
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  return <Bar data={data} options={{...defaultOptions, ...options}} />;
};

// Break-even Analysis Chart
export const BreakEvenChart = ({ breakEvenData, timeframe }) => {
  if (!breakEvenData) return null;

  const data = {
    labels: Array.from({ length: Math.ceil(timeframe / 12) + 1 }, (_, i) => `${i} Years`),
    datasets: [
      {
        label: 'On-Premise Cumulative Cost',
        data: Array.from({ length: Math.ceil(timeframe / 12) + 1 }, (_, i) => {
          // Calculate cumulative on-premise cost
          return (breakEvenData.onPremiseMonthly * 12 * i) + breakEvenData.migrationCost;
        }),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        type: 'line',
        fill: false
      },
      {
        label: 'Cloud Cumulative Cost',
        data: Array.from({ length: Math.ceil(timeframe / 12) + 1 }, (_, i) => {
          // Calculate cumulative cloud cost (including migration)
          return (breakEvenData.cloudMonthly * 12 * i) + breakEvenData.migrationCost;
        }),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        type: 'line',
        fill: false
      },
      {
        label: 'Break-even Point',
        data: Array.from({ length: Math.ceil(timeframe / 12) + 1 }, (_, i) => {
          const year = i;
          if (year === Math.floor(breakEvenData.months / 12)) {
            return breakEvenData.migrationCost + (breakEvenData.cloudMonthly * breakEvenData.months);
          }
          return null;
        }),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        type: 'line',
        showLine: false,
        pointStyle: 'triangle',
        pointRadius: 8
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Break-even Analysis (${Math.round(breakEvenData.months)} months)`,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      annotation: {
        annotations: {
          breakEvenLine: {
            type: 'line',
            mode: 'vertical',
            scaleID: 'x',
            value: Math.floor(breakEvenData.months / 12),
            borderColor: 'rgb(75, 192, 192)',
            borderWidth: 2,
            label: {
              content: `Break-even: ${Math.round(breakEvenData.months)} months`,
              enabled: true,
              position: 'top'
            }
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString('en-US');
          }
        }
      }
    }
  };

  return <Line data={data} options={options} />;
};

// Risk-Adjusted TCO Radar Chart
export const RiskRadarChart = ({ riskData }) => {
  if (!riskData) return null;

  const data = {
    labels: [
      'Financial Risk', 
      'Operational Risk', 
      'Security Risk', 
      'Compliance Risk', 
      'Vendor Risk'
    ],
    datasets: [
      {
        label: 'Risk Level',
        data: [
          riskData.financialRisk || 0,
          riskData.operationalRisk || 0,
          riskData.securityRisk || 0,
          riskData.complianceRisk || 0,
          riskData.vendorRisk || 0
        ],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(255, 99, 132, 1)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Risk Assessment Radar',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      legend: {
        display: false
      }
    },
    scales: {
      r: {
        angleLines: {
          display: true,
        },
        suggestedMin: 0,
        suggestedMax: 100
      }
    }
  };

  return <Radar data={data} options={options} />;
};

// Sensitivity Analysis Chart
export const SensitivityChart = ({ sensitivityData }) => {
  if (!sensitivityData) return null;

  const data = {
    labels: sensitivityData.sensitivityData.map(item => `${item.factor * 100}%`),
    datasets: [
      {
        label: 'TCO Impact',
        data: sensitivityData.sensitivityData.map(item => item.tco),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        type: 'line',
        fill: true
      },
      {
        label: 'Savings Impact',
        data: sensitivityData.sensitivityData.map(item => item.savings),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        type: 'line',
        fill: true
      },
      {
        label: 'ROI Impact',
        data: sensitivityData.sensitivityData.map(item => item.roi),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        type: 'line',
        fill: false,
        yAxisID: 'y1'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Sensitivity Analysis: ${sensitivityData.variable || 'Cost Variable'}`,
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString('en-US');
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value) {
            return value.toFixed(2) + '%';
          }
        }
      }
    }
  };

  return <Line data={data} options={options} />;
};

// Cost Breakdown Pie Chart
export const CostBreakdownChart = ({ breakdownData }) => {
  if (!breakdownData) return null;

  const data = {
    labels: Object.keys(breakdownData),
    datasets: [
      {
        label: 'Cost Breakdown',
        data: Object.values(breakdownData),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
          'rgb(255, 159, 64)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Cost Breakdown by Category',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: $${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${percentage}%)`;
          }
        }
      }
    }
  };

  return <Pie data={data} options={options} />;
};

// Forecasting Chart
export const ForecastingChart = ({ forecastData }) => {
  if (!forecastData || forecastData.length === 0) return null;

  const data = {
    labels: forecastData.map(item => `Year ${item.year}`),
    datasets: [
      {
        label: 'On-Premise Cost',
        data: forecastData.map(item => item.onPremise),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        type: 'line',
        tension: 0.4
      },
      {
        label: 'Cloud Cost',
        data: forecastData.map(item => item.cloud),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        type: 'line',
        tension: 0.4
      },
      {
        label: 'Total Cloud Cost',
        data: forecastData.map(item => item.totalCloud),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        type: 'line',
        tension: 0.4
      },
      {
        label: 'Cumulative Savings',
        data: forecastData.map(item => item.cumulativeSavings),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        type: 'line',
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '5-Year Cost Forecast',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString('en-US');
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString('en-US');
          }
        }
      }
    }
  };

  return <Line data={data} options={options} />;
};

// Carbon Footprint Comparison
export const CarbonFootprintChart = ({ footprintData }) => {
  if (!footprintData) return null;

  const data = {
    labels: ['On-Premise', 'AWS', 'Azure', 'GCP', 'Total Cloud'],
    datasets: [
      {
        label: 'Carbon Footprint (kg CO2)',
        data: [
          footprintData.onPremise,
          footprintData.aws,
          footprintData.azure,
          footprintData.gcp,
          footprintData.aws + footprintData.azure + footprintData.gcp
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(255, 159, 64)',
          'rgb(54, 162, 235)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)'
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    elements: {
      bar: {
        borderWidth: 2,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Carbon Footprint Comparison',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.parsed.x.toFixed(2)} kg CO2`;
          }
        }
      }
    },
  };

  return <Bar data={data} options={options} />;
};