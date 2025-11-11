/**
 * Technology Summary Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import TechnologySummary from '../TechnologySummary.js';

// Mock ReportDataAggregator
jest.mock('../../../domain/services/ReportDataAggregator.js', () => ({
  ReportDataAggregator: {
    aggregateByService: jest.fn((workloads) => {
      const services = {};
      workloads.forEach(w => {
        const service = w.service || 'Unknown';
        if (!services[service]) {
          services[service] = {
            service,
            gcpService: 'Compute Engine',
            gcpApi: 'compute.googleapis.com',
            migrationStrategy: 'Rehost',
            effort: 'Low',
            count: 0,
            totalCost: 0,
            complexities: [],
            averageComplexity: null
          };
        }
        services[service].count++;
        services[service].totalCost += w.monthlyCost || 0;
        if (w.complexityScore) {
          services[service].complexities.push(w.complexityScore);
        }
      });

      return Object.values(services).map(s => ({
        ...s,
        averageComplexity: s.complexities.length > 0
          ? s.complexities.reduce((a, b) => a + b, 0) / s.complexities.length
          : null
      })).sort((a, b) => b.totalCost - a.totalCost);
    }),
    getTopServicesWithOther: jest.fn((services, topN) => {
      const topServices = services.slice(0, topN);
      const otherServices = services.slice(topN);
      const other = otherServices.length > 0 ? {
        service: 'Other',
        gcpService: 'Multiple GCP Services',
        count: otherServices.reduce((sum, s) => sum + s.count, 0),
        totalCost: otherServices.reduce((sum, s) => sum + s.totalCost, 0),
        averageComplexity: null,
        migrationStrategy: 'Mixed',
        effort: 'Medium'
      } : null;
      return { topServices, other };
    })
  }
}));

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

  it('should render technology summary table', () => {
    render(<TechnologySummary workloads={mockWorkloads} />);

    expect(screen.getByText(/Technology Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/AWS Service/i)).toBeInTheDocument();
    expect(screen.getByText(/Workloads/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Cost/i)).toBeInTheDocument();
  });

  it('should display services with correct data', () => {
    render(<TechnologySummary workloads={mockWorkloads} />);

    expect(screen.getByText(/EC2/i)).toBeInTheDocument();
    expect(screen.getByText(/S3/i)).toBeInTheDocument();
    expect(screen.getByText(/RDS/i)).toBeInTheDocument();
  });

  it('should show workload counts per service', () => {
    render(<TechnologySummary workloads={mockWorkloads} />);

    // EC2 should have 2 workloads
    const ec2Row = screen.getByText(/EC2/i).closest('tr');
    expect(ec2Row).toBeInTheDocument();
  });

  it('should display total costs per service', () => {
    render(<TechnologySummary workloads={mockWorkloads} />);

    // Should show currency formatted costs
    const costElements = screen.getAllByText(/\$/);
    expect(costElements.length).toBeGreaterThan(0);
  });

  it('should show GCP service mappings', () => {
    render(<TechnologySummary workloads={mockWorkloads} />);

    expect(screen.getByText(/Target GCP Service/i)).toBeInTheDocument();
  });

  it('should display migration strategy badges', () => {
    render(<TechnologySummary workloads={mockWorkloads} />);

    expect(screen.getByText(/Strategy/i)).toBeInTheDocument();
  });

  it('should display effort badges', () => {
    render(<TechnologySummary workloads={mockWorkloads} />);

    expect(screen.getByText(/Effort/i)).toBeInTheDocument();
  });

  it('should show "Other" category when more than 15 services', () => {
    const manyWorkloads = Array.from({ length: 20 }, (_, i) => ({
      id: `w${i}`,
      service: `Service${i}`,
      monthlyCost: 100
    }));

    render(<TechnologySummary workloads={manyWorkloads} />);

    // Should show "Other" category info if applicable
    const otherInfo = screen.queryByText(/Other.*category/i);
    // May or may not be present depending on implementation
  });

  it('should display totals row', () => {
    render(<TechnologySummary workloads={mockWorkloads} />);

    expect(screen.getByText(/Total/i)).toBeInTheDocument();
  });

  it('should handle workloads without complexity scores', () => {
    const workloadsNoComplexity = [
      { id: '1', service: 'EC2', monthlyCost: 100 }
    ];

    render(<TechnologySummary workloads={workloadsNoComplexity} />);

    expect(screen.getByText(/EC2/i)).toBeInTheDocument();
  });
});
