/**
 * Assess Workload Use Case Tests
 * 
 * Tests use case orchestration and error handling
 */

import { AssessWorkloadUseCase } from '../AssessWorkloadUseCase.js';
import { Workload } from '../../../domain/entities/Workload.js';
import { Assessment } from '../../../domain/entities/Assessment.js';
import { WorkloadAssessmentService } from '../../../domain/services/WorkloadAssessmentService.js';

describe('AssessWorkloadUseCase', () => {
  let useCase;
  let mockAssessmentService;
  let mockCodeModPort;
  let mockWorkloadRepository;

  beforeEach(() => {
    // Mock dependencies
    mockAssessmentService = {
      performInfrastructureAssessment: jest.fn(),
      createAssessment: jest.fn(),
      assessComplexity: jest.fn(),
      identifyRiskFactors: jest.fn(),
      generateRecommendations: jest.fn()
    };

    mockCodeModPort = {
      isAvailable: jest.fn(),
      getServiceMappings: jest.fn(),
      analyzeCode: jest.fn()
    };

    mockWorkloadRepository = {
      findById: jest.fn(),
      save: jest.fn()
    };

    useCase = new AssessWorkloadUseCase({
      assessmentService: mockAssessmentService,
      codeModPort: mockCodeModPort,
      workloadRepository: mockWorkloadRepository
    });
  });

  describe('execute', () => {
    it('should assess workload successfully', async () => {
      const workload = new Workload({
        name: 'Test',
        cpu: 4,
        memory: 8,
        sourceProvider: 'aws'
      });

      const infrastructureAssessment = {
        cpu: 4,
        memory: 8,
        complexityScore: 5,
        riskFactors: [],
        recommendations: []
      };

      const assessment = new Assessment({
        workloadId: workload.id,
        type: 'infrastructure',
        infrastructureAssessment,
        complexityScore: 5,
        riskFactors: [],
        recommendations: []
      });

      mockWorkloadRepository.findById.mockResolvedValue(workload);
      mockAssessmentService.performInfrastructureAssessment.mockReturnValue(infrastructureAssessment);
      mockAssessmentService.createAssessment.mockReturnValue(assessment);
      mockWorkloadRepository.save.mockResolvedValue(workload);

      const result = await useCase.execute({
        workloadId: workload.id,
        includeCodeMod: false
      });

      expect(result).toBeInstanceOf(Assessment);
      expect(mockWorkloadRepository.findById).toHaveBeenCalledWith(workload.id);
      expect(mockAssessmentService.performInfrastructureAssessment).toHaveBeenCalledWith(workload);
      expect(mockWorkloadRepository.save).toHaveBeenCalled();
    });

    it('should throw error if workload ID is missing', async () => {
      await expect(
        useCase.execute({})
      ).rejects.toThrow('Workload ID is required');
    });

    it('should throw error if workload not found', async () => {
      mockWorkloadRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ workloadId: 'invalid' })
      ).rejects.toThrow('Workload not found');
    });

    it('should include CodeMod analysis when requested', async () => {
      const workload = new Workload({
        name: 'Test',
        service: 'EC2',
        sourceProvider: 'aws'
      });

      const infrastructureAssessment = {
        complexityScore: 5,
        riskFactors: [],
        recommendations: []
      };

      const assessment = new Assessment({
        workloadId: workload.id,
        infrastructureAssessment,
        complexityScore: 5,
        riskFactors: [],
        recommendations: []
      });

      mockWorkloadRepository.findById.mockResolvedValue(workload);
      mockAssessmentService.performInfrastructureAssessment.mockReturnValue(infrastructureAssessment);
      mockCodeModPort.isAvailable.mockResolvedValue(true);
      mockCodeModPort.getServiceMappings.mockResolvedValue({
        gcpService: 'Compute Engine',
        gcpApi: 'compute.googleapis.com'
      });
      mockAssessmentService.createAssessment.mockReturnValue(assessment);
      mockWorkloadRepository.save.mockResolvedValue(workload);

      await useCase.execute({
        workloadId: workload.id,
        includeCodeMod: true
      });

      expect(mockCodeModPort.isAvailable).toHaveBeenCalled();
      expect(mockCodeModPort.getServiceMappings).toHaveBeenCalled();
    });

    it('should handle CodeMod unavailability gracefully', async () => {
      const workload = new Workload({
        name: 'Test',
        service: 'EC2',
        sourceProvider: 'aws'
      });

      const infrastructureAssessment = {
        complexityScore: 5,
        riskFactors: [],
        recommendations: []
      };

      const assessment = new Assessment({
        workloadId: workload.id,
        infrastructureAssessment,
        complexityScore: 5,
        riskFactors: [],
        recommendations: []
      });

      mockWorkloadRepository.findById.mockResolvedValue(workload);
      mockAssessmentService.performInfrastructureAssessment.mockReturnValue(infrastructureAssessment);
      mockCodeModPort.isAvailable.mockResolvedValue(false);
      mockAssessmentService.createAssessment.mockReturnValue(assessment);
      mockWorkloadRepository.save.mockResolvedValue(workload);

      await useCase.execute({
        workloadId: workload.id,
        includeCodeMod: true
      });

      expect(mockCodeModPort.isAvailable).toHaveBeenCalled();
      expect(mockCodeModPort.getServiceMappings).not.toHaveBeenCalled();
    });
  });
});
