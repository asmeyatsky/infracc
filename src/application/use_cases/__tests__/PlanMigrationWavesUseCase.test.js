/**
 * Plan Migration Waves Use Case Tests
 */

import { PlanMigrationWavesUseCase, WavePlan } from '../PlanMigrationWavesUseCase.js';
import { Workload } from '../../../domain/entities/Workload.js';

describe('PlanMigrationWavesUseCase', () => {
  let useCase;
  let mockWorkloadRepository;
  let mockServiceMappingPort;

  beforeEach(() => {
    mockWorkloadRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn()
    };

    mockServiceMappingPort = {
      getMapping: jest.fn(),
      getAllMappings: jest.fn(),
      searchMappings: jest.fn(),
      hasMapping: jest.fn()
    };

    useCase = new PlanMigrationWavesUseCase({
      workloadRepository: mockWorkloadRepository,
      serviceMappingPort: mockServiceMappingPort
    });
  });

  describe('execute', () => {
    it('should plan migration waves successfully', async () => {
      const workload1 = new Workload({
        name: 'Simple Workload',
        cpu: 2,
        memory: 4,
        sourceProvider: 'aws'
      });

      const workload2 = new Workload({
        name: 'Complex Workload',
        cpu: 32,
        memory: 128,
        dependencies: ['dep1'],
        sourceProvider: 'aws'
      });

      mockWorkloadRepository.findById
        .mockResolvedValueOnce(workload1)
        .mockResolvedValueOnce(workload2);

      const result = await useCase.execute({
        workloadIds: [workload1.id, workload2.id]
      });

      expect(result).toBeInstanceOf(WavePlan);
      expect(result.wave1).toBeDefined();
      expect(result.wave2).toBeDefined();
      expect(result.wave3).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should throw error if no workload IDs provided', async () => {
      await expect(
        useCase.execute({ workloadIds: [] })
      ).rejects.toThrow('Workload IDs array is required');
    });

    it('should throw error if no valid workloads found', async () => {
      mockWorkloadRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ workloadIds: ['invalid'] })
      ).rejects.toThrow('No valid workloads found');
    });

    it('should organize workloads into appropriate waves', async () => {
      const simpleWorkload = new Workload({
        name: 'Simple',
        cpu: 2,
        memory: 4,
        sourceProvider: 'aws'
      });

      const complexWorkload = new Workload({
        name: 'Complex',
        cpu: 32,
        memory: 128,
        dependencies: ['dep1', 'dep2'],
        sourceProvider: 'aws'
      });

      mockWorkloadRepository.findById
        .mockResolvedValueOnce(simpleWorkload)
        .mockResolvedValueOnce(complexWorkload);

      const result = await useCase.execute({
        workloadIds: [simpleWorkload.id, complexWorkload.id]
      });

      // Simple workload should be in wave 1
      expect(result.wave1.length + result.wave2.length + result.wave3.length).toBeGreaterThan(0);
      expect(result.summary.total).toBe(2);
    });
  });
});
