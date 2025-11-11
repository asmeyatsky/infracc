/**
 * Migration Plan & Strategy Agent
 * AI-powered agent that creates comprehensive migration strategies
 */

export class StrategyAgent {
  constructor() {
    this.strategies = {
      rehost: {
        name: 'Rehost (Lift and Shift)',
        description: 'Move applications as-is to the cloud with minimal changes',
        speed: 'fast',
        cost: 'low',
        benefits: 'Quick migration, low risk',
        drawbacks: 'Limited cloud optimization',
      },
      replatform: {
        name: 'Replatform (Lift, Tinker, and Shift)',
        description: 'Make minimal cloud optimizations during migration',
        speed: 'medium',
        cost: 'medium',
        benefits: 'Some cloud benefits, moderate effort',
        drawbacks: 'Requires some refactoring',
      },
      refactor: {
        name: 'Refactor (Re-architect)',
        description: 'Redesign application to be cloud-native',
        speed: 'slow',
        cost: 'high',
        benefits: 'Maximum cloud benefits, scalability',
        drawbacks: 'Significant time and cost investment',
      },
      repurchase: {
        name: 'Repurchase (Drop and Shop)',
        description: 'Move to a SaaS solution',
        speed: 'medium',
        cost: 'variable',
        benefits: 'No infrastructure management',
        drawbacks: 'Feature/integration limitations',
      },
      retire: {
        name: 'Retire',
        description: 'Decommission unused applications',
        speed: 'fast',
        cost: 'none',
        benefits: 'Reduce complexity and costs',
        drawbacks: 'Must validate no longer needed',
      },
      retain: {
        name: 'Retain',
        description: 'Keep on-premises for now',
        speed: 'n/a',
        cost: 'none',
        benefits: 'Defer migration for complex cases',
        drawbacks: 'Continues on-premises costs',
      },
    };
  }

