/**
 * Technology Summary Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import TechnologySummary from '../TechnologySummary.js';

describe('TechnologySummary', () => {
  const mockWorkloads = [
    { id: '1', service: 'EC2', monthlyCost: 100, complexityScore: 3 },
    { id: '2', service: 'EC2', monthlyCost: 150, complexityScore: 4 },
    { id: '3', service: 'S3', monthlyCost: 200 },
    { id: '4', service: 'RDS', monthlyCost: 300, complexityScore: 7 }
  ];

  it('should render info message when no workloads', () => {
    render(<TechnologySummary workloads={[]} />);
    expect(screen.getByText(/No workloads available/i)).toBeInTheDocument();
  });

  it('should render technology summary card with info message', () => {
    render(<TechnologySummary workloads={mockWorkloads} />);

    // Component now shows an info card instead of table
    expect(screen.getAllByText(/Technology Summary/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Technology summary available in PDF report/i)).toBeInTheDocument();
    expect(screen.getByText(/4.*workloads/i)).toBeInTheDocument();
  });

  it('should display info message with workload count', () => {
    render(<TechnologySummary workloads={mockWorkloads} />);

    // Should show the workload count in the message
    expect(screen.getByText(/4.*workloads/i)).toBeInTheDocument();
    expect(screen.getByText(/UI rendering disabled for performance/i)).toBeInTheDocument();
  });

  it('should show card header with correct title', () => {
    render(<TechnologySummary workloads={mockWorkloads} />);

    expect(screen.getByText(/Technology Summary - AWS Services Breakdown/i)).toBeInTheDocument();
  });

  it('should show correct workload count for many workloads', () => {
    const manyWorkloads = Array.from({ length: 20 }, (_, i) => ({
      id: `w${i}`,
      service: `Service${i}`,
      monthlyCost: 100
    }));

    render(<TechnologySummary workloads={manyWorkloads} />);

    // Should show the correct count (20 workloads)
    expect(screen.getByText(/20.*workloads/i)).toBeInTheDocument();
  });

  it('should handle single workload', () => {
    const singleWorkload = [
      { id: '1', service: 'EC2', monthlyCost: 100 }
    ];

    render(<TechnologySummary workloads={singleWorkload} />);

    expect(screen.getByText(/1.*workload/i)).toBeInTheDocument();
  });

  it('should handle workloads without complexity scores', () => {
    const workloadsNoComplexity = [
      { id: '1', service: 'EC2', monthlyCost: 100 }
    ];

    render(<TechnologySummary workloads={workloadsNoComplexity} />);

    // Should still show the info message
    expect(screen.getByText(/Technology summary available in PDF report/i)).toBeInTheDocument();
  });
});
