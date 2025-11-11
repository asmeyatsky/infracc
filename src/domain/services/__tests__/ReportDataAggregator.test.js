/**
 * Report Data Aggregator Service Tests
 */

import { ReportDataAggregator } from '../ReportDataAggregator.js';
import { Workload } from '../../../domain/entities/Workload.js';

describe('ReportDataAggregator', () => {
  // Mock workload data - use plain objects instead of Workload entities for testing
  const createMockWorkload = (overrides = {}) => {
    const workloadData = {
      id: `workload-${Math.random().toString(36).substr(2, 9)}`,
      name: `Test Workload ${Math.random().toString(36).substr(2, 5)}`,
      service: 'EC2',
      type: 'vm',
      sourceProvider: 'aws',
      cpu: 4,
      memory: 8,
      storage: 100,
      monthlyCost: 100,
      region: 'us-east-1',
      ...overrides
    };
    
    // Add assessment if provided
    if (overrides.complexityScore !== undefined) {
      workloadData.assessment = {
        complexityScore: overrides.complexityScore,
        riskFactors: overrides.riskFactors || []
      };
    }
    
    // Return plain object - ReportDataAggregator handles both Workload entities and plain objects
    return workloadData;
  };

  describe('aggregateByComplexity', () => {
    it('should aggregate workloads by complexity ranges', () => {
      const workloads = [
        createMockWorkload({ complexityScore: 2 }), // Low
        createMockWorkload({ complexityScore: 2 }), // Low
        createMockWorkload({ complexityScore: 5 }), // Medium
        createMockWorkload({ complexityScore: 8 }), // High
        createMockWorkload({ complexityScore: 9 }), // High
        createMockWorkload({}) // Unassigned
      ];

      const result = ReportDataAggregator.aggregateByComplexity(workloads);

      expect(result.low.count).toBe(2);
      expect(result.medium.count).toBe(1);
      expect(result.high.count).toBe(2);
      expect(result.unassigned.count).toBe(1);
    });

    it('should calculate total costs per complexity range', () => {
      const workloads = [
        createMockWorkload({ complexityScore: 2, monthlyCost: 100 }),
        createMockWorkload({ complexityScore: 5, monthlyCost: 200 }),
        createMockWorkload({ complexityScore: 8, monthlyCost: 300 })
      ];

      const result = ReportDataAggregator.aggregateByComplexity(workloads);

      expect(result.low.totalCost).toBe(100);
      expect(result.medium.totalCost).toBe(200);
      expect(result.high.totalCost).toBe(300);
    });

    it('should handle empty workloads array', () => {
      const result = ReportDataAggregator.aggregateByComplexity([]);

      expect(result.low.count).toBe(0);
      expect(result.medium.count).toBe(0);
      expect(result.high.count).toBe(0);
      expect(result.unassigned.count).toBe(0);
    });
  });

  describe('aggregateByService', () => {
    it('should aggregate workloads by AWS service', () => {
      const workloads = [
        createMockWorkload({ service: 'EC2', monthlyCost: 100 }),
        createMockWorkload({ service: 'EC2', monthlyCost: 150 }),
        createMockWorkload({ service: 'S3', monthlyCost: 200 }),
        createMockWorkload({ service: 'RDS', monthlyCost: 300 })
      ];

      const result = ReportDataAggregator.aggregateByService(workloads);

      expect(result.length).toBe(3);
      expect(result.find(s => s.service === 'EC2').count).toBe(2);
      expect(result.find(s => s.service === 'EC2').totalCost).toBe(250);
      expect(result.find(s => s.service === 'S3').count).toBe(1);
      expect(result.find(s => s.service === 'RDS').count).toBe(1);
    });

    it('should calculate average complexity per service', () => {
      const workloads = [
        createMockWorkload({ service: 'EC2', complexityScore: 2 }),
        createMockWorkload({ service: 'EC2', complexityScore: 4 }),
        createMockWorkload({ service: 'EC2', complexityScore: 6 })
      ];

      const result = ReportDataAggregator.aggregateByService(workloads);
      const ec2Service = result.find(s => s.service === 'EC2');

      expect(ec2Service.averageComplexity).toBe(4); // (2+4+6)/3
    });

    it('should sort services by total cost descending', () => {
      const workloads = [
        createMockWorkload({ service: 'EC2', monthlyCost: 100 }),
        createMockWorkload({ service: 'S3', monthlyCost: 500 }),
        createMockWorkload({ service: 'RDS', monthlyCost: 300 })
      ];

      const result = ReportDataAggregator.aggregateByService(workloads);

      expect(result[0].service).toBe('S3');
      expect(result[1].service).toBe('RDS');
      expect(result[2].service).toBe('EC2');
    });
  });

  describe('aggregateByRegion', () => {
    it('should aggregate workloads by AWS region', () => {
      const workloads = [
        createMockWorkload({ region: 'us-east-1', monthlyCost: 100 }),
        createMockWorkload({ region: 'us-east-1', monthlyCost: 150 }),
        createMockWorkload({ region: 'us-west-2', monthlyCost: 200 })
      ];

      const result = ReportDataAggregator.aggregateByRegion(workloads);

      expect(result.length).toBe(2);
      expect(result.find(r => r.region === 'us-east-1').count).toBe(2);
      expect(result.find(r => r.region === 'us-east-1').totalCost).toBe(250);
      expect(result.find(r => r.region === 'us-west-2').count).toBe(1);
    });

    it('should identify top 3 services per region', () => {
      const workloads = [
        createMockWorkload({ region: 'us-east-1', service: 'EC2', monthlyCost: 100 }),
        createMockWorkload({ region: 'us-east-1', service: 'EC2', monthlyCost: 50 }),
        createMockWorkload({ region: 'us-east-1', service: 'S3', monthlyCost: 200 }),
        createMockWorkload({ region: 'us-east-1', service: 'RDS', monthlyCost: 150 })
      ];

      const result = ReportDataAggregator.aggregateByRegion(workloads);
      const usEast1 = result.find(r => r.region === 'us-east-1');

      expect(usEast1.topServices.length).toBeLessThanOrEqual(3);
      expect(usEast1.topServices).toContain('EC2');
      expect(usEast1.topServices).toContain('S3');
    });

    it('should sort regions by total cost descending', () => {
      const workloads = [
        createMockWorkload({ region: 'us-east-1', monthlyCost: 100 }),
        createMockWorkload({ region: 'us-west-2', monthlyCost: 500 }),
        createMockWorkload({ region: 'eu-west-1', monthlyCost: 300 })
      ];

      const result = ReportDataAggregator.aggregateByRegion(workloads);

      expect(result[0].region).toBe('us-west-2');
      expect(result[1].region).toBe('eu-west-1');
      expect(result[2].region).toBe('us-east-1');
    });
  });

  describe('aggregateByReadiness', () => {
    it('should categorize workloads by migration readiness', () => {
      const workloads = [
        createMockWorkload({ complexityScore: 2, riskFactors: [] }), // Ready
        createMockWorkload({ complexityScore: 5, riskFactors: ['dependency'] }), // Conditional
        createMockWorkload({ complexityScore: 8, riskFactors: ['custom', 'legacy'] }), // Not Ready
        createMockWorkload({}) // Unassigned
      ];

      const result = ReportDataAggregator.aggregateByReadiness(workloads);

      expect(result.ready.count).toBe(1);
      expect(result.conditional.count).toBe(1);
      expect(result.notReady.count).toBe(1);
      expect(result.unassigned.count).toBe(1);
    });

    it('should calculate total costs per readiness category', () => {
      const workloads = [
        createMockWorkload({ complexityScore: 2, riskFactors: [], monthlyCost: 100 }),
        createMockWorkload({ complexityScore: 5, riskFactors: [], monthlyCost: 200 }),
        createMockWorkload({ complexityScore: 8, riskFactors: [], monthlyCost: 300 })
      ];

      const result = ReportDataAggregator.aggregateByReadiness(workloads);

      expect(result.ready.totalCost).toBe(100);
      expect(result.conditional.totalCost).toBe(200);
      expect(result.notReady.totalCost).toBe(300);
    });
  });

  describe('getTopServicesWithOther', () => {
    it('should return top N services and other category', () => {
      const services = Array.from({ length: 20 }, (_, i) => ({
        service: `Service${i}`,
        count: 1,
        totalCost: 100 - i,
        averageComplexity: 5
      }));

      const result = ReportDataAggregator.getTopServicesWithOther(services, 15);

      expect(result.topServices.length).toBe(15);
      expect(result.other).toBeTruthy();
      expect(result.other.count).toBe(5);
      expect(result.other.service).toBe('Other');
    });

    it('should return null for other if all services fit in top N', () => {
      const services = Array.from({ length: 10 }, (_, i) => ({
        service: `Service${i}`,
        count: 1,
        totalCost: 100 - i,
        averageComplexity: 5
      }));

      const result = ReportDataAggregator.getTopServicesWithOther(services, 15);

      expect(result.topServices.length).toBe(10);
      expect(result.other).toBeNull();
    });
  });

  describe('generateReportSummary', () => {
    it('should generate comprehensive report summary', () => {
      const workloads = [
        createMockWorkload({ service: 'EC2', region: 'us-east-1', complexityScore: 3, monthlyCost: 100 }),
        createMockWorkload({ service: 'S3', region: 'us-west-2', complexityScore: 5, monthlyCost: 200 }),
        createMockWorkload({ service: 'RDS', region: 'us-east-1', complexityScore: 8, monthlyCost: 300 })
      ];

      const result = ReportDataAggregator.generateReportSummary(workloads);

      expect(result.summary.totalWorkloads).toBe(3);
      expect(result.summary.totalMonthlyCost).toBe(600);
      expect(result.summary.totalRegions).toBe(2);
      expect(result.summary.totalServices).toBe(3);
      expect(result.complexity.low.count).toBe(1);
      expect(result.complexity.medium.count).toBe(1);
      expect(result.complexity.high.count).toBe(1);
      expect(result.services.topServices.length).toBeGreaterThan(0);
      expect(result.regions.length).toBe(2);
    });

    it('should calculate average complexity correctly', () => {
      const workloads = [
        createMockWorkload({ complexityScore: 2 }),
        createMockWorkload({ complexityScore: 5 }),
        createMockWorkload({ complexityScore: 8 })
      ];

      const result = ReportDataAggregator.generateReportSummary(workloads);

      expect(result.summary.averageComplexity).toBe(5); // (2+5+8)/3
    });

    it('should handle workloads without assessments', () => {
      const workloads = [
        createMockWorkload({ monthlyCost: 100 }),
        createMockWorkload({ monthlyCost: 200 })
      ];

      const result = ReportDataAggregator.generateReportSummary(workloads);

      expect(result.summary.totalWorkloads).toBe(2);
      expect(result.summary.totalMonthlyCost).toBe(300);
      expect(result.summary.averageComplexity).toBeNull();
    });
  });

  describe('_extractComplexity', () => {
    it('should extract complexity from assessment', () => {
      const workload = createMockWorkload({ complexityScore: 5 });
      const complexity = ReportDataAggregator._extractComplexity(workload);
      expect(complexity).toBe(5);
    });

    it('should handle missing complexity', () => {
      const workload = createMockWorkload({});
      const complexity = ReportDataAggregator._extractComplexity(workload);
      expect(complexity).toBeNull();
    });
  });

  describe('_extractCost', () => {
    it('should extract monthly cost', () => {
      const workload = createMockWorkload({ monthlyCost: 150 });
      const cost = ReportDataAggregator._extractCost(workload);
      expect(cost).toBe(150);
    });

    it('should handle missing cost', () => {
      const workload = createMockWorkload({ monthlyCost: undefined });
      const cost = ReportDataAggregator._extractCost(workload);
      expect(cost).toBe(0);
    });
  });
});
