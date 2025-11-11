/**
 * GCP Cost Estimator Service Tests
 */

import { GCPCostEstimator } from '../GCPCostEstimator.js';

// Mock CloudPricingAPI
jest.mock('../../../utils/cloudPricingAPI.js', () => ({
  default: {
    getGCPPrices: jest.fn().mockResolvedValue({
      onDemand: 90,
      sustainedUse: 75
    })
  }
}));

describe('GCPCostEstimator', () => {
  describe('estimateServiceCosts', () => {
    it('should estimate GCP costs for a service', async () => {
      const serviceData = {
        service: 'EC2',
        totalCost: 100
      };

      const result = await GCPCostEstimator.estimateServiceCosts(
        serviceData,
        'Compute Engine',
        'us-central1'
      );

      expect(result.awsCost).toBe(100);
      expect(result.gcpOnDemand).toBeGreaterThan(0);
      expect(result.gcp1YearCUD).toBeLessThan(result.gcpOnDemand);
      expect(result.gcp3YearCUD).toBeLessThan(result.gcp1YearCUD);
      expect(result.savings1Year).toBeGreaterThan(0);
      expect(result.savings3Year).toBeGreaterThan(result.savings1Year);
    });

    it('should calculate CUD discounts correctly', async () => {
      const serviceData = {
        service: 'EC2',
        totalCost: 100
      };

      const result = await GCPCostEstimator.estimateServiceCosts(
        serviceData,
        'Compute Engine',
        'us-central1'
      );

      // 1-year CUD should be ~25% discount
      const discount1Year = (result.gcpOnDemand - result.gcp1YearCUD) / result.gcpOnDemand;
      expect(discount1Year).toBeCloseTo(0.25, 1);

      // 3-year CUD should be ~45% discount
      const discount3Year = (result.gcpOnDemand - result.gcp3YearCUD) / result.gcpOnDemand;
      expect(discount3Year).toBeCloseTo(0.45, 1);
    });

    it('should handle different service types', async () => {
      const computeService = {
        service: 'EC2',
        totalCost: 100
      };
      const storageService = {
        service: 'S3',
        totalCost: 100
      };

      const computeResult = await GCPCostEstimator.estimateServiceCosts(
        computeService,
        'Compute Engine',
        'us-central1'
      );
      const storageResult = await GCPCostEstimator.estimateServiceCosts(
        storageService,
        'Cloud Storage',
        'us-central1'
      );

      expect(computeResult.gcpService).toBe('Compute Engine');
      expect(storageResult.gcpService).toBe('Cloud Storage');
    });
  });

  describe('estimateAllServiceCosts', () => {
    it('should estimate costs for multiple services', async () => {
      const serviceAggregation = [
        { service: 'EC2', totalCost: 100 },
        { service: 'S3', totalCost: 200 },
        { service: 'RDS', totalCost: 300 }
      ];

      const results = await GCPCostEstimator.estimateAllServiceCosts(
        serviceAggregation,
        'us-central1'
      );

      expect(results.length).toBe(3);
      expect(results[0].service).toBe('EC2');
      expect(results[1].service).toBe('S3');
      expect(results[2].service).toBe('RDS');
      results.forEach(result => {
        expect(result.costEstimate).toBeDefined();
        expect(result.costEstimate.awsCost).toBeGreaterThan(0);
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock a service that will fail
      const serviceAggregation = [
        { service: 'EC2', totalCost: 100 },
        { service: 'UnknownService', totalCost: 200 }
      ];

      const results = await GCPCostEstimator.estimateAllServiceCosts(
        serviceAggregation,
        'us-central1'
      );

      expect(results.length).toBe(2);
      // Should have fallback estimates even if API fails
      results.forEach(result => {
        expect(result.costEstimate).toBeDefined();
      });
    });
  });

  describe('calculateTotalCosts', () => {
    it('should calculate total costs across all services', async () => {
      const serviceAggregation = [
        { service: 'EC2', totalCost: 100 },
        { service: 'S3', totalCost: 200 }
      ];

      const estimates = await GCPCostEstimator.estimateAllServiceCosts(
        serviceAggregation,
        'us-central1'
      );

      const totals = GCPCostEstimator.calculateTotalCosts(estimates);

      expect(totals.awsTotal).toBe(300);
      expect(totals.gcpOnDemandTotal).toBeGreaterThan(0);
      expect(totals.gcp1YearCUDTotal).toBeLessThan(totals.gcpOnDemandTotal);
      expect(totals.gcp3YearCUDTotal).toBeLessThan(totals.gcp1YearCUDTotal);
      expect(totals.savings1Year).toBeGreaterThan(0);
      expect(totals.savings3Year).toBeGreaterThan(totals.savings1Year);
    });

    it('should calculate savings percentages correctly', async () => {
      const serviceAggregation = [
        { service: 'EC2', totalCost: 100 }
      ];

      const estimates = await GCPCostEstimator.estimateAllServiceCosts(
        serviceAggregation,
        'us-central1'
      );

      const totals = GCPCostEstimator.calculateTotalCosts(estimates);

      expect(totals.savingsPercent1Year).toBeGreaterThan(0);
      expect(totals.savingsPercent3Year).toBeGreaterThan(totals.savingsPercent1Year);
      expect(totals.savingsPercent3Year).toBeLessThanOrEqual(100);
    });

    it('should handle empty estimates', () => {
      const totals = GCPCostEstimator.calculateTotalCosts([]);

      expect(totals.awsTotal).toBe(0);
      expect(totals.gcpOnDemandTotal).toBe(0);
      expect(totals.savingsPercent1Year).toBe(0);
    });
  });

  describe('CUD discounts', () => {
    it('should apply correct discounts for compute services', async () => {
      const serviceData = { service: 'EC2', totalCost: 100 };
      const result = await GCPCostEstimator.estimateServiceCosts(
        serviceData,
        'Compute Engine',
        'us-central1'
      );

      // Compute: 25% for 1-year, 45% for 3-year
      const discount1Year = (result.gcpOnDemand - result.gcp1YearCUD) / result.gcpOnDemand;
      const discount3Year = (result.gcpOnDemand - result.gcp3YearCUD) / result.gcpOnDemand;

      expect(discount1Year).toBeCloseTo(0.25, 1);
      expect(discount3Year).toBeCloseTo(0.45, 1);
    });

    it('should apply correct discounts for storage services', async () => {
      const serviceData = { service: 'S3', totalCost: 100 };
      const result = await GCPCostEstimator.estimateServiceCosts(
        serviceData,
        'Cloud Storage',
        'us-central1'
      );

      // Storage: 15% for 1-year, 30% for 3-year
      const discount1Year = (result.gcpOnDemand - result.gcp1YearCUD) / result.gcpOnDemand;
      const discount3Year = (result.gcpOnDemand - result.gcp3YearCUD) / result.gcpOnDemand;

      expect(discount1Year).toBeCloseTo(0.15, 1);
      expect(discount3Year).toBeCloseTo(0.30, 1);
    });

    it('should apply correct discounts for database services', async () => {
      const serviceData = { service: 'RDS', totalCost: 100 };
      const result = await GCPCostEstimator.estimateServiceCosts(
        serviceData,
        'Cloud SQL',
        'us-central1'
      );

      // Database: 20% for 1-year, 40% for 3-year
      const discount1Year = (result.gcpOnDemand - result.gcp1YearCUD) / result.gcpOnDemand;
      const discount3Year = (result.gcpOnDemand - result.gcp3YearCUD) / result.gcpOnDemand;

      expect(discount1Year).toBeCloseTo(0.20, 1);
      expect(discount3Year).toBeCloseTo(0.40, 1);
    });
  });
});
