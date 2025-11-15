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

    console.log(`[PlanMigrationWavesUseCase] Attempting to load ${workloadIds.length} workloads by ID`);

    // FIX: Load workloads in batches to avoid stack overflow with very large datasets
    // Promise.all() with 599K promises can exceed call stack
    let validWorkloads = [];
    const LOAD_BATCH_SIZE = 1000;
    
    if (workloadIds.length > LOAD_BATCH_SIZE) {
      console.log(`[PlanMigrationWavesUseCase] Loading ${workloadIds.length} workloads in batches of ${LOAD_BATCH_SIZE}...`);
      
      for (let i = 0; i < workloadIds.length; i += LOAD_BATCH_SIZE) {
        const batch = workloadIds.slice(i, i + LOAD_BATCH_SIZE);
        const batchWorkloads = await Promise.all(
          batch.map(id => this.workloadRepository.findById(id))
        );
        
        // Filter and add valid workloads
        const batchValid = batchWorkloads.filter(w => w !== null && w !== undefined);
        for (const workload of batchValid) {
          validWorkloads.push(workload);
        }
        
        // Log progress for large datasets
        if (workloadIds.length > 10000 && (i + LOAD_BATCH_SIZE) % 10000 === 0) {
          const percent = ((i + LOAD_BATCH_SIZE) / workloadIds.length * 100).toFixed(1);
          console.log(`[PlanMigrationWavesUseCase] Loaded: ${Math.min(i + LOAD_BATCH_SIZE, workloadIds.length)}/${workloadIds.length} (${percent}%)`);
        }
        
        // Yield to event loop periodically
        if (i % (LOAD_BATCH_SIZE * 10) === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      console.log(`[PlanMigrationWavesUseCase] Loaded ${validWorkloads.length} valid workloads from ${workloadIds.length} IDs`);
    } else {
      // For smaller datasets, load all at once
      const workloads = await Promise.all(
        workloadIds.map(id => this.workloadRepository.findById(id))
      );
      validWorkloads = workloads.filter(w => w !== null && w !== undefined);
    }

    // If no workloads found by ID, try loading all workloads as fallback
    if (validWorkloads.length === 0) {
      console.warn(`[PlanMigrationWavesUseCase] No workloads found by provided IDs. Attempting fallback: load all workloads from repository.`);
      const allWorkloads = await this.workloadRepository.findAll();
      console.log(`[PlanMigrationWavesUseCase] Found ${allWorkloads.length} total workloads in repository`);
      
      if (allWorkloads.length === 0) {
        throw new Error('No valid workloads found in repository. Please ensure workloads are discovered and saved before planning migration waves.');
      }
      
      // Use all workloads as fallback
      validWorkloads = allWorkloads;
      console.log(`[PlanMigrationWavesUseCase] Using all ${validWorkloads.length} workloads from repository as fallback`);
    } else if (validWorkloads.length < workloadIds.length) {
      console.warn(`[PlanMigrationWavesUseCase] Only found ${validWorkloads.length} of ${workloadIds.length} requested workloads. Proceeding with available workloads.`);
    } else {
      console.log(`[PlanMigrationWavesUseCase] Successfully loaded ${validWorkloads.length} workloads`);
    }

    // Analyze each workload and assign to wave
    // FIX: Process in batches to avoid stack overflow with very large datasets (599K+ workloads)
    // Promise.all() with 599K promises can exceed call stack
    const waveAssignments = [];
    const BATCH_SIZE = 1000; // Process 1000 workloads at a time
    
    console.log(`[PlanMigrationWavesUseCase] Processing ${validWorkloads.length} workloads in batches of ${BATCH_SIZE}...`);
    
    for (let i = 0; i < validWorkloads.length; i += BATCH_SIZE) {
      const batch = validWorkloads.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(workload => this._analyzeWorkload(workload))
      );
      
      // FIX: Use loop instead of spread operator to avoid any stack issues
      // Even with batches of 1000, spread operator can be risky with very large datasets
      for (const result of batchResults) {
        waveAssignments.push(result);
      }
      
      // Log progress for large datasets
      if (validWorkloads.length > 10000 && (i + BATCH_SIZE) % 10000 === 0) {
        const percent = ((i + BATCH_SIZE) / validWorkloads.length * 100).toFixed(1);
        console.log(`[PlanMigrationWavesUseCase] Progress: ${Math.min(i + BATCH_SIZE, validWorkloads.length)}/${validWorkloads.length} (${percent}%)`);
      }
      
      // Yield to event loop periodically to prevent blocking
      if (i % (BATCH_SIZE * 10) === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    console.log(`[PlanMigrationWavesUseCase] Completed analysis of ${waveAssignments.length} workloads`);

    // Organize into waves
    // SAFETY: Batch filter and map to avoid stack overflow with large datasets (599K+ workloads)
    const wave1 = [];
    const wave2 = [];
    const wave3 = [];
    const WAVE_BATCH_SIZE = 10000; // Process 10K assignments at a time
    
    for (let i = 0; i < waveAssignments.length; i += WAVE_BATCH_SIZE) {
      const batch = waveAssignments.slice(i, Math.min(i + WAVE_BATCH_SIZE, waveAssignments.length));
      for (const w of batch) {
        if (w.wave === 1) {
          wave1.push(w.workload);
        } else if (w.wave === 2) {
          wave2.push(w.workload);
        } else if (w.wave === 3) {
          wave3.push(w.workload);
        }
      }
    }

    // Debug logging for wave distribution
    console.log(`Wave Planning Results:
      Wave 1 (Quick Wins): ${wave1.length} workloads
      Wave 2 (Standard): ${wave2.length} workloads  
      Wave 3 (Complex): ${wave3.length} workloads
      Total: ${waveAssignments.length} workloads`);
    
    // Log sample complexity scores for each wave
    // SAFETY: Batch filter and map to avoid stack overflow with large datasets
    if (wave1.length > 0) {
      let wave1Min = Infinity;
      let wave1Max = -Infinity;
      for (let i = 0; i < waveAssignments.length; i += WAVE_BATCH_SIZE) {
        const batch = waveAssignments.slice(i, Math.min(i + WAVE_BATCH_SIZE, waveAssignments.length));
        for (const w of batch) {
          if (w.wave === 1 && w.workload && w.workload.complexityScore !== undefined) {
            const score = w.workload.complexityScore;
            if (score < wave1Min) wave1Min = score;
            if (score > wave1Max) wave1Max = score;
          }
        }
      }
      if (wave1Min !== Infinity) {
        console.log(`Wave 1 complexity range: ${wave1Min} - ${wave1Max}`);
      }
    }
    if (wave2.length > 0) {
      let wave2Min = Infinity;
      let wave2Max = -Infinity;
      for (let i = 0; i < waveAssignments.length; i += WAVE_BATCH_SIZE) {
        const batch = waveAssignments.slice(i, Math.min(i + WAVE_BATCH_SIZE, waveAssignments.length));
        for (const w of batch) {
          if (w.wave === 2 && w.workload && w.workload.complexityScore !== undefined) {
            const score = w.workload.complexityScore;
            if (score < wave2Min) wave2Min = score;
            if (score > wave2Max) wave2Max = score;
          }
        }
      }
      if (wave2Min !== Infinity) {
        console.log(`Wave 2 complexity range: ${wave2Min} - ${wave2Max}`);
      }
    }
    if (wave3.length > 0) {
      let wave3Min = Infinity;
      let wave3Max = -Infinity;
      for (let i = 0; i < waveAssignments.length; i += WAVE_BATCH_SIZE) {
        const batch = waveAssignments.slice(i, Math.min(i + WAVE_BATCH_SIZE, waveAssignments.length));
        for (const w of batch) {
          if (w.wave === 3 && w.workload && w.workload.complexityScore !== undefined) {
            const score = w.workload.complexityScore;
            if (score < wave3Min) wave3Min = score;
            if (score > wave3Max) wave3Max = score;
          }
        }
      }
      if (wave3Min !== Infinity) {
        console.log(`Wave 3 complexity range: ${wave3Min} - ${wave3Max}`);
      }
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
      
      // Start with base complexity based on workload type (matching WorkloadAssessmentService)
      if (workloadType === 'storage') {
        complexityScore = 3; // Storage is simpler but not trivial
      } else if (workloadType === 'function') {
        complexityScore = 4; // Functions need code changes
      } else if (workloadType === 'container') {
        complexityScore = 5; // Containers are moderately complex
      } else if (workloadType === 'database') {
        complexityScore = 8; // Databases are very complex - data migration critical
      } else if (workloadType === 'vm') {
        complexityScore = 6; // VMs are moderately complex - need rehosting
      } else {
        complexityScore = 6; // Default for unknown services - assume moderate complexity
      }
      
      // Also check service name for more accurate scoring
      const service = workload.service?.toUpperCase() || '';
      if (service.includes('S3') || service.includes('STORAGE')) {
        complexityScore = 3;
      } else if (service.includes('LAMBDA') || service.includes('FUNCTION')) {
        complexityScore = 4;
      } else if (service.includes('EC2')) {
        complexityScore = 6;
      } else if (service.includes('RDS') || service.includes('DATABASE')) {
        complexityScore = 8;
      } else if (service.includes('EKS') || service.includes('ECS') || service.includes('KUBERNETES')) {
        complexityScore = 5;
      } else if (service.includes('REDSHIFT') || service.includes('EMR') || service.includes('GLUE') || service.includes('ATHENA')) {
        complexityScore = 9;
      } else if (service.includes('VPC') || service.includes('NETWORK') || service.includes('ROUTE')) {
        complexityScore = 7;
      } else if (service.includes('IAM') || service.includes('SECURITY')) {
        complexityScore = 8;
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
    // More realistic distribution: ~20% Wave 1, ~50% Wave 2, ~30% Wave 3
    let wave;
    
    // Get cost amount (handle both Money object and number)
    const monthlyCostAmount = workload.monthlyCost?.amount || 
                              (typeof workload.monthlyCost === 'number' ? workload.monthlyCost : 0);
    
    // Calculate dependency complexity
    const depCount = workload.hasDependencies() ? workload.dependencies.length : 0;
    const hasDeps = depCount > 0;
    
    // Wave 1: Only truly simple workloads (low complexity, low cost, no deps, low risk)
    // ~20% of workloads should be here
    if (complexityScore <= 4 && 
        !hasDeps && 
        monthlyCostAmount < 1000 &&
        (!workload.assessment || (workload.assessment.riskFactors?.length || 0) === 0)) {
      wave = 1;
    }
    // Wave 3: High complexity OR high cost OR many dependencies OR high risk
    // ~30% of workloads should be here
    else if (complexityScore >= 7 || 
             monthlyCostAmount > 10000 ||
             depCount >= 3 ||
             (workload.assessment && (workload.assessment.riskFactors?.length || 0) >= 3)) {
      wave = 3;
    }
    // Wave 2: Medium complexity, moderate cost, some dependencies
    // ~50% of workloads should be here (everything else)
    else {
      wave = 2;
    }

    // Fine-tune: Dependencies always move to at least Wave 2
    if (hasDeps && wave === 1) {
      wave = 2;
    }
    
    // Fine-tune: Very high cost (>$50k/month) always Wave 3
    if (monthlyCostAmount > 50000) {
      wave = 3;
    }
    
    // Fine-tune: Very low complexity (< 3) with no deps and low cost can be Wave 1
    if (complexityScore < 3 && !hasDeps && monthlyCostAmount < 500) {
      wave = 1;
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
    // SAFETY: Batch filter and reduce to avoid stack overflow with large datasets
    let wave1Count = 0;
    let wave2Count = 0;
    let wave3Count = 0;
    let complexitySum = 0;
    let complexityCount = 0;
    
    for (let i = 0; i < waveAssignments.length; i += WAVE_BATCH_SIZE) {
      const batch = waveAssignments.slice(i, Math.min(i + WAVE_BATCH_SIZE, waveAssignments.length));
      for (const w of batch) {
        if (w.wave === 1) wave1Count++;
        else if (w.wave === 2) wave2Count++;
        else if (w.wave === 3) wave3Count++;
        
        if (w.workload && w.workload.complexityScore !== undefined) {
          complexitySum += w.workload.complexityScore;
          complexityCount++;
        }
      }
    }
    
    const avgComplexity = complexityCount > 0 ? complexitySum / complexityCount : null; 
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
