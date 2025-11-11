/**
 * Planning Agent
 * 
 * Architectural Intent:
 * - Agentic layer wrapper around GenerateMigrationPlanUseCase
 * - Autonomous migration planning with AI
 * - Multi-agent coordination with visible processing
 * - Uses Clean Architecture use cases
 */

import { BaseAgent } from '../core/BaseAgent.js';
import { GenerateMigrationPlanUseCase } from '../../application/use_cases/GenerateMigrationPlanUseCase.js';
import { PlanMigrationWavesUseCase } from '../../application/use_cases/PlanMigrationWavesUseCase.js';

/**
 * Planning Agent
 * 
 * Autonomous agent that generates comprehensive migration plans
 * Orchestrates multiple use cases and adds AI intelligence
 * Emits events for visible processing
 */
export class PlanningAgent extends BaseAgent {
  /**
   * @param {Object} dependencies
   * @param {GenerateMigrationPlanUseCase} dependencies.generateMigrationPlanUseCase
   * @param {PlanMigrationWavesUseCase} dependencies.planMigrationWavesUseCase
   * @param {Object} dependencies.aiConfig - AI configuration
   */
  constructor(dependencies) {
    super('PlanningAgent', 'Planning Agent', dependencies);
    this.generateMigrationPlanUseCase = dependencies.generateMigrationPlanUseCase;
    this.planMigrationWavesUseCase = dependencies.planMigrationWavesUseCase;
    this.aiConfig = dependencies.aiConfig || {};
    this.initialize();
  }

  /**
   * Execute autonomous migration planning with visible processing
   * @param {Object} input
   * @param {string[]} input.workloadIds - Workload IDs
   * @param {boolean} input.useCodeMod - Use CodeMod for enhanced mapping
   * @param {boolean} input.useAI - Use AI for optimization
   * @returns {Promise<Object>} Comprehensive migration plan with AI insights
   */
  async execute(input) {
    const { workloadIds, useCodeMod = true, useAI = true } = input;

    try {
      // Step 1: Analyze workloads for planning
      await this.executeStep('Analyzing workloads for planning', async () => {
        this.think(`Analyzing ${workloadIds.length} workloads to determine migration strategy`);
        await new Promise(resolve => setTimeout(resolve, 300));
      }, 15);

      // Step 2: Generate migration plan (use case)
      if (!this.generateMigrationPlanUseCase) {
        throw new Error('GenerateMigrationPlanUseCase not initialized. Check dependency injection.');
      }
      
      const migrationPlan = await this.executeStep('Generating migration plan', async () => {
        this.think('Mapping services and determining 6 R\'s strategies');
        return await this.generateMigrationPlanUseCase.execute({
          workloadIds,
          useCodeMod
        });
      }, 40);

      // Step 3: Plan migration waves (use case)
      if (!this.planMigrationWavesUseCase) {
        throw new Error('PlanMigrationWavesUseCase not initialized. Check dependency injection.');
      }
      
      const wavePlan = await this.executeStep('Planning migration waves', async () => {
        this.think('Organizing workloads into migration waves based on complexity');
        return await this.planMigrationWavesUseCase.execute({
          workloadIds
        });
      }, 65);

      // Step 4: Enhance with AI optimization
      let result;
      if (useAI) {
        result = await this.executeStep('Optimizing with AI', async () => {
          this.think('Analyzing plan for optimization opportunities');
          await new Promise(resolve => setTimeout(resolve, 400));
          return await this._optimizeWithAI(migrationPlan, wavePlan);
        }, 85);
      } else {
        result = {
          migrationPlan,
          wavePlan,
          generatedAt: new Date().toISOString(),
          agentVersion: '1.0'
        };
      }

      // Step 5: Finalize
      await this.executeStep('Finalizing migration plan', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      }, 100);

      this.setCompleted(result);
      return result;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  }

