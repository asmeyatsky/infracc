/**
 * Plan Migration Waves Use Case
 * 
 * Architectural Intent:
 * - Orchestrates migration wave planning
 * - Uses domain logic for wave assignment
 * - Considers dependencies and complexity
 * - Produces actionable migration plan
 */

import { WorkloadRepositoryPort } from '../../domain/ports/WorkloadRepositoryPort.js';
import { ServiceMappingPort } from '../../domain/ports/ServiceMappingPort.js';
import { validateWorkloadIds } from '../../utils/validation.js';

/**
 * Migration Wave Plan
 */
export class WavePlan {
  /**
   * @param {Object} params
   */
  constructor(params) {
    this.wave1 = params.wave1 || []; // Quick wins
    this.wave2 = params.wave2 || []; // Standard migrations
    this.wave3 = params.wave3 || []; // Complex migrations
    this.summary = params.summary || {};
  }
}

/**
 * Plan Migration Waves Use Case
 * 
 * Organizes workloads into migration waves based on:
 * - Complexity score
 * - Dependencies
 * - Risk factors
 * - Effort level
 */
export class PlanMigrationWavesUseCase {
  /**
   * @param {Object} dependencies
   * @param {WorkloadRepositoryPort} dependencies.workloadRepository
   * @param {ServiceMappingPort} dependencies.serviceMappingPort
   */
  constructor(dependencies) {
    this.workloadRepository = dependencies.workloadRepository;
    this.serviceMappingPort = dependencies.serviceMappingPort;
  }

  /**
   * Execute wave planning
   * @param {Object} input
   * @param {string[]} input.workloadIds - Array of workload IDs
   * @returns {Promise<WavePlan>} Migration wave plan
   */
  async execute(input) {
    const { workloadIds } = input;

    // Validate input
    validateWorkloadIds(workloadIds);

    // Load all workloads
    const workloads = await Promise.all(
      workloadIds.map(id => this.workloadRepository.findById(id))
    );

    const validWorkloads = workloads.filter(w => w !== null && w !== undefined);

    if (validWorkloads.length === 0) {
      throw new Error('No valid workloads found');
    }

    // Analyze each workload and assign to wave
    const waveAssignments = await Promise.all(
      validWorkloads.map(workload => this._analyzeWorkload(workload))
    );

    // Organize into waves
    const wave1 = waveAssignments
      .filter(w => w.wave === 1)
      .map(w => w.workload);
    const wave2 = waveAssignments
      .filter(w => w.wave === 2)
      .map(w => w.workload);
    const wave3 = waveAssignments
      .filter(w => w.wave === 3)
      .map(w => w.workload);

    // Debug logging for wave distribution
    console.log(`Wave Planning Results:
      Wave 1 (Quick Wins): ${wave1.length} workloads
      Wave 2 (Standard): ${wave2.length} workloads  
      Wave 3 (Complex): ${wave3.length} workloads
      Total: ${waveAssignments.length} workloads`);
    
    // Log sample complexity scores for each wave
    if (wave1.length > 0) {
      const wave1Complexities = waveAssignments.filter(w => w.wave === 1).map(w => w.workload.complexityScore);
      console.log(`Wave 1 complexity range: ${Math.min(...wave1Complexities)} - ${Math.max(...wave1Complexities)}`);
    }
    if (wave2.length > 0) {
      const wave2Complexities = waveAssignments.filter(w => w.wave === 2).map(w => w.workload.complexityScore);
      console.log(`Wave 2 complexity range: ${Math.min(...wave2Complexities)} - ${Math.max(...wave2Complexities)}`);
    }
    if (wave3.length > 0) {
      const wave3Complexities = waveAssignments.filter(w => w.wave === 3).map(w => w.workload.complexityScore);
      console.log(`Wave 3 complexity range: ${Math.min(...wave3Complexities)} - ${Math.max(...wave3Complexities)}`);
    }

    // Calculate summary
    const summary = this._calculateSummary(waveAssignments);

    return new WavePlan({
      wave1,
      wave2,
      wave3,
      summary
    });
  }

