/**
 * Advanced Analytics Engine
 * Provides sophisticated analysis and insights for TCO calculations
 */

import CloudPricingAPI from './cloudPricingAPI';

class AdvancedAnalytics {
  // Sensitivity analysis - see how changes in key variables affect TCO
  static sensitivityAnalysis(baseInputs, variable, rangePercentage = 0.3) {
    const results = [];
    const baseResult = CloudPricingAPI.calculateEnhancedTCO(baseInputs);
    
    // Define the range for sensitivity analysis
    const minValue = 1 - rangePercentage;
    const maxValue = 1 + rangePercentage;
    const steps = 7; // Number of steps in the analysis
    
    for (let i = 0; i < steps; i++) {
      const factor = minValue + (i * (maxValue - minValue) / (steps - 1));
      const modifiedInputs = { ...baseInputs };
      
      if (variable === 'onPremiseCosts') {
        // Scale all on-premise costs by the factor
        modifiedInputs.onPremise = {};
        for (const [key, value] of Object.entries(baseInputs.onPremise)) {
          modifiedInputs.onPremise[key] = value * factor;
        }
      } else if (variable === 'cloudCosts') {
        // Scale all cloud costs by the factor
        if (modifiedInputs.cloudSelection?.aws) {
          for (const [key, value] of Object.entries(baseInputs.cloudSelection.aws)) {
            if (typeof value === 'number') {
              modifiedInputs.cloudSelection.aws[key] = value * factor;
            }
          }
        }
        if (modifiedInputs.cloudSelection?.azure) {
          for (const [key, value] of Object.entries(baseInputs.cloudSelection.azure)) {
            if (typeof value === 'number') {
              modifiedInputs.cloudSelection.azure[key] = value * factor;
            }
          }
        }
        if (modifiedInputs.cloudSelection?.gcp) {
          for (const [key, value] of Object.entries(baseInputs.cloudSelection.gcp)) {
            if (typeof value === 'number') {
              modifiedInputs.cloudSelection.gcp[key] = value * factor;
            }
          }
        }
      } else if (variable === 'migrationCosts') {
        if (modifiedInputs.migration) {
          for (const [key, value] of Object.entries(baseInputs.migration)) {
            if (typeof value === 'number') {
              modifiedInputs.migration[key] = value * factor;
            }
          }
        }
      }
      
      const result = CloudPricingAPI.calculateEnhancedTCO(modifiedInputs);
      results.push({
        factor: parseFloat(factor.toFixed(2)),
        tco: result.totalCloudTCO,
        savings: result.savings,
        roi: result.roi
      });
    }
    
    return {
      baseValue: baseResult.totalCloudTCO,
      sensitivityData: results
    };
  }

  // Risk-adjusted TCO calculations
  static riskAdjustedTCO(inputs, riskFactors = {}) {
    const baseResult = CloudPricingAPI.calculateEnhancedTCO(inputs);
    
    // Apply risk factors to adjust the TCO
    const riskMultiplier = this.calculateRiskMultiplier(riskFactors);
    
    return {
      ...baseResult,
      riskAdjustedTCO: baseResult.totalCloudTCO * riskMultiplier,
      riskPremium: baseResult.totalCloudTCO * (riskMultiplier - 1),
      riskMultiplier: riskMultiplier
    };
  }

  static calculateRiskMultiplier(riskFactors) {
    let multiplier = 1.0;
    
    // Unplanned downtime risk
    if (riskFactors.downtimeRisk) {
      multiplier += riskFactors.downtimeRisk * 0.05; // 5% of monthly cost per 1% downtime risk
    }
    
    // Data loss risk
    if (riskFactors.dataLossRisk) {
      multiplier += riskFactors.dataLossRisk * 0.10; // 10% of monthly cost per 1% data loss risk
    }
    
    // Security breach risk
    if (riskFactors.securityRisk) {
      multiplier += riskFactors.securityRisk * 0.15; // 15% of monthly cost per 1% security risk
    }
    
    // Compliance risk
    if (riskFactors.complianceRisk) {
      multiplier += riskFactors.complianceRisk * 0.08; // 8% of monthly cost per 1% compliance risk
    }
    
    // Vendor lock-in risk
    if (riskFactors.lockInRisk) {
      multiplier += riskFactors.lockInRisk * 0.03; // 3% of monthly cost per 1% lock-in risk
    }
    
    return Math.max(1.0, multiplier); // Never reduce the base cost
  }

