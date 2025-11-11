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
    let complexityScore = 5; // Default
    let effort = 'medium';

    // Get complexity from assessment if available
    if (workload.assessment && workload.assessment.complexityScore) {
      complexityScore = workload.assessment.complexityScore;
    } else {
      // Calculate basic complexity
      if (workload.isLargeWorkload()) complexityScore += 2;
      if (workload.hasDependencies()) complexityScore += workload.dependencies.length * 0.5;
      if (workload.isWindowsWorkload()) complexityScore += 1;
    }

    // Get effort from migration strategy if available
    if (workload.migrationStrategy && workload.migrationStrategy.effort) {
      effort = workload.migrationStrategy.effort;
    }

    // Determine wave based on complexity and dependencies
    let wave;
    if (complexityScore <= 3 && !workload.hasDependencies()) {
      wave = 1; // Quick wins
    } else if (complexityScore <= 6) {
      wave = 2; // Standard migrations
    } else {
      wave = 3; // Complex migrations
    }

    // Adjust for dependencies - dependent workloads go to later waves
    if (workload.hasDependencies()) {
      wave = Math.min(3, wave + 1);
    }

    // Adjust for high risk
    if (workload.assessment && workload.assessment.riskFactors) {
      const riskCount = workload.assessment.riskFactors.length;
      if (riskCount >= 3) {
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
