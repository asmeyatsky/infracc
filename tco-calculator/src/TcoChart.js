import React, { useEffect, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  TcoComparisonChart,
  BreakEvenChart,
  RiskRadarChart,
  SensitivityChart,
  CostBreakdownChart,
  ForecastingChart,
  CarbonFootprintChart
} from './components/EnhancedVisualizations';

// Main TCO Chart component that can render different chart types
const TcoChart = ({ data, options, chartType = 'bar' }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    const chart = chartRef.current;

    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  }, []);

  // Render the appropriate chart based on type
  switch (chartType) {
    case 'tcoComparison':
      return <TcoComparisonChart data={data} options={options} />;
    case 'breakEven':
      return <BreakEvenChart breakEvenData={data} timeframe={options?.timeframe || 36} />;
    case 'riskRadar':
      return <RiskRadarChart riskData={data} />;
    case 'sensitivity':
      return <SensitivityChart sensitivityData={data} />;
    case 'costBreakdown':
      return <CostBreakdownChart breakdownData={data} />;
    case 'forecasting':
      return <ForecastingChart forecastData={data} />;
    case 'carbonFootprint':
      return <CarbonFootprintChart footprintData={data} />;
    default:
      return <Bar ref={chartRef} data={data} options={options} />;
  }
};

export default TcoChart;
