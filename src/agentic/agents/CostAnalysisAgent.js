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
import { CalculateTCOUseCase, TCOInput } from '../../application/use_cases/CalculateTCOUseCase.js';

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
    try {
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

      // Step 1: Calculate TCO (use case)
      const tcoResult = await this.executeStep('Calculating TCO', async () => {
        this.think('Computing total cost of ownership across all cloud providers');
        return await this.calculateTCOUseCase.execute(tcoInput);
      }, 40);

      // Step 2: Generate AI insights
      const insights = await this.executeStep('Generating cost insights', async () => {
        this.think('Analyzing cost patterns and identifying best options');
        await new Promise(resolve => requestAnimationFrame(resolve));
        return await this._generateCostInsights(tcoResult);
      }, 70);

      // Step 3: Generate optimization recommendations
      const optimizations = await this.executeStep('Identifying optimizations', async () => {
        this.think('Finding cost optimization opportunities');
        await new Promise(resolve => requestAnimationFrame(resolve));
        return this._generateOptimizations(tcoResult);
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
    const insights = {
      bestOption: null,
      savingsOpportunities: [],
      riskFactors: [],
      recommendations: []
    };

    // Determine best option
    const rois = {
      aws: tcoResult.roi.aws,
      azure: tcoResult.roi.azure,
      gcp: tcoResult.roi.gcp
    };

    const bestProvider = Object.entries(rois).reduce((a, b) => 
      rois[a[0]] > rois[b[0]] ? a : b
    )[0];

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
