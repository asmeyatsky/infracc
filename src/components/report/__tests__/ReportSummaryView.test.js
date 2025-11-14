/**
 * Report Summary View Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportSummaryView from '../ReportSummaryView.js';

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>
}));

// Mock Chart.js registration
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  BarElement: jest.fn(),
  ArcElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn()
}));

// Mock child components
jest.mock('../TechnologySummary.js', () => {
  return function TechnologySummary({ workloads }) {
    return <div data-testid="technology-summary">Technology Summary ({workloads?.length || 0} workloads)</div>;
  };
});

jest.mock('../RegionalBreakdown.js', () => {
  return function RegionalBreakdown({ workloads }) {
    return <div data-testid="regional-breakdown">Regional Breakdown ({workloads?.length || 0} workloads)</div>;
  };
});

jest.mock('../CostComparison.js', () => {
  return function CostComparison({ serviceAggregation, targetRegion }) {
    return (
      <div data-testid="cost-comparison">
        Cost Comparison ({serviceAggregation?.length || 0} services, {targetRegion})
      </div>
    );
  };
});

// Mock PDF generator
jest.mock('../../../utils/reportPdfGenerator.js', () => ({
  generateComprehensiveReportPDF: jest.fn().mockResolvedValue()
}));

// Mock services
jest.mock('../../../domain/services/ReportDataAggregator.js', () => ({
  ReportDataAggregator: {
    generateReportSummary: (workloads) => {
      // Handle empty workloads
      if (!workloads || workloads.length === 0) {
        return {
          summary: {
            totalWorkloads: 0,
            totalMonthlyCost: 0,
            averageComplexity: 0,
            totalRegions: 0,
            totalServices: 0
          },
          complexity: {
            low: { count: 0, totalCost: 0 },
            medium: { count: 0, totalCost: 0 },
            high: { count: 0, totalCost: 0 },
            unassigned: { count: 0, totalCost: 0 }
          },
          readiness: {
            ready: { count: 0, totalCost: 0 },
            conditional: { count: 0, totalCost: 0 },
            notReady: { count: 0, totalCost: 0 },
            unassigned: { count: 0, totalCost: 0 }
          },
          services: {
            topServices: [],
            other: null
          },
          regions: [],
          allServices: []
        };
      }
      
      return {
        summary: {
          totalWorkloads: workloads.length,
          totalMonthlyCost: workloads.reduce((sum, w) => sum + (w.monthlyCost || 0), 0),
          averageComplexity: 5,
          totalRegions: 2,
          totalServices: 3
        },
        complexity: {
          low: { count: 1, totalCost: 100 },
          medium: { count: 1, totalCost: 200 },
          high: { count: 1, totalCost: 300 },
          unassigned: { count: 0, totalCost: 0 }
        },
        readiness: {
          ready: { count: 1, totalCost: 100 },
          conditional: { count: 1, totalCost: 200 },
          notReady: { count: 1, totalCost: 300 },
          unassigned: { count: 0, totalCost: 0 }
        },
        services: {
          topServices: [
            { service: 'EC2', count: 1, totalCost: 100, gcpService: 'Compute Engine' },
            { service: 'S3', count: 1, totalCost: 200, gcpService: 'Cloud Storage' }
          ],
          other: null
        },
        regions: [
          { region: 'us-east-1', count: 2, totalCost: 300 },
          { region: 'us-west-2', count: 1, totalCost: 300 }
        ],
        allServices: []
      };
    }),
    aggregateByService: jest.fn(() => [])
  }
}));

jest.mock('../../../domain/services/GCPCostEstimator.js', () => ({
  GCPCostEstimator: {
    estimateAllServiceCosts: jest.fn().mockResolvedValue([])
  }
}));

describe('ReportSummaryView', () => {
  const mockWorkloads = [
    { id: '1', name: 'Workload 1', service: 'EC2', monthlyCost: 100, region: 'us-east-1' },
    { id: '2', name: 'Workload 2', service: 'S3', monthlyCost: 200, region: 'us-west-2' },
    { id: '3', name: 'Workload 3', service: 'RDS', monthlyCost: 300, region: 'us-east-1' }
  ];

  const mockAssessmentResults = {
    results: [
      { workloadId: '1', complexityScore: 3 },
      { workloadId: '2', complexityScore: 5 },
      { workloadId: '3', complexityScore: 8 }
    ]
  };

  const mockStrategyResults = {
    wavePlan: {
      wave1: ['1'],
      wave2: ['2'],
      wave3: ['3']
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state when no report data', () => {
    render(<ReportSummaryView workloads={[]} />);
    expect(screen.getByText(/Loading report data/i)).toBeInTheDocument();
  });

  it('should render report summary with workloads', async () => {
    render(<ReportSummaryView workloads={mockWorkloads} />);

    await waitFor(() => {
      expect(screen.getByText(/Migration Assessment Report/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/3/)).toBeInTheDocument(); // Total workloads
  });

  it('should display executive summary cards', async () => {
    render(<ReportSummaryView workloads={mockWorkloads} />);

    await waitFor(() => {
      expect(screen.getByText(/Total Workloads/i)).toBeInTheDocument();
      expect(screen.getByText(/Monthly Cost/i)).toBeInTheDocument();
      expect(screen.getByText(/Avg Complexity/i)).toBeInTheDocument();
      expect(screen.getByText(/Regions/i)).toBeInTheDocument();
    });
  });

  it('should display complexity and readiness charts', async () => {
    render(<ReportSummaryView workloads={mockWorkloads} />);

    await waitFor(() => {
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    });

    // Should have 2 doughnut charts (complexity and readiness)
    const charts = screen.getAllByTestId('doughnut-chart');
    expect(charts.length).toBeGreaterThanOrEqual(2);
  });

  it('should display technology summary component', async () => {
    render(<ReportSummaryView workloads={mockWorkloads} />);

    await waitFor(() => {
      expect(screen.getByTestId('technology-summary')).toBeInTheDocument();
    });
  });

  it('should display regional breakdown component', async () => {
    render(<ReportSummaryView workloads={mockWorkloads} />);

    await waitFor(() => {
      expect(screen.getByTestId('regional-breakdown')).toBeInTheDocument();
    });
  });

  it('should display cost comparison component', async () => {
    render(<ReportSummaryView workloads={mockWorkloads} />);

    await waitFor(() => {
      expect(screen.getByTestId('cost-comparison')).toBeInTheDocument();
    });
  });

  it('should display wave distribution when strategy results provided', async () => {
    render(
      <ReportSummaryView
        workloads={mockWorkloads}
        strategyResults={mockStrategyResults}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Migration Wave Distribution/i)).toBeInTheDocument();
      expect(screen.getByText(/Wave 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Wave 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Wave 3/i)).toBeInTheDocument();
    });
  });

  it('should allow changing target region', async () => {
    const user = userEvent.setup();
    render(<ReportSummaryView workloads={mockWorkloads} />);

    await waitFor(() => {
      const regionSelect = screen.getByLabelText(/Target GCP Region/i);
      expect(regionSelect).toBeInTheDocument();
    });

    const regionSelect = screen.getByLabelText(/Target GCP Region/i);
    await user.selectOptions(regionSelect, 'us-west1');

    expect(regionSelect.value).toBe('us-west1');
  });

  it('should generate PDF when download button clicked', async () => {
    const { generateComprehensiveReportPDF } = require('../../../utils/reportPdfGenerator.js');
    const user = userEvent.setup();

    render(<ReportSummaryView workloads={mockWorkloads} />);

    await waitFor(() => {
      const downloadButton = screen.getByText(/Download Comprehensive PDF Report/i);
      expect(downloadButton).toBeInTheDocument();
    });

    const downloadButton = screen.getByText(/Download Comprehensive PDF Report/i);
    await user.click(downloadButton);

    await waitFor(() => {
      expect(generateComprehensiveReportPDF).toHaveBeenCalled();
    });
  });

  it('should handle empty workloads gracefully', () => {
    render(<ReportSummaryView workloads={[]} />);
    expect(screen.getByText(/Loading report data/i)).toBeInTheDocument();
  });

  it('should format currency correctly', async () => {
    render(<ReportSummaryView workloads={mockWorkloads} />);

    await waitFor(() => {
      // Check for currency formatting (should contain $)
      const costElements = screen.getAllByText(/\$/);
      expect(costElements.length).toBeGreaterThan(0);
    });
  });
});