  /**
   * Analyze workload and determine wave
   * @private
   */
  async _analyzeWorkload(workload) {
    let complexityScore = 3; // Start lower for better distribution
    let effort = 'medium';

    // Get complexity from assessment if available (check multiple possible locations)
    if (workload.assessment) {
      if (workload.assessment.complexityScore) {
        complexityScore = workload.assessment.complexityScore;
      } else if (workload.assessment.infrastructureAssessment && workload.assessment.infrastructureAssessment.complexityScore) {
        complexityScore = workload.assessment.infrastructureAssessment.complexityScore;
      }
    }
    
    // If no assessment complexity, calculate based on workload characteristics
    if (!workload.assessment || (!workload.assessment.complexityScore && !workload.assessment.infrastructureAssessment?.complexityScore)) {
      // Get workload type (handle both string and WorkloadType object)
      let workloadType = '';
      if (typeof workload.type === 'string') {
        workloadType = workload.type.toLowerCase();
      } else if (workload.type && typeof workload.type === 'object') {
        // WorkloadType value object has a 'type' property
        workloadType = (workload.type.type || workload.type.toString() || '').toLowerCase();
      } else {
        workloadType = '';
      }
      
      // Start with base complexity based on workload type
      if (workloadType === 'storage' || workloadType === 'function') {
        complexityScore = 2; // Storage and functions are typically simpler
      } else if (workloadType === 'container') {
        complexityScore = 3; // Containers are moderately complex
      } else if (workloadType === 'database') {
        complexityScore = 5; // Databases are more complex
      } else {
        complexityScore = 4; // VMs and applications default
      }
      
      // Adjust based on size
      if (workload.isLargeWorkload()) {
        complexityScore += 2;
      } else if (workload.cpu <= 2 && workload.memory <= 4) {
        complexityScore -= 1; // Small workloads are simpler
      }
      
      // Adjust based on cost (higher cost = more critical/complex)
      const monthlyCostAmount = workload.monthlyCost?.amount || 
                                (typeof workload.monthlyCost === 'number' ? workload.monthlyCost : 0);
      if (monthlyCostAmount > 1000) {
        complexityScore += 1;
      }
      if (monthlyCostAmount > 5000) {
        complexityScore += 1;
      }
      
      // Dependencies increase complexity
      if (workload.hasDependencies()) {
        complexityScore += Math.min(2, workload.dependencies.length * 0.5);
      }
      
      // Windows workloads may have higher complexity
      if (workload.isWindowsWorkload()) {
        complexityScore += 1;
      }
      
      // Containerized workloads are typically simpler
      if (workload.isContainerized && workload.isContainerized()) {
        complexityScore -= 1;
      }
      
      // Clamp to valid range
      complexityScore = Math.max(1, Math.min(10, Math.round(complexityScore)));
    }

    // Get effort from migration strategy if available
    if (workload.migrationStrategy && workload.migrationStrategy.effort) {
      effort = workload.migrationStrategy.effort;
    }

    // Determine wave based on complexity, dependencies, and workload characteristics
    let wave;
    
    // Get cost amount (handle both Money object and number)
    const monthlyCostAmount = workload.monthlyCost?.amount || 
                              (typeof workload.monthlyCost === 'number' ? workload.monthlyCost : 0);
    
    // Wave 1: Simple, low-cost, no dependencies (quick wins)
    if (complexityScore <= 3 && !workload.hasDependencies() && monthlyCostAmount < 500) {
      wave = 1;
    }
    // Wave 3: High complexity, high cost, or many dependencies (complex migrations)
    else if (complexityScore >= 7 || 
             monthlyCostAmount > 5000 ||
             (workload.hasDependencies() && workload.dependencies.length >= 3)) {
      wave = 3;
    }
    // Wave 2: Everything else (standard migrations)
    else {
      wave = 2;
    }

    // Fine-tune based on dependencies
    if (workload.hasDependencies() && wave === 1) {
      wave = 2; // Dependencies move from wave 1 to wave 2
    }

    // Adjust for high risk from assessment
    if (workload.assessment) {
      const riskFactors = workload.assessment.riskFactors || 
                         workload.assessment.infrastructureAssessment?.riskFactors || [];
      if (riskFactors.length >= 3) {
        wave = Math.min(3, wave + 1);
      }
    }

    return {
      workload: {
        id: workload.id,
        name: workload.name,
        complexityScore,
        effort,
        wave,
        dependencies: workload.dependencies,
        riskFactors: workload.assessment?.riskFactors || []
      },
      wave
    };
  }

  /**
   * Calculate wave plan summary
   * @private
   */
  _calculateSummary(waveAssignments) {
    const total = waveAssignments.length;
    const wave1Count = waveAssignments.filter(w => w.wave === 1).length;
    const wave2Count = waveAssignments.filter(w => w.wave === 2).length;
    const wave3Count = waveAssignments.filter(w => w.wave === 3).length;

    const avgComplexity = waveAssignments.reduce((sum, w) => 
      sum + w.workload.complexityScore, 0) / total;

    const estimatedDuration = {
      wave1: wave1Count * 2, // 2 weeks per workload
      wave2: wave2Count * 8, // 8 weeks per workload
      wave3: wave3Count * 16 // 16 weeks per workload
    };

    const totalDuration = estimatedDuration.wave1 + estimatedDuration.wave2 + estimatedDuration.wave3;

    return {
      total,
      distribution: {
        wave1: { count: wave1Count, percentage: (wave1Count / total * 100).toFixed(1) },
        wave2: { count: wave2Count, percentage: (wave2Count / total * 100).toFixed(1) },
        wave3: { count: wave3Count, percentage: (wave3Count / total * 100).toFixed(1) }
      },
      averageComplexity: Math.round(avgComplexity * 10) / 10,
      estimatedDuration,
      totalDuration
    };
  }
}

export default PlanMigrationWavesUseCase;
