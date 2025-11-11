/**
 * Cost Comparison Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CostComparison from '../CostComparison.js';

// Mock GCPCostEstimator
const mockCostEstimates = [
  {
    service: 'EC2',
    costEstimate: {
      awsCost: 100,
      gcpOnDemand: 90,
      gcp1YearCUD: 67.5,
      gcp3YearCUD: 49.5,
      savings1Year: 32.5,
      savings3Year: 50.5,
      savingsPercent1Year: 32.5,
      savingsPercent3Year: 50.5,
      gcpService: 'Compute Engine',
      region: 'us-central1'
    }
  },
  {
    service: 'S3',
    costEstimate: {
      awsCost: 200,
      gcpOnDemand: 180,
      gcp1YearCUD: 153,
      gcp3YearCUD: 126,
      savings1Year: 47,
      savings3Year: 74,
      savingsPercent1Year: 23.5,
      savingsPercent3Year: 37,
      gcpService: 'Cloud Storage',
      region: 'us-central1'
    }
  }
];

jest.mock('../../../domain/services/GCPCostEstimator.js', () => ({
  GCPCostEstimator: {
    estimateAllServiceCosts: jest.fn().mockResolvedValue(mockCostEstimates),
    calculateTotalCosts: jest.fn((estimates) => {
      const totals = estimates.reduce((acc, est) => {
        const costs = est.costEstimate || {};
        acc.awsTotal += costs.awsCost || 0;
        acc.gcpOnDemandTotal += costs.gcpOnDemand || 0;
        acc.gcp1YearCUDTotal += costs.gcp1YearCUD || 0;
        acc.gcp3YearCUDTotal += costs.gcp3YearCUD || 0;
        return acc;
      }, {
        awsTotal: 0,
        gcpOnDemandTotal: 0,
        gcp1YearCUDTotal: 0,
        gcp3YearCUDTotal: 0
      });

      return {
        ...totals,
        savings1Year: totals.awsTotal - totals.gcp1YearCUDTotal,
        savings3Year: totals.awsTotal - totals.gcp3YearCUDTotal,
        savingsPercent1Year: totals.awsTotal > 0
          ? ((totals.awsTotal - totals.gcp1YearCUDTotal) / totals.awsTotal) * 100
          : 0,
        savingsPercent3Year: totals.awsTotal > 0
          ? ((totals.awsTotal - totals.gcp3YearCUDTotal) / totals.awsTotal) * 100
          : 0
      };
    })
  }
}));

describe('CostComparison', () => {
  const mockServiceAggregation = [
    { service: 'EC2', totalCost: 100 },
    { service: 'S3', totalCost: 200 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(<CostComparison serviceAggregation={mockServiceAggregation} />);
    expect(screen.getByText(/Loading cost estimates/i)).toBeInTheDocument();
  });

  it('should render cost comparison table after loading', async () => {
    render(<CostComparison serviceAggregation={mockServiceAggregation} />);

    await waitFor(() => {
      expect(screen.getByText(/Cost Comparison/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/AWS Service/i)).toBeInTheDocument();
    expect(screen.getByText(/GCP Service/i)).toBeInTheDocument();
    expect(screen.getByText(/AWS Cost/i)).toBeInTheDocument();
    expect(screen.getByText(/GCP On-Demand/i)).toBeInTheDocument();
  });

  it('should display AWS and GCP costs', async () => {
    render(<CostComparison serviceAggregation={mockServiceAggregation} />);

    await waitFor(() => {
      expect(screen.getByText(/EC2/i)).toBeInTheDocument();
      expect(screen.getByText(/S3/i)).toBeInTheDocument();
      expect(screen.getByText(/Compute Engine/i)).toBeInTheDocument();
      expect(screen.getByText(/Cloud Storage/i)).toBeInTheDocument();
    });
  });

  it('should display CUD pricing options', async () => {
    render(<CostComparison serviceAggregation={mockServiceAggregation} />);

    await waitFor(() => {
      expect(screen.getByText(/GCP 1-Year CUD/i)).toBeInTheDocument();
      expect(screen.getByText(/GCP 3-Year CUD/i)).toBeInTheDocument();
    });
  });

  it('should display savings information', async () => {
    render(<CostComparison serviceAggregation={mockServiceAggregation} />);

    await waitFor(() => {
      expect(screen.getByText(/Savings/i)).toBeInTheDocument();
    });
  });

  it('should display total cost summary', async () => {
    render(<CostComparison serviceAggregation={mockServiceAggregation} />);

    await waitFor(() => {
      expect(screen.getByText(/Total/i)).toBeInTheDocument();
    });
  });

  it('should show target region in header', async () => {
    render(<CostComparison serviceAggregation={mockServiceAggregation} targetRegion="us-west1" />);

    await waitFor(() => {
      expect(screen.getByText(/us-west1/i)).toBeInTheDocument();
    });
  });

  it('should handle empty service aggregation', async () => {
    render(<CostComparison serviceAggregation={[]} />);

    await waitFor(() => {
      expect(screen.getByText(/No cost estimates available/i)).toBeInTheDocument();
    });
  });

  it('should handle errors gracefully', async () => {
    const { GCPCostEstimator } = require('../../../domain/services/GCPCostEstimator.js');
    GCPCostEstimator.estimateAllServiceCosts.mockRejectedValueOnce(new Error('API Error'));

    render(<CostComparison serviceAggregation={mockServiceAggregation} />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading cost estimates/i)).toBeInTheDocument();
    });
  });

  it('should display CUD information', async () => {
    render(<CostComparison serviceAggregation={mockServiceAggregation} />);

    await waitFor(() => {
      expect(screen.getByText(/About Committed Use Discounts/i)).toBeInTheDocument();
      expect(screen.getByText(/1-Year CUD/i)).toBeInTheDocument();
      expect(screen.getByText(/3-Year CUD/i)).toBeInTheDocument();
    });
  });

  it('should format currency correctly', async () => {
    render(<CostComparison serviceAggregation={mockServiceAggregation} />);

    await waitFor(() => {
      const costElements = screen.getAllByText(/\$/);
      expect(costElements.length).toBeGreaterThan(0);
    });
  });

  it('should recalculate when target region changes', async () => {
    const { GCPCostEstimator } = require('../../../domain/services/GCPCostEstimator.js');
    const { rerender } = render(
      <CostComparison serviceAggregation={mockServiceAggregation} targetRegion="us-central1" />
    );

    await waitFor(() => {
      expect(GCPCostEstimator.estimateAllServiceCosts).toHaveBeenCalledWith(
        mockServiceAggregation,
        'us-central1'
      );
    });

    rerender(<CostComparison serviceAggregation={mockServiceAggregation} targetRegion="us-west1" />);

    await waitFor(() => {
      expect(GCPCostEstimator.estimateAllServiceCosts).toHaveBeenCalledWith(
        mockServiceAggregation,
        'us-west1'
      );
    });
  });
});
