/**
 * Generate Migration Plan Use Case
 * 
 * Architectural Intent:
 * - Orchestrates migration planning process
 * - Uses domain services for business logic
 * - Coordinates service mapping and assessment
 * - Produces comprehensive migration plan
 */

import { Workload } from '../../domain/entities/Workload.js';
import { ServiceMapping } from '../../domain/entities/ServiceMapping.js';
import { MigrationStrategyType, MigrationStrategy } from '../../domain/value_objects/MigrationStrategyType.js';
import { EffortLevel, EffortLevelType } from '../../domain/value_objects/EffortLevel.js';
import { ServiceMappingPort } from '../../domain/ports/ServiceMappingPort.js';
import { WorkloadRepositoryPort } from '../../domain/ports/WorkloadRepositoryPort.js';
import { CodeModPort } from '../../domain/ports/CodeModPort.js';
import { validateMigrationPlanInput } from '../../utils/validation.js';

/**
 * Generate Migration Plan Use Case
 * 
 * Creates detailed migration plan for workloads including:
 * - Service mappings (AWS/Azure to GCP)
 * - Migration strategies (6 R's framework)
 * - Wave planning
 * - Effort estimation
 * - Risk assessment
 */
export class GenerateMigrationPlanUseCase {
  /**
   * @param {Object} dependencies
   * @param {ServiceMappingPort} dependencies.serviceMappingPort
   * @param {WorkloadRepositoryPort} dependencies.workloadRepository
   * @param {CodeModPort} dependencies.codeModPort
   */
  constructor(dependencies) {
    this.serviceMappingPort = dependencies.serviceMappingPort;
    this.workloadRepository = dependencies.workloadRepository;
    this.codeModPort = dependencies.codeModPort;
  }