  /**
   * Optimize plan with AI
   * @private
   */
  async _optimizeWithAI(migrationPlan, wavePlan) {
    // AI optimization suggestions
    const optimizations = [];

    // Optimize wave distribution
    if (wavePlan.wave3.length > wavePlan.wave1.length + wavePlan.wave2.length) {
      optimizations.push({
        type: 'wave_distribution',
        issue: 'Too many complex migrations in Wave 3',
        suggestion: 'Consider breaking down complex workloads or extending timeline',
        impact: 'Reduces risk of migration bottlenecks'
      });
    }

    // Optimize strategy distribution
    const strategies = migrationPlan.metrics.strategyDistribution;
    if (strategies.refactor > strategies.rehost + strategies.replatform) {
      optimizations.push({
        type: 'strategy_distribution',
        issue: 'High percentage of refactoring required',
        suggestion: 'Consider phased approach: rehost first, then refactor incrementally',
        impact: 'Reduces initial migration risk and cost'
      });
    }

    // Optimize timeline
    const totalDuration = wavePlan.summary.totalDuration;
    if (totalDuration > 52) { // More than 1 year
      optimizations.push({
        type: 'timeline',
        issue: 'Migration timeline exceeds 1 year',
        suggestion: 'Consider parallel waves or additional resources',
        impact: 'Reduces total migration time'
      });
    }

    return {
      migrationPlan,
      wavePlan,
      aiOptimizations: optimizations,
      optimizedAt: new Date().toISOString(),
      agentVersion: '1.0'
    };
  }

  /**
   * Generate autonomous migration strategy
   * @param {Object} input
   * @param {string[]} input.workloadIds
   * @returns {Promise<Object>} Autonomous strategy
   */
  async generateAutonomousStrategy(input) {
    const { workloadIds } = input;

    // Execute planning
    const plan = await this.execute({
      workloadIds,
      useCodeMod: true,
      useAI: true
    });

    // Add autonomous recommendations
    const autonomousRecommendations = {
      recommendedApproach: this._recommendApproach(plan),
      riskAssessment: this._assessRisks(plan),
      successFactors: this._identifySuccessFactors(plan),
      nextSteps: this._generateNextSteps(plan)
    };

    return {
      ...plan,
      autonomousRecommendations,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Recommend migration approach
   * @private
   */
  _recommendApproach(plan) {
    const complexity = plan.migrationPlan.metrics.averageComplexity;
    
    if (complexity <= 4) {
      return 'aggressive'; // Fast-track migration
    } else if (complexity <= 7) {
      return 'balanced'; // Standard approach
    } else {
      return 'conservative'; // Phased, careful approach
    }
  }

  /**
   * Assess risks
   * @private
   */
  _assessRisks(plan) {
    const risks = [];
    
    if (plan.wavePlan.summary.averageComplexity >= 8) {
      risks.push({
        level: 'high',
        category: 'complexity',
        description: 'High average complexity may lead to migration challenges'
      });
    }

    if (plan.wavePlan.wave3.length > plan.wavePlan.wave1.length) {
      risks.push({
        level: 'medium',
        category: 'distribution',
        description: 'More complex workloads than simple ones may create bottlenecks'
      });
    }

    return risks;
  }

  /**
   * Identify success factors
   * @private
   */
  _identifySuccessFactors(plan) {
    return [
      'Phased migration approach reduces risk',
      'Early wins in Wave 1 build momentum',
      'CodeMod integration ensures accurate service mapping',
      'Clear wave boundaries enable parallel execution'
    ];
  }

  /**
   * Generate next steps
   * @private
   */
  _generateNextSteps(plan) {
    return [
      {
        step: 1,
        action: 'Begin Wave 1 migrations',
        timeline: 'Immediate',
        priority: 'high'
      },
      {
        step: 2,
        action: 'Set up GCP landing zone',
        timeline: 'Before Wave 1',
        priority: 'high'
      },
      {
        step: 3,
        action: 'Conduct Wave 1 migration',
        timeline: `${plan.wavePlan.summary.estimatedDuration.wave1} weeks`,
        priority: 'medium'
      }
    ];
  }
}

export default PlanningAgent;
