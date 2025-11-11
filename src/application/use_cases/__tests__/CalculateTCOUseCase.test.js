/**
 * Calculate TCO Use Case Tests
 */

import { CalculateTCOUseCase, TCOInput, TCOResult } from '../CalculateTCOUseCase.js';
import { Money } from '../../../domain/value_objects/Money.js';

describe('CalculateTCOUseCase', () => {
  let useCase;
  let mockPricingPort;
  let mockWorkloadRepository;

  beforeEach(() => {
    mockPricingPort = {
      getPricing: jest.fn().mockResolvedValue({
        onDemandPrice: 0.10,
        currency: 'USD',
        unit: 'per-hour'
      }),
      isAvailable: jest.fn().mockResolvedValue(true)
    };

    mockWorkloadRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn()
    };

    useCase = new CalculateTCOUseCase({
      pricingPort: mockPricingPort,
      workloadRepository: mockWorkloadRepository
    });
  });

  describe('execute', () => {
    it('should calculate TCO successfully', async () => {
      const input = new TCOInput({
        onPremise: {
          hardware: 1000,
          software: 500,
          maintenance: 200,
          labor: 300,
          power: 100,
          cooling: 50,
          datacenter: 150
        },
        aws: { ec2Instances: 5 },
        gcp: { compute: 5 },
        timeframe: 36,
        region: 'us-east-1'
      });

      const result = await useCase.execute(input);

      expect(result).toBeInstanceOf(TCOResult);
      expect(result.onPremise).toBeInstanceOf(Money);
      expect(result.aws).toBeInstanceOf(Money);
      expect(result.gcp).toBeInstanceOf(Money);
      expect(result.timeframe).toBe(36);
    });

    it('should throw error for invalid input', async () => {
      await expect(
        useCase.execute({})
      ).rejects.toThrow('TCOInput instance required');
    });

    it('should calculate ROI correctly', async () => {
      const input = new TCOInput({
        onPremise: { hardware: 10000 },
        gcp: { compute: 5 },
        timeframe: 12
      });

      const result = await useCase.execute(input);

      expect(result.roi).toBeDefined();
      expect(result.roi.gcp).toBeDefined();
      expect(typeof result.roi.gcp).toBe('number');
    });

    it('should calculate savings correctly', async () => {
      const input = new TCOInput({
        onPremise: { hardware: 10000 },
        gcp: { compute: 5 },
        timeframe: 12
      });

      const result = await useCase.execute(input);

      expect(result.savings).toBeDefined();
      expect(result.savings.gcp).toBeInstanceOf(Money);
    });
  });

  describe('calculateFromWorkloads', () => {
    it('should calculate TCO from workloads', async () => {
      const { Workload } = await import('../../../domain/entities/Workload.js');
      
      const workloads = [
        new Workload({
          name: 'VM 1',
          type: 'vm',
          sourceProvider: 'aws',
          cpu: 4,
          memory: 8
        }),
        new Workload({
          name: 'VM 2',
          type: 'vm',
          sourceProvider: 'aws',
          cpu: 2,
          memory: 4
        })
      ];

      mockWorkloadRepository.findById = jest.fn((id) => {
        const index = parseInt(id.split('_')[1]) || 0;
        return Promise.resolve(workloads[index] || null);
      });

      const workloadIds = workloads.map(w => w.id);
      const result = await useCase.calculateFromWorkloads(workloadIds, 36);

      expect(result).toBeInstanceOf(TCOResult);
      expect(result.timeframe).toBe(36);
    });
  });
});