  /**
   * Execute migration plan generation
   * @param {Object} input
   * @param {string[]} input.workloadIds - Array of workload IDs
   * @param {boolean} input.useCodeMod - Whether to use CodeMod for enhanced mapping
   * @returns {Promise<Object>} Migration plan
   */
  async execute(input) {
    // Validate input
    validateMigrationPlanInput(input);
    
    const { workloadIds, useCodeMod = false } = input;

    // Load all workloads
    const workloads = await Promise.all(
      workloadIds.map(id => this.workloadRepository.findById(id))
    );

    const validWorkloads = workloads.filter(w => w !== null);
    if (validWorkloads.length === 0) {
      throw new Error('No valid workloads found');
    }

    // Generate migration plan for each workload
    const planItems = await Promise.all(
      validWorkloads.map(workload => this._planWorkloadMigration(workload, useCodeMod))
    );

    // Organize by migration wave
    const waves = this._organizeIntoWaves(planItems);

    // Calculate overall metrics
    const metrics = this._calculatePlanMetrics(planItems);

    return {
      planItems,
      waves,
      metrics,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Plan migration for a single workload
   * @private
   */
  async _planWorkloadMigration(workload, useCodeMod) {
    let serviceMapping = null;
    let codeModResults = null;

    // Try to get service mapping
    if (workload.service) {
      try {
        serviceMapping = await this.serviceMappingPort.getMapping(
          workload.service,
          workload.sourceProvider
        );
      } catch (error) {
        console.warn(`Failed to get mapping for ${workload.service}:`, error);
      }
    }

    // If CodeMod is enabled and available, enhance with CodeMod analysis
    if (useCodeMod && workload.service) {
      try {
        const isCodeModAvailable = await this.codeModPort.isAvailable();
        if (isCodeModAvailable) {
          const mappings = await this.codeModPort.getServiceMappings(
            workload.sourceProvider.type,
            workload.service
          );
          
          // Enhance service mapping with CodeMod results
          if (mappings && Object.keys(mappings).length > 0) {
            codeModResults = mappings;
            
            // If no static mapping exists, create one from CodeMod
            if (!serviceMapping && mappings.gcpService) {
              serviceMapping = new ServiceMapping({
                sourceService: workload.service,
                sourceProvider: workload.sourceProvider,
                gcpService: mappings.gcpService,
                gcpApi: mappings.gcpApi || '',
                migrationStrategy: mappings.strategy || MigrationStrategy.REHOST,
                effort: mappings.effort || EffortLevelType.MEDIUM,
                notes: mappings.notes || 'Generated from CodeMod analysis',
                considerations: mappings.considerations || []
              });
            }
          }
        }
      } catch (error) {
        console.warn('CodeMod analysis failed:', error);
      }
    }

    // If no mapping found, create default based on workload type
    if (!serviceMapping) {
      serviceMapping = this._createDefaultMapping(workload);
    }

    // Determine migration wave
    const wave = this._determineMigrationWave(serviceMapping, workload);

    // Assign strategy to workload
    workload.assignMigrationStrategy({
      strategy: serviceMapping.migrationStrategy.strategy,
      targetService: serviceMapping.gcpService,
      effort: serviceMapping.effort.level,
      gcpApi: serviceMapping.gcpApi,
      considerations: serviceMapping.considerations,
      migrationWave: wave,
      codeModResults: codeModResults
    });

    // Save updated workload
    await this.workloadRepository.save(workload);

    return {
      workloadId: workload.id,
      workloadName: workload.name,
      sourceService: workload.service,
      serviceMapping: serviceMapping.toJSON(),
      migrationWave: wave,
      estimatedDuration: serviceMapping.effort.estimatedDuration,
      complexityScore: serviceMapping.getComplexityScore(),
      codeModResults: codeModResults
    };
  }

  /**
   * Create default mapping when no explicit mapping exists
   * @private
   */
  _createDefaultMapping(workload) {
    const defaultMappings = {
      'vm': {
        gcpService: 'Compute Engine',
        gcpApi: 'compute.googleapis.com',
        strategy: MigrationStrategy.REHOST,
        effort: EffortLevelType.LOW
      },
      'database': {
        gcpService: 'Cloud SQL',
        gcpApi: 'sqladmin.googleapis.com',
        strategy: MigrationStrategy.REPLATFORM,
        effort: EffortLevelType.MEDIUM
      },
      'storage': {
        gcpService: 'Cloud Storage',
        gcpApi: 'storage.googleapis.com',
        strategy: MigrationStrategy.REHOST,
        effort: EffortLevelType.LOW
      },
      'container': {
        gcpService: 'Google Kubernetes Engine (GKE)',
        gcpApi: 'container.googleapis.com',
        strategy: MigrationStrategy.REHOST,
        effort: EffortLevelType.LOW
      },
      'function': {
        gcpService: 'Cloud Functions',
        gcpApi: 'cloudfunctions.googleapis.com',
        strategy: MigrationStrategy.REPLATFORM,
        effort: EffortLevelType.MEDIUM
      }
    };

    const type = workload.type.type;
    const defaultMapping = defaultMappings[type] || defaultMappings['vm'];

    return new ServiceMapping({
      sourceService: workload.service || 'Unknown Service',
      sourceProvider: workload.sourceProvider,
      gcpService: defaultMapping.gcpService,
      gcpApi: defaultMapping.gcpApi,
      migrationStrategy: defaultMapping.strategy,
      effort: defaultMapping.effort,
      notes: `Default mapping based on workload type: ${type}`,
      considerations: []
    });
  }

  /**
   * Determine migration wave based on complexity and dependencies
   * @private
   */
  _determineMigrationWave(serviceMapping, workload) {
    const complexityScore = serviceMapping.getComplexityScore();
    const hasDependencies = workload.hasDependencies();

    if (complexityScore <= 3 && !hasDependencies) {
      return 1; // Wave 1 - Quick wins
    } else if (complexityScore <= 6) {
      return 2; // Wave 2 - Standard migrations
    } else {
      return 3; // Wave 3 - Complex migrations
    }
  }

  /**
   * Organize plan items into migration waves
   * @private
   */
  _organizeIntoWaves(planItems) {
    const waves = {
      1: [],
      2: [],
      3: []
    };

    planItems.forEach(item => {
      waves[item.migrationWave].push(item);
    });

    return waves;
  }

  /**
   * Calculate overall plan metrics
   * @private
   */
  _calculatePlanMetrics(planItems) {
    const totalWorkloads = planItems.length;
    const totalDuration = planItems.reduce((sum, item) => sum + item.estimatedDuration, 0);
    const avgComplexity = planItems.reduce((sum, item) => sum + item.complexityScore, 0) / totalWorkloads;
    
    const strategyDistribution = {};
    planItems.forEach(item => {
      const strategy = item.serviceMapping.migrationStrategy;
      strategyDistribution[strategy] = (strategyDistribution[strategy] || 0) + 1;
    });

    return {
      totalWorkloads,
      totalDuration,
      averageComplexity: Math.round(avgComplexity * 10) / 10,
      strategyDistribution,
      waveDistribution: {
        wave1: planItems.filter(item => item.migrationWave === 1).length,
        wave2: planItems.filter(item => item.migrationWave === 2).length,
        wave3: planItems.filter(item => item.migrationWave === 3).length
      }
    };
  }
}

export default GenerateMigrationPlanUseCase;
