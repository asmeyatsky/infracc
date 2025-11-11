/**
 * Assess Workload Use Case
 * 
 * Architectural Intent:
 * - Orchestrates infrastructure and application assessment
 * - Coordinates domain services and ports
 * - No business logic - delegates to domain layer
 * - Handles application-level concerns (errors, validation)
 */

import { Workload } from '../../domain/entities/Workload.js';
import { Assessment } from '../../domain/entities/Assessment.js';
import { WorkloadAssessmentService } from '../../domain/services/WorkloadAssessmentService.js';
import { WorkloadRepositoryPort } from '../../domain/ports/WorkloadRepositoryPort.js';
import { validateAssessmentInput } from '../../utils/validation.js';

/**
 * Assess Workload Use Case
 * 
 * Performs comprehensive assessment of a workload including:
 * - Infrastructure assessment (resources, complexity)
 * - Application assessment (CodeMod analysis if available)
 * - Risk identification
 * - Recommendations generation
 */
export class AssessWorkloadUseCase {
  /**
   * @param {Object} dependencies
   * @param {WorkloadAssessmentService} dependencies.assessmentService
   * @param {WorkloadRepositoryPort} dependencies.workloadRepository
   */
  constructor(dependencies) {
    this.assessmentService = dependencies.assessmentService;
    this.workloadRepository = dependencies.workloadRepository;
  }

  /**
   * Execute workload assessment
   * @param {Object} input
   * @param {string} input.workloadId - Workload ID to assess
   * @returns {Promise<Assessment>} Assessment result
   */
  async execute(input) {
    // Validate input
    validateAssessmentInput(input);
    
    const { workloadId } = input;

    // Load workload
    const workload = await this.workloadRepository.findById(workloadId);
    if (!workload) {
      throw new Error(`Workload not found: ${workloadId}`);
    }

    // Perform infrastructure assessment
    const infrastructureAssessment = this.assessmentService.performInfrastructureAssessment(workload);

    // Create comprehensive assessment
    const assessment = this.assessmentService.createAssessment(
      workload,
      infrastructureAssessment,
      null,
      null
    );

    // Assign assessment to workload
    workload.assignAssessment(assessment.toJSON());

    // Save updated workload
    await this.workloadRepository.save(workload);

    return assessment;
  }

  /**
   * Analyze workload with CodeMod
   * @private
   */
  async _analyzeWithCodeMod(workload) {
    // Create CodeMod analysis request
    // Note: In real implementation, we'd need actual source code
    // For now, we use service-based inference
    
    const request = {
      sourceCode: '', // Would contain actual source code
      sourceProvider: workload.sourceProvider.type,
      serviceType: workload.service,
      filePaths: []
    };

    // Try to get service mappings from CodeMod
    try {
      const mappings = await this.codeModPort.getServiceMappings(
        workload.sourceProvider.type,
        workload.service
      );
      
      return {
        serviceMappings: mappings,
        complexityScore: this.assessmentService.assessComplexity(workload),
        recommendations: []
      };
    } catch (error) {
      // Fallback if CodeMod fails
      return {
        serviceMappings: {},
        complexityScore: this.assessmentService.assessComplexity(workload),
        recommendations: ['CodeMod analysis unavailable - using rule-based assessment']
      };
    }
  }
}

export default AssessWorkloadUseCase;
