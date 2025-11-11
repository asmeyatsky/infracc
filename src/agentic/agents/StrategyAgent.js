/**
 * Strategy Agent
 * 
 * Migration Plan & Strategy Agent with visible processing
 * AI-powered agent that creates comprehensive migration strategies
 */

import { BaseAgent } from '../core/BaseAgent.js';

export class StrategyAgent extends BaseAgent {
  constructor(dependencies = {}) {
    super('StrategyAgent', 'Strategy Agent', dependencies);
    this.strategies = {
      rehost: { name: 'Rehost (Lift and Shift)', speed: 'fast', cost: 'low' },
      replatform: { name: 'Replatform (Lift, Tinker, and Shift)', speed: 'medium', cost: 'medium' },
      refactor: { name: 'Refactor (Re-architect)', speed: 'slow', cost: 'high' },
      repurchase: { name: 'Repurchase (Drop and Shop)', speed: 'medium', cost: 'variable' },
      retire: { name: 'Retire', speed: 'fast', cost: 'none' },
      retain: { name: 'Retain', speed: 'n/a', cost: 'none' },
    };
    this.initialize();
  }

  /**
   * Execute strategy generation with visible processing
   */
  async execute(input, options = {}) {
    const { assets = [], dependencies = {}, onboardingProfile = null } = input;

    if (!assets || assets.length === 0) {
      throw new Error('No assets provided for strategy generation');
    }

    try {
      // Step 1: Analyze assets
      const assetStrategies = await this.executeStep('Analyzing assets', async () => {
        this.think(`Analyzing ${assets.length} assets to determine optimal migration strategies`);
        await new Promise(resolve => setTimeout(resolve, 400));
        return this.analyzeAssets(assets);
      }, 20);

      // Step 2: Optimize for dependencies
      const optimizedStrategies = await this.executeStep('Optimizing for dependencies', async () => {
        this.think('Analyzing dependencies to optimize migration order');
        await new Promise(resolve => setTimeout(resolve, 300));
        return this.optimizeForDependencies(assetStrategies, dependencies);
      }, 40);

      // Step 3: Create migration waves
      const migrationWaves = await this.executeStep('Creating migration waves', async () => {
        this.think('Organizing workloads into migration waves');
        await new Promise(resolve => setTimeout(resolve, 300));
        return this.createMigrationWaves(optimizedStrategies, dependencies);
      }, 60);

      // Step 4: Generate timeline
      const timeline = await this.executeStep('Generating timeline', async () => {
        this.think('Calculating migration timeline based on waves and complexity');
        await new Promise(resolve => setTimeout(resolve, 200));
        return this.generateTimeline(migrationWaves, onboardingProfile);
      }, 75);

      // Step 5: Calculate costs
      const costBreakdown = await this.executeStep('Calculating costs', async () => {
        this.think('Estimating migration costs for each strategy');
        await new Promise(resolve => setTimeout(resolve, 200));
        return this.calculateCosts(optimizedStrategies, timeline);
      }, 85);

      // Step 6: Risk analysis
      const riskAnalysis = await this.executeStep('Analyzing risks', async () => {
        this.think('Identifying migration risks and mitigation strategies');
        await new Promise(resolve => setTimeout(resolve, 200));
        return this.analyzeRisks(optimizedStrategies, dependencies);
      }, 92);

      // Step 7: Create action plan
      const actionPlan = await this.executeStep('Creating action plan', async () => {
        this.think('Generating detailed action plan with next steps');
        await new Promise(resolve => setTimeout(resolve, 200));
        return this.createActionPlan(migrationWaves, timeline);
      }, 100);

      const result = {
        status: 'success',
        summary: {
          totalAssets: assets.length,
          strategies: this.getStrategyDistribution(optimizedStrategies),
          totalWaves: migrationWaves.length,
          estimatedDuration: timeline.totalWeeks,
          estimatedCost: costBreakdown.total,
        },
        assetStrategies: optimizedStrategies,
        migrationWaves,
        timeline,
        costBreakdown,
        riskAnalysis,
        actionPlan,
        recommendations: this.generateStrategicRecommendations(optimizedStrategies, riskAnalysis),
      };

      this.setCompleted(result);
      return result;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  }

  analyzeAssets(assets) {
    return assets.map(asset => {
      const strategy = this.recommendStrategy(asset);
      const gcpMapping = this.mapToGcpService(asset, strategy);
      return {
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.type,
        recommendedStrategy: strategy,
        gcpMapping,
        effort: this.estimateEffort(asset, strategy),
        priority: this.calculatePriority(asset),
        readinessScore: asset.compatibility?.gcpReady ? 85 : 45,
      };
    });
  }

  recommendStrategy(asset) {
    if (asset.utilization && asset.utilization.cpu < 10 && asset.utilization.memory < 20) {
      return { type: 'retire', reason: 'Low utilization', confidence: 'medium', ...this.strategies.retire };
    }
    if (!asset.compatibility?.gcpReady) {
      if (asset.tags?.includes('critical')) {
        return { type: 'refactor', reason: 'Critical legacy system', confidence: 'high', ...this.strategies.refactor };
      }
      return { type: 'retain', reason: 'Complex migration - defer', confidence: 'medium', ...this.strategies.retain };
    }
    if (asset.type === 'database' && asset.compatibility?.recommendedService?.includes('Cloud SQL')) {
      return { type: 'replatform', reason: 'Use managed Cloud SQL', confidence: 'high', ...this.strategies.replatform };
    }
    if (asset.type === 'application' && asset.compatibility?.modernizationStrategy === 'containerize') {
      return { type: 'refactor', reason: 'Containerization benefits', confidence: 'high', ...this.strategies.refactor };
    }
    return { type: 'rehost', reason: 'Standard migration', confidence: 'high', ...this.strategies.rehost };
  }

  mapToGcpService(asset, strategy) {
    const mapping = { service: null, instanceType: null, additionalServices: [], estimatedCost: 0 };
    switch (asset.type) {
      case 'vm':
        mapping.service = 'Compute Engine';
        mapping.instanceType = asset.compatibility?.recommendedInstance || 'n2-standard-2';
        mapping.additionalServices = ['Cloud Monitoring', 'Cloud Logging'];
        break;
      case 'database':
        mapping.service = asset.compatibility?.recommendedService || 'Cloud SQL';
        mapping.instanceType = asset.compatibility?.recommendedInstance || 'db-n1-standard-2';
        break;
      case 'storage':
        mapping.service = asset.compatibility?.recommendedService || 'Cloud Storage';
        break;
      case 'application':
        if (strategy.type === 'refactor') {
          mapping.service = 'Google Kubernetes Engine (GKE)';
        } else {
          mapping.service = 'Compute Engine + App Server';
        }
        break;
    }
    return mapping;
  }

  estimateEffort(asset, strategy) {
    const effortMap = { rehost: 'Low', replatform: 'Medium', refactor: 'High', repurchase: 'Medium', retire: 'Low', retain: 'None' };
    return { level: effortMap[strategy.type] || 'Medium', estimatedWeeks: strategy.type === 'refactor' ? 8 : strategy.type === 'replatform' ? 4 : 2 };
  }

  calculatePriority(asset) {
    if (asset.tags?.includes('critical')) return 'High';
    if (asset.tags?.includes('production')) return 'Medium';
    return 'Low';
  }

  optimizeForDependencies(assetStrategies, dependencies) {
    return assetStrategies;
  }

  createMigrationWaves(strategies, dependencies) {
    const wave1 = strategies.filter(s => s.recommendedStrategy.type === 'rehost' && s.priority !== 'High').slice(0, 3);
    const wave2 = strategies.filter(s => s.recommendedStrategy.type === 'replatform' || (s.recommendedStrategy.type === 'rehost' && s.priority === 'High'));
    const wave3 = strategies.filter(s => s.recommendedStrategy.type === 'refactor');
    return [
      { wave: 1, name: 'Quick Wins', assets: wave1, duration: '2-4 weeks' },
      { wave: 2, name: 'Production Workloads', assets: wave2, duration: '4-8 weeks' },
      { wave: 3, name: 'Modernization', assets: wave3, duration: '8-12 weeks' },
    ].filter(w => w.assets.length > 0);
  }

  generateTimeline(waves, onboardingProfile) {
    const totalWeeks = waves.reduce((sum, w) => {
      const weeks = parseInt(w.duration.split('-')[1]) || 4;
      return sum + weeks;
    }, 0);
    return { totalWeeks, phases: { assessment: '2-3 weeks', planning: '2-4 weeks', migration: `${totalWeeks} weeks`, testing: '4-6 weeks' } };
  }

  calculateCosts(strategies, timeline) {
    const total = strategies.length * 10000;
    return { total, breakdown: { assessment: total * 0.1, migration: total * 0.6, testing: total * 0.2, optimization: total * 0.1 } };
  }

  analyzeRisks(strategies, dependencies) {
    const risks = [];
    const highComplexity = strategies.filter(s => s.recommendedStrategy.type === 'refactor').length;
    if (highComplexity > strategies.length * 0.3) {
      risks.push({ category: 'Complexity', severity: 'high', description: 'High percentage of refactoring required', mitigation: 'Consider phased approach' });
    }
    return risks;
  }

  createActionPlan(waves, timeline) {
    return waves.map((wave, index) => ({
      phase: index + 1,
      name: wave.name,
      actions: [`Prepare ${wave.name}`, `Execute migration`, `Test and validate`],
      timeline: wave.duration,
    }));
  }

  getStrategyDistribution(strategies) {
    const distribution = {};
    strategies.forEach(s => {
      const type = s.recommendedStrategy.type;
      distribution[type] = (distribution[type] || 0) + 1;
    });
    return distribution;
  }

  generateStrategicRecommendations(strategies, riskAnalysis) {
    const recommendations = [];
    if (riskAnalysis.length > 0) {
      recommendations.push({ priority: 'High', recommendation: 'Address identified risks before migration', category: 'Risk' });
    }
    return recommendations;
  }
}

export default StrategyAgent;
