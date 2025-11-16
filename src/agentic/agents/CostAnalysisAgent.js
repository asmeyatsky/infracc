/**
 * Cost Analysis Agent
 * 
 * Architectural Intent:
 * - Agentic layer wrapper around CalculateTCOUseCase
 * - Autonomous cost analysis with AI insights
 * - Cost optimization recommendations with visible processing
 * - Uses Clean Architecture use cases
 */

import { BaseAgent } from '../core/BaseAgent.js';
import { TCOInput } from '../../application/use_cases/CalculateTCOUseCase.js';

/**
 * Cost Analysis Agent
 * 
 * Autonomous agent that performs cost analysis and optimization
 * Emits events for visible processing
 */
export class CostAnalysisAgent extends BaseAgent {
  /**
   * @param {Object} dependencies
   * @param {CalculateTCOUseCase} dependencies.calculateTCOUseCase
   * @param {Object} dependencies.aiConfig - AI configuration
   */
  constructor(dependencies) {
    super('CostAnalysisAgent', 'Cost Analysis Agent', dependencies);
    this.calculateTCOUseCase = dependencies.calculateTCOUseCase;
    this.aiConfig = dependencies.aiConfig || {};
    this.initialize();
  }

  /**
   * Execute autonomous cost analysis with visible processing
   * @param {Object} input
   * @param {Object} input.onPremise - On-premise costs
   * @param {Object} input.aws - AWS costs
   * @param {Object} input.azure - Azure costs
   * @param {Object} input.gcp - GCP costs
   * @param {number} input.timeframe - Analysis timeframe
   * @returns {Promise<Object>} Enhanced cost analysis with AI insights
   */
  async execute(input) {
    if (typeof window !== 'undefined' && window.persistentLog) {
      window.persistentLog('INFO', '[CostAnalysisAgent] ENTERING execute()');
      window.persistentLog('INFO', '[CostAnalysisAgent] Input type:', typeof input);
      window.persistentLog('INFO', '[CostAnalysisAgent] Input keys:', input ? Object.keys(input).join(',') : 'null');
    }
    console.log('[CostAnalysisAgent] ENTERING execute()');
    console.log('[CostAnalysisAgent] Input type:', typeof input);
    console.log('[CostAnalysisAgent] Input keys:', input ? Object.keys(input) : 'null');
    console.log('[CostAnalysisAgent] Input.workloads type:', Array.isArray(input?.workloads) ? 'array' : typeof input?.workloads);
    console.log('[CostAnalysisAgent] Input.workloads length:', input?.workloads?.length || 'N/A');
    console.log('[CostAnalysisAgent] Input.assessments type:', Array.isArray(input?.assessments) ? 'array' : typeof input?.assessments);
    console.log('[CostAnalysisAgent] Input.assessments length:', input?.assessments?.length || 'N/A');
    
    try {
      // SAFETY: Check input sizes before processing
      if (input?.workloads && input.workloads.length > 1000000) {
        console.warn('[CostAnalysisAgent] WARNING: workloads array is very large:', input.workloads.length);
      }
      if (input?.assessments && input.assessments.length > 1000000) {
        console.warn('[CostAnalysisAgent] WARNING: assessments array is very large:', input.assessments.length);
      }
      
      if (typeof window !== 'undefined' && window.persistentLog) {
        window.persistentLog('INFO', '[CostAnalysisAgent] About to create TCOInput...');
      }
      console.log('[CostAnalysisAgent] About to create TCOInput...');
      // Convert plain object to TCOInput instance if needed
      const tcoInput = input instanceof TCOInput 
        ? input 
        : new TCOInput({
            onPremise: input.onPremise || {},
            aws: input.aws || {},
            azure: input.azure || {},
            gcp: input.gcp || {},
            migration: input.migration || {},
            timeframe: input.timeframe || 36,
            region: input.region || 'us-east-1'
          });
      if (typeof window !== 'undefined' && window.persistentLog) {
        window.persistentLog('INFO', '[CostAnalysisAgent] TCOInput created successfully');
      }
      console.log('[CostAnalysisAgent] TCOInput created successfully');

      // Step 1: Calculate TCO (use case)
      // SAFETY: Wrap in try-catch to catch stack overflow
      let tcoResult;
      try {
        if (typeof window !== 'undefined' && window.persistentLog) {
          window.persistentLog('INFO', '[CostAnalysisAgent] STEP 1: About to execute calculateTCOUseCase.execute...');
        }
        tcoResult = await this.executeStep('Calculating TCO', async () => {
          this.think('Computing total cost of ownership across all cloud providers');
          if (typeof window !== 'undefined' && window.persistentLog) {
            window.persistentLog('INFO', '[CostAnalysisAgent] Executing calculateTCOUseCase.execute...');
          }
          console.log('[CostAnalysisAgent] Executing calculateTCOUseCase.execute...');
          const result = await this.calculateTCOUseCase.execute(tcoInput);
          if (typeof window !== 'undefined' && window.persistentLog) {
            window.persistentLog('INFO', '[CostAnalysisAgent] calculateTCOUseCase.execute completed');
          }
          console.log('[CostAnalysisAgent] calculateTCOUseCase.execute completed');
          return result;
        }, 40);
      } catch (tcoError) {
        console.error('[CostAnalysisAgent] ERROR in calculateTCOUseCase.execute:', tcoError);
        console.error('[CostAnalysisAgent] Error name:', tcoError?.name);
        console.error('[CostAnalysisAgent] Error message:', tcoError?.message);
        console.error('[CostAnalysisAgent] Error stack:', tcoError?.stack);
        if (tcoError instanceof RangeError || 
            (tcoError?.message && tcoError.message.includes('Maximum call stack size exceeded'))) {
          console.error('[CostAnalysisAgent] STACK OVERFLOW in calculateTCOUseCase.execute!');
          throw new Error(`TCO calculation failed due to stack overflow: ${tcoError.message}`);
        }
        throw tcoError;
      }

      // Step 2: Generate AI insights
      if (typeof window !== 'undefined' && window.persistentLog) {
        window.persistentLog('INFO', '[CostAnalysisAgent] STEP 2: About to generate cost insights...');
        window.persistentLog('INFO', '[CostAnalysisAgent] STEP 2: tcoResult type:', typeof tcoResult);
        window.persistentLog('INFO', '[CostAnalysisAgent] STEP 2: tcoResult.roi type:', typeof tcoResult?.roi);
      }
      console.log('[CostAnalysisAgent] STEP 2: About to generate cost insights...');
      console.log('[CostAnalysisAgent] STEP 2: tcoResult type:', typeof tcoResult);
      console.log('[CostAnalysisAgent] STEP 2: tcoResult.roi type:', typeof tcoResult?.roi);
      await new Promise(resolve => setTimeout(resolve, 0)); // Force console flush
      
      const insights = await this.executeStep('Generating cost insights', async () => {
        this.think('Analyzing cost patterns and identifying best options');
        if (typeof window !== 'undefined' && window.persistentLog) {
          window.persistentLog('INFO', '[CostAnalysisAgent] STEP 2: Inside executeStep for insights...');
        }
        console.log('[CostAnalysisAgent] STEP 2: Inside executeStep for insights...');
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (typeof window !== 'undefined' && window.persistentLog) {
          window.persistentLog('INFO', '[CostAnalysisAgent] STEP 2: About to call _generateCostInsights...');
        }
        console.log('[CostAnalysisAgent] STEP 2: About to call _generateCostInsights...');
        const result = await this._generateCostInsights(tcoResult);
        if (typeof window !== 'undefined' && window.persistentLog) {
          window.persistentLog('INFO', '[CostAnalysisAgent] STEP 2: _generateCostInsights completed');
        }
        console.log('[CostAnalysisAgent] STEP 2: _generateCostInsights completed');
        return result;
      }, 70);

      // Step 3: Generate optimization recommendations
      if (typeof window !== 'undefined' && window.persistentLog) {
        window.persistentLog('INFO', '[CostAnalysisAgent] STEP 3: About to generate optimizations...');
      }
      console.log('[CostAnalysisAgent] STEP 3: About to generate optimizations...');
      await new Promise(resolve => setTimeout(resolve, 0)); // Force console flush
      
      const optimizations = await this.executeStep('Identifying optimizations', async () => {
        this.think('Finding cost optimization opportunities');
        if (typeof window !== 'undefined' && window.persistentLog) {
          window.persistentLog('INFO', '[CostAnalysisAgent] STEP 3: Inside executeStep for optimizations...');
        }
        console.log('[CostAnalysisAgent] STEP 3: Inside executeStep for optimizations...');
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (typeof window !== 'undefined' && window.persistentLog) {
          window.persistentLog('INFO', '[CostAnalysisAgent] STEP 3: About to call _generateOptimizations...');
        }
        console.log('[CostAnalysisAgent] STEP 3: About to call _generateOptimizations...');
        const result = this._generateOptimizations(tcoResult);
        if (typeof window !== 'undefined' && window.persistentLog) {
          window.persistentLog('INFO', '[CostAnalysisAgent] STEP 3: _generateOptimizations completed');
        }
        console.log('[CostAnalysisAgent] STEP 3: _generateOptimizations completed');
        return result;
      }, 90);

      // Step 4: Finalize
      await this.executeStep('Finalizing cost analysis', async () => {
        await new Promise(resolve => requestAnimationFrame(resolve));
      }, 100);

      const result = {
        tco: tcoResult,
        insights,
        optimizations,
        generatedAt: new Date().toISOString(),
        agentVersion: '1.0'
      };

      this.setCompleted(result);
      return result;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  }

  /**
   * Generate cost insights
   * @private
   */
  async _generateCostInsights(tcoResult) {
    if (typeof window !== 'undefined' && window.persistentLog) {
      window.persistentLog('INFO', '[CostAnalysisAgent] _generateCostInsights: ENTERING');
      window.persistentLog('INFO', '[CostAnalysisAgent] _generateCostInsights: tcoResult type:', typeof tcoResult);
    }
    console.log('[CostAnalysisAgent] _generateCostInsights: ENTERING');
    console.log('[CostAnalysisAgent] _generateCostInsights: tcoResult type:', typeof tcoResult);
    
    const insights = {
      bestOption: null,
      savingsOpportunities: [],
      riskFactors: [],
      recommendations: []
    };

    // Determine best option
    if (typeof window !== 'undefined' && window.persistentLog) {
      window.persistentLog('INFO', '[CostAnalysisAgent] _generateCostInsights: About to access tcoResult.roi...');
    }
    console.log('[CostAnalysisAgent] _generateCostInsights: About to access tcoResult.roi...');
    const rois = {
      aws: tcoResult.roi.aws,
      azure: tcoResult.roi.azure,
      gcp: tcoResult.roi.gcp
    };
    if (typeof window !== 'undefined' && window.persistentLog) {
      window.persistentLog('INFO', '[CostAnalysisAgent] _generateCostInsights: rois object created');
    }
    console.log('[CostAnalysisAgent] _generateCostInsights: rois object created');

    // SAFETY: Replace Object.entries().reduce() with explicit loop to avoid stack overflow
    if (typeof window !== 'undefined' && window.persistentLog) {
      window.persistentLog('INFO', '[CostAnalysisAgent] _generateCostInsights: About to find best provider...');
    }
    console.log('[CostAnalysisAgent] _generateCostInsights: About to find best provider...');
    let bestProvider = 'gcp';
    let bestROI = rois.gcp;
    if (rois.aws > bestROI) {
      bestProvider = 'aws';
      bestROI = rois.aws;
    }
    if (rois.azure > bestROI) {
      bestProvider = 'azure';
      bestROI = rois.azure;
    }
    if (typeof window !== 'undefined' && window.persistentLog) {
      window.persistentLog('INFO', '[CostAnalysisAgent] _generateCostInsights: bestProvider determined:', bestProvider);
    }
    console.log('[CostAnalysisAgent] _generateCostInsights: bestProvider determined:', bestProvider);

    insights.bestOption = {
      provider: bestProvider,
      roi: rois[bestProvider],
      savings: tcoResult.savings[bestProvider].amount,
      recommendation: `Based on ROI analysis, ${bestProvider.toUpperCase()} provides the best value`
    };

    // Identify savings opportunities
    if (tcoResult.totalGcp.amount > tcoResult.totalAws.amount) {
      insights.savingsOpportunities.push({
        type: 'provider_switch',
        suggestion: 'Consider AWS for immediate cost savings',
        potentialSavings: tcoResult.totalGcp.subtract(tcoResult.totalAws).amount
      });
    }

    // Risk factors
    if (tcoResult.migrationCost.amount > tcoResult.totalGcp.amount * 0.3) {
      insights.riskFactors.push({
        type: 'high_migration_cost',
        description: 'Migration costs exceed 30% of total GCP cost',
        recommendation: 'Review migration approach to reduce one-time costs'
      });
    }

    // Recommendations
    if (tcoResult.roi.gcp > 50) {
      insights.recommendations.push({
        priority: 'high',
        action: 'Proceed with GCP migration - strong ROI',
        confidence: 'high'
      });
    }

    return insights;
  }

  /**
   * Generate optimizations
   * @private
   */
  _generateOptimizations(tcoResult) {
    if (typeof window !== 'undefined' && window.persistentLog) {
      window.persistentLog('INFO', '[CostAnalysisAgent] _generateOptimizations: ENTERING');
      window.persistentLog('INFO', '[CostAnalysisAgent] _generateOptimizations: tcoResult type:', typeof tcoResult);
      window.persistentLog('INFO', '[CostAnalysisAgent] _generateOptimizations: tcoResult.totalGcp type:', typeof tcoResult?.totalGcp);
      window.persistentLog('INFO', '[CostAnalysisAgent] _generateOptimizations: tcoResult.totalGcp.amount:', tcoResult?.totalGcp?.amount);
    }
    console.log('[CostAnalysisAgent] _generateOptimizations: ENTERING');
    console.log('[CostAnalysisAgent] _generateOptimizations: tcoResult type:', typeof tcoResult);
    console.log('[CostAnalysisAgent] _generateOptimizations: tcoResult.totalGcp type:', typeof tcoResult?.totalGcp);
    console.log('[CostAnalysisAgent] _generateOptimizations: tcoResult.totalGcp.amount:', tcoResult?.totalGcp?.amount);
    
    const optimizations = [];

    // Committed use discounts
    if (tcoResult.totalGcp.amount > 10000) {
      optimizations.push({
        type: 'committed_use',
        description: 'Consider GCP Committed Use Discounts',
        potentialSavings: '20-30%',
        timeframe: '1-3 year commitment'
      });
    }

    // Right-sizing
    optimizations.push({
      type: 'rightsizing',
      description: 'Review instance sizes - may be over-provisioned',
      potentialSavings: '10-20%',
      action: 'Use Cloud Monitoring to identify right-sizing opportunities'
    });

    // Storage optimization
    optimizations.push({
      type: 'storage',
      description: 'Use appropriate storage classes (Standard, Nearline, Coldline)',
      potentialSavings: '30-50%',
      action: 'Migrate infrequently accessed data to cheaper tiers'
    });

    return optimizations;
  }
}

export default CostAnalysisAgent;