  /**
   * Execute strategy generation
   */
  async execute(input, options = {}) {
    const { assets = [], dependencies = {}, onboardingProfile = null } = input;

    if (!assets || assets.length === 0) {
      throw new Error('No assets provided for strategy generation');
    }

    // Phase 1: Analyze each asset
    const assetStrategies = this.analyzeAssets(assets);

    // Phase 2: Optimize based on dependencies
    const optimizedStrategies = this.optimizeForDependencies(assetStrategies, dependencies);

    // Phase 3: Create migration waves
    const migrationWaves = this.createMigrationWaves(optimizedStrategies, dependencies);

    // Phase 4: Generate timeline
    const timeline = this.generateTimeline(migrationWaves, onboardingProfile);

    // Phase 5: Calculate costs
    const costBreakdown = this.calculateCosts(optimizedStrategies, timeline);

    // Phase 6: Risk analysis
    const riskAnalysis = this.analyzeRisks(optimizedStrategies, dependencies);

    // Phase 7: Create action plan
    const actionPlan = this.createActionPlan(migrationWaves, timeline);

    return {
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
  }

  /**
   * Analyze each asset and recommend strategy
   */
  analyzeAssets(assets) {
    return assets.map(asset => {
      const strategy = this.recommendStrategy(asset);
      const gcpMapping = this.mapToGcpService(asset, strategy);

      return {
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.type,
        currentState: {
          os: asset.os,
          cpu: asset.cpu,
          memory: asset.memory,
          storage: asset.storage,
          utilization: asset.utilization,
        },
        recommendedStrategy: strategy,
        gcpMapping,
        effort: this.estimateEffort(asset, strategy),
        priority: this.calculatePriority(asset),
        readinessScore: asset.compatibility?.gcpReady ? 85 : 45,
      };
    });
  }

  /**
   * Recommend migration strategy for an asset
   */
  recommendStrategy(asset) {
    // Check if asset should be retired
    if (asset.utilization &&
        asset.utilization.cpu < 10 &&
        asset.utilization.memory < 20) {
      return {
        type: 'retire',
        reason: 'Low utilization suggests asset may not be needed',
        confidence: 'medium',
        ...this.strategies.retire,
      };
    }

    // Check if asset is cloud-ready
    if (!asset.compatibility?.gcpReady) {
      // Legacy system - needs refactoring
      if (asset.tags?.includes('critical')) {
        return {
          type: 'refactor',
          reason: 'Critical legacy system requires modernization for cloud',
          confidence: 'high',
          ...this.strategies.refactor,
        };
      } else {
        return {
          type: 'retain',
          reason: 'Complex migration - defer until later phase',
          confidence: 'medium',
          ...this.strategies.retain,
        };
      }
    }

    // Database-specific logic
    if (asset.type === 'database') {
      if (asset.compatibility?.recommendedService?.includes('Cloud SQL')) {
        return {
          type: 'replatform',
          reason: 'Use managed Cloud SQL for better performance and less maintenance',
          confidence: 'high',
          ...this.strategies.replatform,
        };
      }
    }

    // Application-specific logic
    if (asset.type === 'application') {
      if (asset.compatibility?.modernizationStrategy === 'containerize') {
        return {
          type: 'refactor',
          reason: 'Containerization will enable better scalability and cloud-native benefits',
          confidence: 'high',
          ...this.strategies.refactor,
        };
      }
      if (asset.platform === 'Java' || asset.platform === 'Node.js') {
        return {
          type: 'replatform',
          reason: 'Modern platform can benefit from cloud optimizations',
          confidence: 'high',
          ...this.strategies.replatform,
        };
      }
    }

    // VM-specific logic
    if (asset.type === 'vm') {
      const cpuUtil = asset.utilization?.cpu || 50;
      const memUtil = asset.utilization?.memory || 50;

      if (cpuUtil < 30 && memUtil < 40) {
        return {
          type: 'rehost',
          reason: 'Simple lift-and-shift with rightsizing opportunity',
          confidence: 'high',
          rightsizing: true,
          ...this.strategies.rehost,
        };
      }

      return {
        type: 'rehost',
        reason: 'Standard VM migration to Compute Engine',
        confidence: 'high',
        ...this.strategies.rehost,
      };
    }

    // Storage systems
    if (asset.type === 'storage') {
      return {
        type: 'replatform',
        reason: 'Use managed GCP storage services for better reliability',
        confidence: 'high',
        ...this.strategies.replatform,
      };
    }

    // Default: rehost
    return {
      type: 'rehost',
      reason: 'Standard migration approach',
      confidence: 'medium',
      ...this.strategies.rehost,
    };
  }

  /**
   * Map asset to GCP services
   */
  mapToGcpService(asset, strategy) {
    const mapping = {
      service: null,
      instanceType: null,
      additionalServices: [],
      estimatedCost: 0,
    };

    switch (asset.type) {
      case 'vm':
        mapping.service = 'Compute Engine';
        mapping.instanceType = asset.compatibility?.recommendedInstance || 'n2-standard-2';
        mapping.additionalServices = ['Cloud Monitoring', 'Cloud Logging'];
        mapping.estimatedCost = this.estimateComputeCost(asset);
        break;

      case 'database':
        if (strategy.type === 'replatform') {
          mapping.service = asset.compatibility?.recommendedService || 'Cloud SQL';
          mapping.instanceType = asset.compatibility?.recommendedInstance || 'db-n1-standard-2';
          mapping.additionalServices = ['Cloud SQL Proxy', 'Automated Backups'];
        } else {
          mapping.service = 'Compute Engine + Self-Managed DB';
          mapping.instanceType = asset.compatibility?.recommendedInstance || 'n2-highmem-4';
          mapping.additionalServices = ['Persistent Disk', 'Cloud Monitoring'];
        }
        mapping.estimatedCost = this.estimateDatabaseCost(asset);
        break;

      case 'storage':
        mapping.service = asset.compatibility?.recommendedService || 'Cloud Storage';
        mapping.instanceType = asset.compatibility?.tier || 'Standard';
        mapping.additionalServices = ['Object Lifecycle Management', 'Versioning'];
        mapping.estimatedCost = this.estimateStorageCost(asset);
        break;

      case 'application':
        if (strategy.type === 'refactor' && asset.compatibility?.modernizationStrategy === 'containerize') {
          mapping.service = 'Google Kubernetes Engine (GKE)';
          mapping.instanceType = 'n2-standard-4 (node pool)';
          mapping.additionalServices = ['Cloud Load Balancing', 'Cloud CDN', 'Artifact Registry'];
        } else {
          mapping.service = 'Compute Engine + App Server';
          mapping.instanceType = 'n2-standard-4';
          mapping.additionalServices = ['Cloud Load Balancing'];
        }
        mapping.estimatedCost = this.estimateApplicationCost(asset);
        break;

      default:
        mapping.service = 'Compute Engine';
        mapping.instanceType = 'n2-standard-2';
        mapping.estimatedCost = 1000;
    }

    return mapping;
  }

  /**
   * Estimate migration effort
   */
  estimateEffort(asset, strategy) {
    const baseHours = {
      rehost: 40,
      replatform: 80,
      refactor: 200,
      repurchase: 60,
      retire: 8,
      retain: 0,
    };

    let hours = baseHours[strategy.type] || 40;

    // Adjust for complexity
    if (asset.type === 'database') hours *= 1.5;
    if (asset.type === 'application') hours *= 1.8;
    if (asset.tags?.includes('critical')) hours *= 1.3;
    if (!asset.compatibility?.gcpReady) hours *= 2;

    return {
      hours: Math.round(hours),
      days: Math.round(hours / 8),
      weeks: Math.round(hours / 40),
      complexity: hours > 160 ? 'high' : hours > 80 ? 'medium' : 'low',
    };
  }

  /**
   * Calculate asset priority
   */
  calculatePriority(asset) {
    let score = 50;

    // Business criticality
    if (asset.tags?.includes('critical')) score += 30;
    if (asset.tags?.includes('production')) score += 20;

    // Complexity (inverse relationship)
    if (asset.compatibility?.gcpReady) score += 20;
    else score -= 20;

    // Dependencies (fewer is better for early migration)
    const depCount = asset.dependencies?.length || 0;
    score -= depCount * 5;

    // Utilization (migrate underutilized first for quick wins)
    if (asset.utilization) {
      const avgUtil = (asset.utilization.cpu + asset.utilization.memory) / 2;
      if (avgUtil < 40) score += 15; // Quick win
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      level: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
    };
  }

  /**
   * Optimize strategies based on dependencies
   */
  optimizeForDependencies(strategies, dependencies) {
    // If asset A depends on asset B, asset B should migrate first
    const optimized = [...strategies];

    if (dependencies.links) {
      dependencies.links.forEach(link => {
        const sourceStrategy = optimized.find(s => s.assetId === link.source);
        const targetStrategy = optimized.find(s => s.assetId === link.target);

        if (sourceStrategy && targetStrategy) {
          // Lower priority of dependent asset
          if (sourceStrategy.priority.score > targetStrategy.priority.score) {
            sourceStrategy.priority.score -= 10;
            sourceStrategy.dependsOn = sourceStrategy.dependsOn || [];
            sourceStrategy.dependsOn.push(link.target);
          }
        }
      });
    }

    return optimized;
  }

  /**
   * Create migration waves
   */
  createMigrationWaves(strategies, dependencies) {
    const waves = [];
    let remainingAssets = [...strategies];
    let waveNumber = 1;

    while (remainingAssets.length > 0) {
      const wave = {
        wave: waveNumber,
        name: this.getWaveName(waveNumber),
        assets: [],
        duration: 0,
        cost: 0,
        risks: [],
      };

      // Get assets ready for this wave (no unmet dependencies)
      const readyAssets = remainingAssets.filter(asset => {
        if (!asset.dependsOn || asset.dependsOn.length === 0) {
          return true;
        }
        // Check if all dependencies are in previous waves
        return asset.dependsOn.every(depId =>
          waves.some(w => w.assets.some(a => a.assetId === depId))
        );
      });

      if (readyAssets.length === 0 && remainingAssets.length > 0) {
        // Circular dependency or complex scenario - add remaining to final wave
        wave.assets = remainingAssets;
        remainingAssets = [];
      } else {
        // Add top priority assets to this wave (limit wave size)
        const waveSize = waveNumber === 1 ? 2 : 3; // Smaller pilot wave
        const waveAssets = readyAssets
          .sort((a, b) => b.priority.score - a.priority.score)
          .slice(0, waveSize);

        wave.assets = waveAssets;
        remainingAssets = remainingAssets.filter(
          asset => !waveAssets.some(wa => wa.assetId === asset.assetId)
        );
      }

      // Calculate wave metrics
      wave.duration = Math.max(...wave.assets.map(a => a.effort.weeks));
      wave.cost = wave.assets.reduce((sum, a) => sum + a.gcpMapping.estimatedCost, 0);
      wave.risks = this.identifyWaveRisks(wave.assets);

      waves.push(wave);
      waveNumber++;

      // Safety limit
      if (waveNumber > 10) break;
    }

    return waves;
  }

  /**
   * Get wave name based on number
   */
  getWaveName(waveNumber) {
    const names = {
      1: 'Pilot/Proof of Concept',
      2: 'Production Non-Critical',
      3: 'Production Critical',
      4: 'Complex/Legacy Systems',
    };
    return names[waveNumber] || `Wave ${waveNumber}`;
  }

  /**
   * Identify risks for a wave
   */
  identifyWaveRisks(assets) {
    const risks = [];

    const criticalCount = assets.filter(a => a.assetId.includes('critical')).length;
    if (criticalCount > 0) {
      risks.push({
        type: 'business_impact',
        severity: 'high',
        description: `${criticalCount} critical system(s) in this wave`,
      });
    }

    const refactorCount = assets.filter(a => a.recommendedStrategy.type === 'refactor').length;
    if (refactorCount > 0) {
      risks.push({
        type: 'technical_complexity',
        severity: 'medium',
        description: `${refactorCount} asset(s) require refactoring`,
      });
    }

    return risks;
  }

  /**
   * Generate detailed timeline
   */
  generateTimeline(waves, onboardingProfile) {
    let totalWeeks = 0;
    const phases = [];

    // Pre-migration phase
    phases.push({
      name: 'Assessment & Planning',
      duration: 4,
      startWeek: 0,
      activities: ['Discovery', 'Strategy', 'Training', 'Procurement'],
    });
    totalWeeks += 4;

    // Add each wave
    waves.forEach(wave => {
      phases.push({
        name: wave.name,
        duration: wave.duration + 2, // Add buffer
        startWeek: totalWeeks,
        activities: ['Migration', 'Testing', 'Cutover'],
        assets: wave.assets.map(a => a.assetName),
      });
      totalWeeks += wave.duration + 2;
    });

    // Post-migration phase
    phases.push({
      name: 'Optimization & Stabilization',
      duration: 4,
      startWeek: totalWeeks,
      activities: ['Performance tuning', 'Cost optimization', 'Training', 'Documentation'],
    });
    totalWeeks += 4;

    return {
      totalWeeks,
      totalMonths: Math.ceil(totalWeeks / 4),
      phases,
      milestones: this.generateMilestones(phases),
    };
  }

  /**
   * Generate project milestones
   */
  generateMilestones(phases) {
    return [
      { week: 0, name: 'Project Kickoff', phase: 'Assessment & Planning' },
      { week: 2, name: 'Discovery Complete', phase: 'Assessment & Planning' },
      { week: 4, name: 'Strategy Approved', phase: 'Assessment & Planning' },
      ...phases
        .filter(p => p.assets)
        .map(p => ({
          week: p.startWeek + p.duration,
          name: `${p.name} Complete`,
          phase: p.name,
        })),
      { week: phases[phases.length - 1].startWeek, name: 'Go-Live', phase: 'Optimization' },
      { week: phases[phases.length - 1].startWeek + 4, name: 'Project Closure', phase: 'Optimization' },
    ];
  }

  /**
   * Calculate migration costs
   */
  calculateCosts(strategies, timeline) {
    let migrationServices = 0;
    let infrastructure = 0;
    let licenses = 0;
    let training = 0;

    strategies.forEach(strategy => {
      migrationServices += strategy.effort.hours * 150; // $150/hour
      infrastructure += strategy.gcpMapping.estimatedCost;

      if (strategy.recommendedStrategy.type === 'replatform') {
        licenses += 5000;
      }
      if (strategy.recommendedStrategy.type === 'refactor') {
        licenses += 10000;
      }
    });

    training = strategies.length * 2000; // $2k per asset for training

    const subtotal = migrationServices + infrastructure + licenses + training;
    const contingency = subtotal * 0.15;
    const total = subtotal + contingency;

    return {
      migrationServices,
      infrastructure,
      licenses,
      training,
      contingency,
      subtotal,
      total: Math.round(total),
      breakdown: strategies.map(s => ({
        asset: s.assetName,
        cost: s.effort.hours * 150 + s.gcpMapping.estimatedCost,
      })),
    };
  }

  /**
   * Analyze migration risks
   */
  analyzeRisks(strategies, dependencies) {
    const risks = [];

    // Technical risks
    const complexAssets = strategies.filter(s => s.effort.complexity === 'high');
    if (complexAssets.length > 0) {
      risks.push({
        category: 'Technical',
        severity: 'high',
        risk: 'Complex migrations may encounter technical challenges',
        probability: 'medium',
        impact: 'high',
        mitigation: 'Conduct thorough testing, engage experts, plan extra buffer time',
        assets: complexAssets.map(a => a.assetName),
      });
    }

    // Business risks
    const criticalAssets = strategies.filter(s =>
      s.currentState.tags?.includes('critical')
    );
    if (criticalAssets.length > 0) {
      risks.push({
        category: 'Business',
        severity: 'critical',
        risk: 'Downtime of critical systems impacts business operations',
        probability: 'low',
        impact: 'critical',
        mitigation: 'Implement zero-downtime migration, robust rollback procedures',
        assets: criticalAssets.map(a => a.assetName),
      });
    }

    // Dependency risks
    if (dependencies.criticalPaths?.length > 5) {
      risks.push({
        category: 'Dependency',
        severity: 'medium',
        risk: 'Complex dependency chains may cause cascading issues',
        probability: 'medium',
        impact: 'medium',
        mitigation: 'Map all dependencies, test inter-system connectivity thoroughly',
      });
    }

    return risks;
  }

  /**
   * Create detailed action plan
   */
  createActionPlan(waves, timeline) {
    const actionPlan = [];

    timeline.phases.forEach(phase => {
      if (phase.assets) {
        phase.assets.forEach(assetName => {
          actionPlan.push({
            phase: phase.name,
            week: phase.startWeek,
            asset: assetName,
            actions: [
              'Prepare migration runbook',
              'Set up GCP resources',
              'Configure networking and security',
              'Migrate data',
              'Migrate application/workload',
              'Conduct testing',
              'Cutover and validation',
              'Decommission source',
            ],
          });
        });
      }
    });

    return actionPlan;
  }

  /**
   * Generate strategic recommendations
   */
  generateStrategicRecommendations(strategies, risks) {
    const recommendations = [];

    // Strategy distribution
    const distribution = this.getStrategyDistribution(strategies);
    if (distribution.rehost > 70) {
      recommendations.push({
        priority: 'medium',
        category: 'Strategy',
        title: 'Consider More Cloud Optimization',
        description: 'Over 70% of assets using lift-and-shift may miss cloud benefits',
        action: 'Evaluate replatforming opportunities for key workloads',
      });
    }

    // Risk-based recommendations
    if (risks.some(r => r.severity === 'critical')) {
      recommendations.push({
        priority: 'critical',
        category: 'Risk Management',
        title: 'Critical Risks Identified',
        description: 'Address critical risks before proceeding with migration',
        action: 'Implement all risk mitigation strategies and conduct dry runs',
      });
    }

    // Refactoring recommendations
    const refactorCount = strategies.filter(s => s.recommendedStrategy.type === 'refactor').length;
    if (refactorCount > 3) {
      recommendations.push({
        priority: 'high',
        category: 'Modernization',
        title: 'Significant Modernization Required',
        description: `${refactorCount} applications require refactoring`,
        action: 'Budget for extended timeline and consider using Cloud Code-Mod tools',
      });
    }

    return recommendations;
  }

  /**
   * Get strategy distribution
   */
  getStrategyDistribution(strategies) {
    const distribution = {
      rehost: 0,
      replatform: 0,
      refactor: 0,
      repurchase: 0,
      retire: 0,
      retain: 0,
    };

    strategies.forEach(s => {
      distribution[s.recommendedStrategy.type]++;
    });

    const total = strategies.length;
    Object.keys(distribution).forEach(key => {
      distribution[key] = Math.round((distribution[key] / total) * 100);
    });

    return distribution;
  }

  // Cost estimation helpers
  estimateComputeCost(asset) {
    const baseCost = 100; // Base monthly cost
    const cpuCost = (asset.cpu || 2) * 25;
    const memCost = (asset.memory || 8) * 5;
    return baseCost + cpuCost + memCost;
  }

  estimateDatabaseCost(asset) {
    const baseCost = 200;
    const cpuCost = (asset.cpu || 4) * 35;
    const memCost = (asset.memory || 16) * 8;
    const storageCost = (asset.storage || 100) * 0.5;
    return baseCost + cpuCost + memCost + storageCost;
  }

  estimateStorageCost(asset) {
    const capacity = asset.capacity || asset.storage || 1000;
    return capacity * 0.02; // $0.02 per GB/month
  }

  estimateApplicationCost(asset) {
    return 500; // Base application hosting cost
  }
}

export default StrategyAgent;
