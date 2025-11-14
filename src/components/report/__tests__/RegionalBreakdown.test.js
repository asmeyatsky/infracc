/**
 * Regional Breakdown Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import RegionalBreakdown from '../RegionalBreakdown.js';

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

  it('should render regional breakdown card with info message', () => {
    render(<RegionalBreakdown workloads={mockWorkloads} />);

    // Component now shows an info card instead of table
    expect(screen.getAllByText(/Regional Breakdown/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Regional breakdown available in PDF report/i)).toBeInTheDocument();
    expect(screen.getByText(/4.*workloads/i)).toBeInTheDocument();
  });

  it('should display info message with workload count', () => {
    render(<RegionalBreakdown workloads={mockWorkloads} />);

    // Should show the workload count in the message
    expect(screen.getByText(/4.*workloads/i)).toBeInTheDocument();
    expect(screen.getByText(/UI rendering disabled for performance/i)).toBeInTheDocument();
  });

  it('should show card header with correct title', () => {
    render(<RegionalBreakdown workloads={mockWorkloads} />);

    expect(screen.getByText(/Regional Breakdown - Workload Distribution by AWS Region/i)).toBeInTheDocument();
  });

  it('should show correct workload count for many workloads', () => {
    const manyWorkloads = Array.from({ length: 20 }, (_, i) => ({
      id: `w${i}`,
      region: 'us-east-1',
      service: 'EC2',
      monthlyCost: 100
    }));

    render(<RegionalBreakdown workloads={manyWorkloads} />);

    // Should show the correct count (20 workloads)
    expect(screen.getByText(/20.*workloads/i)).toBeInTheDocument();
  });

  it('should handle single workload', () => {
    const singleWorkload = [
      { id: '1', region: 'us-east-1', service: 'EC2', monthlyCost: 100 }
    ];

    render(<RegionalBreakdown workloads={singleWorkload} />);

    expect(screen.getByText(/1.*workload/i)).toBeInTheDocument();
  });

  it('should handle workloads without region', () => {
    const workloadsNoRegion = [
      { id: '1', service: 'EC2', monthlyCost: 100 }
    ];

    render(<RegionalBreakdown workloads={workloadsNoRegion} />);

    // Should still show the info message
    expect(screen.getByText(/Regional breakdown available in PDF report/i)).toBeInTheDocument();
  });
});
