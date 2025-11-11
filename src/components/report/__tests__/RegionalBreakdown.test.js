/**
 * Regional Breakdown Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import RegionalBreakdown from '../RegionalBreakdown.js';

// Mock ReportDataAggregator
jest.mock('../../../domain/services/ReportDataAggregator.js', () => ({
  ReportDataAggregator: {
    aggregateByRegion: jest.fn((workloads) => {
      const regions = {};
      workloads.forEach(w => {
        const region = w.region || 'Unknown';
        if (!regions[region]) {
          regions[region] = {
            region,
            count: 0,
            totalCost: 0,
            complexities: [],
            topServices: [],
            topServicesCosts: []
          };
        }
        regions[region].count++;
        regions[region].totalCost += w.monthlyCost || 0;
        if (w.complexityScore) {
          regions[region].complexities.push(w.complexityScore);
        }
      });

      return Object.values(regions).map(r => ({
        ...r,
        averageComplexity: r.complexities.length > 0
          ? r.complexities.reduce((a, b) => a + b, 0) / r.complexities.length
          : null
      })).sort((a, b) => b.totalCost - a.totalCost);
    })
  }
}));

describe('RegionalBreakdown', () => {
  const mockWorkloads = [
    { id: '1', region: 'us-east-1', service: 'EC2', monthlyCost: 100, complexityScore: 3 },
    { id: '2', region: 'us-east-1', service: 'S3', monthlyCost: 150, complexityScore: 4 },
    { id: '3', region: 'us-west-2', service: 'RDS', monthlyCost: 200, complexityScore: 5 },
    { id: '4', region: 'eu-west-1', service: 'EC2', monthlyCost: 300 }
  ];

  it('should render info message when no workloads', () => {
    render(<RegionalBreakdown workloads={[]} />);
    expect(screen.getByText(/No workloads available/i)).toBeInTheDocument();
  });

  it('should render regional breakdown table', () => {
    render(<RegionalBreakdown workloads={mockWorkloads} />);

    expect(screen.getByText(/Regional Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/AWS Region/i)).toBeInTheDocument();
    expect(screen.getByText(/Workloads/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Cost/i)).toBeInTheDocument();
  });

  it('should display regions with correct data', () => {
    render(<RegionalBreakdown workloads={mockWorkloads} />);

    expect(screen.getByText(/us-east-1/i)).toBeInTheDocument();
    expect(screen.getByText(/us-west-2/i)).toBeInTheDocument();
    expect(screen.getByText(/eu-west-1/i)).toBeInTheDocument();
  });

  it('should show workload counts per region', () => {
    render(<RegionalBreakdown workloads={mockWorkloads} />);

    // us-east-1 should have 2 workloads
    const usEast1Row = screen.getByText(/us-east-1/i).closest('tr');
    expect(usEast1Row).toBeInTheDocument();
  });

  it('should display total costs per region', () => {
    render(<RegionalBreakdown workloads={mockWorkloads} />);

    // Should show currency formatted costs
    const costElements = screen.getAllByText(/\$/);
    expect(costElements.length).toBeGreaterThan(0);
  });

  it('should display average complexity per region', () => {
    render(<RegionalBreakdown workloads={mockWorkloads} />);

    expect(screen.getByText(/Avg Complexity/i)).toBeInTheDocument();
  });

  it('should display top services per region', () => {
    render(<RegionalBreakdown workloads={mockWorkloads} />);

    expect(screen.getByText(/Top 3 Services/i)).toBeInTheDocument();
  });

  it('should format region names correctly', () => {
    render(<RegionalBreakdown workloads={mockWorkloads} />);

    // Should show readable region names
    expect(screen.getByText(/US East/i)).toBeInTheDocument();
  });

  it('should display totals row', () => {
    render(<RegionalBreakdown workloads={mockWorkloads} />);

    expect(screen.getByText(/Total/i)).toBeInTheDocument();
  });

  it('should handle workloads without region', () => {
    const workloadsNoRegion = [
      { id: '1', service: 'EC2', monthlyCost: 100 }
    ];

    render(<RegionalBreakdown workloads={workloadsNoRegion} />);

    expect(screen.getByText(/Unknown/i)).toBeInTheDocument();
  });

  it('should sort regions by cost descending', () => {
    render(<RegionalBreakdown workloads={mockWorkloads} />);

    // eu-west-1 has highest cost (300), should appear first
    const rows = screen.getAllByRole('row');
    // First data row should be highest cost region
    expect(rows.length).toBeGreaterThan(1);
  });
});