  // Benchmarking against industry standards
  static generateBenchmarks(workloadType, workloadSize) {
    const benchmarks = {
      // Industry average TCO savings by workload type
      tcoSavings: {
        'webApplication': { avg: 25, range: [15, 40] },
        'database': { avg: 20, range: [10, 35] },
        'analytics': { avg: 35, range: [25, 50] },
        'development': { avg: 40, range: [30, 55] },
        'legacy': { avg: 15, range: [5, 25] }
      },
      
      // Cost ratios by workload size
      costRatios: {
        'small': { compute: 0.4, storage: 0.2, network: 0.1, management: 0.3 },
        'medium': { compute: 0.35, storage: 0.25, network: 0.15, management: 0.25 },
        'large': { compute: 0.3, storage: 0.3, network: 0.2, management: 0.2 }
      }
    };
    
    const workloadBenchmark = benchmarks.tcoSavings[workloadType] || benchmarks.tcoSavings.webApplication;
    const sizeRatio = benchmarks.costRatios[workloadSize] || benchmarks.costRatios.medium;
    
    return {
      expectedSavings: workloadBenchmark,
      costComposition: sizeRatio,
      // Additional benchmarks could include performance, security, etc.
    };
  }

  // Generate executive summary
  static generateExecutiveSummary(inputs, analytics) {
    const baseResult = CloudPricingAPI.calculateEnhancedTCO(inputs);
    const breakEven = CloudPricingAPI.calculateBreakEvenPoint(
      baseResult.onPremiseTCO / inputs.timeframe,
      baseResult.cloudMonthly,
      baseResult.migrationCost
    );
    
    const recommendations = CloudPricingAPI.getOptimizationRecommendations(inputs.workloadCharacteristics || {});
    
    const summary = {
      timeframe: inputs.timeframe,
      totalInvestment: baseResult.totalCloudTCO,
      totalSavings: baseResult.savings,
      roi: baseResult.roi,
      breakEvenPoint: breakEven,
      costReduction: baseResult.savings > 0 ? (baseResult.savings / baseResult.onPremiseTCO) * 100 : 0,
      recommendations: recommendations.slice(0, 3), // Top 3 recommendations
      riskFactors: inputs.riskFactors || {},
      sensitivityAnalysis: {
        onPremiseCosts: this.sensitivityAnalysis(inputs, 'onPremiseCosts'),
        cloudCosts: this.sensitivityAnalysis(inputs, 'cloudCosts'),
        migrationCosts: this.sensitivityAnalysis(inputs, 'migrationCosts')
      }
    };
    
    // Add confidence level
    summary.confidenceLevel = this.calculateConfidenceLevel(inputs);
    
    return summary;
  }

  // Calculate confidence level based on input completeness
  static calculateConfidenceLevel(inputs) {
    let score = 0;
    let maxScore = 0;
    
    // Check for key inputs
    maxScore += 2; // Timeframe
    if (inputs.timeframe) score += 2;
    
    maxScore += 3; // On-premise costs
    if (inputs.onPremise && Object.keys(inputs.onPremise).length > 0) score += 3;
    
    maxScore += 4; // Cloud selection
    if (inputs.cloudSelection) {
      if (inputs.cloudSelection.aws) score += 1;
      if (inputs.cloudSelection.azure) score += 1;
      if (inputs.cloudSelection.gcp) score += 1;
      // Additional points for detailed cloud costs
      if (Object.keys(inputs.cloudSelection.aws || {}).length > 2) score += 1;
      if (Object.keys(inputs.cloudSelection.azure || {}).length > 2) score += 1;
      if (Object.keys(inputs.cloudSelection.gcp || {}).length > 2) score += 1;
    }
    
    maxScore += 2; // Migration costs
    if (inputs.migration) score += 2;
    
    maxScore += 2; // Workload characteristics
    if (inputs.workloadCharacteristics) score += 2;
    
    // Additional factors
    maxScore += 1; // Region selection
    if (inputs.region) score += 1;
    
    maxScore += 1; // Commitment level
    if (inputs.reservedInstanceTerm || inputs.savingsPlanTerm) score += 1;
    
    const confidencePercentage = (score / maxScore) * 100;
    
    if (confidencePercentage >= 85) return 'High';
    if (confidencePercentage >= 60) return 'Medium';
    return 'Low';
  }

