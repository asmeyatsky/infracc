/**
 * Generate Migration Plan Use Case Tests
 */

import { GenerateMigrationPlanUseCase } from '../GenerateMigrationPlanUseCase.js';
import { Workload } from '../../../domain/entities/Workload.js';
import { ServiceMapping } from '../../../domain/entities/ServiceMapping.js';

describe('GenerateMigrationPlanUseCase', () => {
  let useCase;
  let mockServiceMappingPort;
  let mockWorkloadRepository;
  let mockCodeModPort;

  beforeEach(() => {
    mockServiceMappingPort = {
      getMapping: jest.fn(),
      getAllMappings: jest.fn(),
      searchMappings: jest.fn(),
      hasMapping: jest.fn()
    };

    mockWorkloadRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn()
    };

    mockCodeModPort = {
      isAvailable: jest.fn(),
      getServiceMappings: jest.fn(),
      analyzeCode: jest.fn()
    };

    useCase = new GenerateMigrationPlanUseCase({
      serviceMappingPort: mockServiceMappingPort,
      workloadRepository: mockWorkloadRepository,
      codeModPort: mockCodeModPort
    });
  });

  describe('execute', () => {
    it('should generate migration plan successfully', async () => {
      const workload = new Workload({
        name: 'Test Workload',
        service: 'EC2',
        sourceProvider: 'aws'
      });

      const serviceMapping = new ServiceMapping({
        sourceService: 'EC2',
        sourceProvider: 'aws',
        gcpService: 'Compute Engine',
        gcpApi: 'compute.googleapis.com',
        migrationStrategy: 'rehost',
        effort: 'low',
        notes: 'Direct migration',
        considerations: []
      });

      mockWorkloadRepository.findById.mockResolvedValue(workload);
      mockServiceMappingPort.getMapping.mockResolvedValue(serviceMapping);
      mockWorkloadRepository.save.mockResolvedValue(workload);

      const result = await useCase.execute({
        workloadIds: [workload.id],
        useCodeMod: false
      });

      expect(result.planItems).toHaveLength(1);
      expect(result.planItems[0].workloadId).toBe(workload.id);
      expect(result.waves).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should throw error if no workload IDs provided', async () => {
      await expect(
        useCase.execute({ workloadIds: [] })
      ).rejects.toThrow('Workload IDs array is required');
    });

    it('should create default mapping if service mapping not found', async () => {
      const workload = new Workload({
        name: 'Test',
        type: 'vm',
        sourceProvider: 'aws'
      });

      mockWorkloadRepository.findById.mockResolvedValue(workload);
      mockServiceMappingPort.getMapping.mockRejectedValue(new Error('Not found'));
      mockWorkloadRepository.save.mockResolvedValue(workload);

      const result = await useCase.execute({
        workloadIds: [workload.id],
        useCodeMod: false
      });

      expect(result.planItems).toHaveLength(1);
      expect(result.planItems[0].serviceMapping.gcpService).toBe('Compute Engine');
    });

    it('should use CodeMod when enabled', async () => {
      const workload = new Workload({
        name: 'Test',
        service: 'EC2',
        sourceProvider: 'aws'
      });

      const serviceMapping = new ServiceMapping({
        sourceService: 'EC2',
        sourceProvider: 'aws',
        gcpService: 'Compute Engine',
        migrationStrategy: 'rehost',
        effort: 'low',
        notes: '',
        considerations: []
      });

      mockWorkloadRepository.findById.mockResolvedValue(workload);
      mockServiceMappingPort.getMapping.mockResolvedValue(serviceMapping);
      mockCodeModPort.isAvailable.mockResolvedValue(true);
      mockCodeModPort.getServiceMappings.mockResolvedValue({
        gcpService: 'Compute Engine',
        gcpApi: 'compute.googleapis.com'
      });
      mockWorkloadRepository.save.mockResolvedValue(workload);

      await useCase.execute({
        workloadIds: [workload.id],
        useCodeMod: true
      });

      expect(mockCodeModPort.isAvailable).toHaveBeenCalled();
      expect(mockCodeModPort.getServiceMappings).toHaveBeenCalled();
    });
  });
});