  // Predictive cost trends
  static predictCostTrends(inputs, years = 5) {
    const trends = [];
    const baseResult = CloudPricingAPI.calculateEnhancedTCO(inputs);
    
    // Simulate cost trends over time
    for (let year = 1; year <= years; year++) {
      // Assume on-premise costs increase by 3% annually (maintenance, hardware refresh)
      const onPremiseCost = baseResult.onPremiseTCO / inputs.timeframe * 12 * year * Math.pow(1.03, year);
      
      // Assume cloud costs increase by 1% annually (data growth, feature additions)
      const cloudCost = baseResult.cloudTCO / inputs.timeframe * 12 * year * Math.pow(1.01, year);
      
      // Migration costs are one-time, so don't change
      const totalCloudCost = cloudCost + baseResult.migrationCost;
      
      trends.push({
        year: year,
        onPremise: onPremiseCost,
        cloud: cloudCost,
        totalCloud: totalCloudCost,
        savings: onPremiseCost - totalCloudCost,
        cumulativeSavings: (onPremiseCost - totalCloudCost) + 
                           (year > 1 ? trends[year-2].cumulativeSavings : 0)
      });
    }
    
    return trends;
  }

  // Carbon footprint analysis
  static calculateCarbonFootprint(inputs) {
    // Simplified carbon footprint calculation
    // In reality, this would connect to cloud provider sustainability APIs
    
    const workloadSize = inputs.workloadCharacteristics?.size || 'medium';
    
    // Carbon intensity factors (kg CO2 per dollar spent)
    const carbonFactors = {
      'onPremise': 0.0025, // Higher for on-premise data centers
      'aws': 0.0012,       // AWS is generally more efficient
      'azure': 0.0014,     // Azure has good efficiency
      'gcp': 0.0009        // GCP often has renewable energy
    };
    
    const baseResult = CloudPricingAPI.calculateEnhancedTCO(inputs);
    
    const footprint = {
      onPremise: baseResult.onPremiseTCO * carbonFactors.onPremise,
      aws: 0,
      azure: 0,
      gcp: 0,
      totalReduction: 0
    };
    
    if (inputs.cloudSelection?.aws) {
      footprint.aws = (baseResult.cloudTCO / 3) * carbonFactors.aws; // Simplified equal distribution
    }
    if (inputs.cloudSelection?.azure) {
      footprint.azure = (baseResult.cloudTCO / 3) * carbonFactors.azure;
    }
    if (inputs.cloudSelection?.gcp) {
      footprint.gcp = (baseResult.cloudTCO / 3) * carbonFactors.gcp;
    }
    
    const totalCloudFootprint = footprint.aws + footprint.azure + footprint.gcp;
    footprint.totalReduction = footprint.onPremise - totalCloudFootprint;
    footprint.percentReduction = totalCloudFootprint > 0 ? 
      ((footprint.onPremise - totalCloudFootprint) / footprint.onPremise) * 100 : 0;
    
    return footprint;
  }

  // Generate detailed cost breakdown
  static generateCostBreakdown(inputs) {
    const baseResult = CloudPricingAPI.calculateEnhancedTCO(inputs);
    
    // Categorize costs for detailed breakdown
    const breakdown = {
      categories: {
        infrastructure: {
          compute: 0,
          storage: 0,
          networking: 0,
          other: 0
        },
        software: {
          licenses: 0,
          subscriptions: 0
        },
        operations: {
          personnel: 0,
          management: 0,
          support: 0
        },
        migration: {
          assessment: 0,
          tools: 0,
          training: 0,
          implementation: 0
        }
      },
      timeline: {
        year1: { costs: [], savings: 0 },
        year2: { costs: [], savings: 0 },
        year3: { costs: [], savings: 0 }
      }
    };
    
    // Populate with actual calculated values
    breakdown.categories.infrastructure = baseResult.cloudCostBreakdown || {};
    breakdown.categories.migration = inputs.migration || { assessment: 0, tools: 0, training: 0, implementation: 0 };
    
    return breakdown;
  }
}

export default AdvancedAnalytics;