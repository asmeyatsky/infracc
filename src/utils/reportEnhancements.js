/**
 * Report Enhancement Utilities
 * Helper functions for generating enhanced report sections
 */

/**
 * Calculate key insights from report data
 */
export const calculateKeyInsights = (reportData, costEstimates, strategyResults) => {
  const insights = {
    topCostDrivers: [],
    quickWins: [],
    riskAreas: [],
    migrationOpportunities: []
  };

  const summary = reportData?.summary || {};
  const services = reportData?.services?.topServices || [];
  const complexity = reportData?.complexity || {};
  const readiness = reportData?.readiness || {};

  // Top 3 cost drivers (services)
  // CRITICAL: Service objects use 'service' property, not 'name'
  insights.topCostDrivers = services
    .slice(0, 3)
    .map(s => ({
      service: s.service || s.name || 'Unknown',
      cost: s.totalCost || 0,
      percentage: summary.totalMonthlyCost > 0 
        ? ((s.totalCost || 0) / summary.totalMonthlyCost * 100).toFixed(1)
        : '0.0'
    }));

  // Quick wins: Low complexity + High cost
  const lowComplexityCost = complexity.low?.totalCost || 0;
  const totalCost = summary.totalMonthlyCost || 0;
  if (lowComplexityCost > 0 && totalCost > 0) {
    insights.quickWins.push({
      description: `${(lowComplexityCost / totalCost * 100).toFixed(1)}% of costs are in low-complexity workloads`,
      count: complexity.low?.count || 0,
      cost: lowComplexityCost
    });
  }

  // Risk areas: High complexity + Not Ready
  const highComplexityCount = complexity.high?.count || 0;
  const notReadyCount = readiness.notReady?.count || 0;
  if (highComplexityCount > 0) {
    insights.riskAreas.push({
      description: `${highComplexityCount.toLocaleString()} high-complexity workloads require additional planning`,
      count: highComplexityCount,
      cost: complexity.high?.totalCost || 0
    });
  }
  if (notReadyCount > 0) {
    insights.riskAreas.push({
      description: `${notReadyCount.toLocaleString()} workloads are not ready for migration`,
      count: notReadyCount,
      cost: readiness.notReady?.totalCost || 0
    });
  }

  // Migration opportunities: Ready workloads
  const readyCount = readiness.ready?.count || 0;
  if (readyCount > 0) {
    insights.migrationOpportunities.push({
      description: `${readyCount.toLocaleString()} workloads are ready for immediate migration`,
      count: readyCount,
      cost: readiness.ready?.totalCost || 0
    });
  }

  return insights;
};

/**
 * Calculate cost breakdown by category
 */
export const calculateCostBreakdown = (services) => {
  const categories = {
    compute: { name: 'Compute', cost: 0, services: [] },
    storage: { name: 'Storage', cost: 0, services: [] },
    network: { name: 'Network', cost: 0, services: [] },
    database: { name: 'Database', cost: 0, services: [] },
    analytics: { name: 'Analytics', cost: 0, services: [] },
    security: { name: 'Security', cost: 0, services: [] },
    other: { name: 'Other', cost: 0, services: [] }
  };

  const serviceCategoryMap = {
    compute: ['EC2', 'Lambda', 'Elastic Beanstalk', 'ECS', 'EKS', 'Fargate', 'Batch', 'Lightsail'],
    storage: ['S3', 'EBS', 'EFS', 'Glacier', 'Storage Gateway', 'FSx'],
    network: ['CloudFront', 'VPC', 'Direct Connect', 'API Gateway', 'Route 53', 'ELB', 'NAT Gateway', 'Transit Gateway'],
    database: ['RDS', 'DynamoDB', 'ElastiCache', 'Redshift', 'DocumentDB', 'Neptune', 'Timestream'],
    analytics: ['EMR', 'Athena', 'Kinesis', 'QuickSight', 'Glue', 'Data Pipeline'],
    security: ['IAM', 'CloudTrail', 'Config', 'GuardDuty', 'WAF', 'Shield', 'Secrets Manager', 'KMS']
  };

  services.forEach(service => {
    const serviceName = (service.name || '').toUpperCase();
    let categorized = false;

    for (const [category, serviceList] of Object.entries(serviceCategoryMap)) {
      if (serviceList.some(s => serviceName.includes(s.toUpperCase()))) {
        categories[category].cost += service.totalCost || 0;
        categories[category].services.push(service.name);
        categorized = true;
        break;
      }
    }

    if (!categorized) {
      categories.other.cost += service.totalCost || 0;
      categories.other.services.push(service.name);
    }
  });

  return Object.values(categories).filter(cat => cat.cost > 0);
};

/**
 * Calculate top expensive workloads
 * MEMORY-EFFICIENT: Uses streaming approach for large datasets
 */
export const getTopExpensiveWorkloads = (workloads, count = 10) => {
  if (!Array.isArray(workloads)) return [];
  
  // CRITICAL: For very large arrays, use a more memory-efficient approach
  // Use batching to avoid stack overflow with extremely large arrays (600K+ workloads)
  const BATCH_SIZE = 50000;
  const MIN_COST_THRESHOLD = 0.01; // Ignore workloads with very small costs
  
  if (workloads.length > 50000) {
    // Use a heap/priority queue approach: maintain only top N items
    // CRITICAL: Process in batches to avoid stack overflow
    const topN = [];
    
    // Process workloads in batches
    for (let batchStart = 0; batchStart < workloads.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, workloads.length);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const w = workloads[i];
        if (!w || !w.monthlyCost || w.monthlyCost < MIN_COST_THRESHOLD) continue;
        
        const cost = w.monthlyCost || 0;
        
        if (topN.length < count) {
          topN.push({
            name: w.name || w.id || 'Unknown',
            service: w.service || 'Unknown',
            region: w.region || 'Unknown',
            cost: cost,
            complexity: w.assessment?.complexity || 'N/A',
            readiness: w.assessment?.readiness || 'N/A'
          });
          // Only sort when we reach the target count
          if (topN.length === count) {
            // Use insertion sort approach - more efficient for small arrays
            topN.sort((a, b) => b.cost - a.cost);
          }
        } else {
          // Check if this cost is larger than the smallest in topN
          // Find the minimum cost in topN (should be last element after sort)
          const minCost = topN[topN.length - 1]?.cost || 0;
          if (cost > minCost) {
            // Replace the smallest element
            topN[topN.length - 1] = {
              name: w.name || w.id || 'Unknown',
              service: w.service || 'Unknown',
              region: w.region || 'Unknown',
              cost: cost,
              complexity: w.assessment?.complexity || 'N/A',
              readiness: w.assessment?.readiness || 'N/A'
            };
            // Re-sort only the last few elements (more efficient than full sort)
            // For small arrays (count <= 10), full sort is fine
            topN.sort((a, b) => b.cost - a.cost);
          }
        }
      }
      
      // Log progress for very large datasets
      if (workloads.length > 200000 && batchEnd % 100000 === 0) {
        console.log(`[getTopExpensiveWorkloads] Processed ${batchEnd.toLocaleString()}/${workloads.length.toLocaleString()} workloads`);
      }
    }
    
    return topN;
  }
  
  // For smaller arrays, use standard approach but still batch filter to avoid stack overflow
  if (workloads.length > 10000) {
    // Batch filter for medium-sized arrays
    const filtered = [];
    for (let i = 0; i < workloads.length; i += BATCH_SIZE) {
      const batch = workloads.slice(i, Math.min(i + BATCH_SIZE, workloads.length));
      for (const w of batch) {
        if (w && w.monthlyCost && w.monthlyCost > MIN_COST_THRESHOLD) {
          filtered.push(w);
        }
      }
    }
    
    // Sort filtered results
    filtered.sort((a, b) => (b.monthlyCost || 0) - (a.monthlyCost || 0));
    
    return filtered.slice(0, count).map(w => ({
      name: w.name || w.id || 'Unknown',
      service: w.service || 'Unknown',
      region: w.region || 'Unknown',
      cost: w.monthlyCost || 0,
      complexity: w.assessment?.complexity || 'N/A',
      readiness: w.assessment?.readiness || 'N/A'
    }));
  }
  
  // For small arrays, use standard approach
  return workloads
    .filter(w => w && w.monthlyCost && w.monthlyCost > MIN_COST_THRESHOLD)
    .sort((a, b) => (b.monthlyCost || 0) - (a.monthlyCost || 0))
    .slice(0, count)
    .map(w => ({
      name: w.name || w.id || 'Unknown',
      service: w.service || 'Unknown',
      region: w.region || 'Unknown',
      cost: w.monthlyCost || 0,
      complexity: w.assessment?.complexity || 'N/A',
      readiness: w.assessment?.readiness || 'N/A'
    }));
};

/**
 * Calculate cost anomalies
 * MEMORY-EFFICIENT: Processes in batches for large datasets
 */
export const detectCostAnomalies = (workloads, services) => {
  const anomalies = {
    highCostWorkloads: [],
    costSpikes: [],
    optimizationOpportunities: []
  };

  if (!Array.isArray(workloads) || workloads.length === 0) return anomalies;

  // CRITICAL: For very large arrays, use batch processing
  const BATCH_SIZE = 50000;
  let totalCost = 0;
  let count = 0;
  
  // First pass: calculate average (in batches to avoid memory issues)
  for (let i = 0; i < workloads.length; i += BATCH_SIZE) {
    const batch = workloads.slice(i, Math.min(i + BATCH_SIZE, workloads.length));
    for (const w of batch) {
      const cost = w.monthlyCost || 0;
      if (cost > 0) {
        totalCost += cost;
        count++;
      }
    }
  }
  
  const avgCost = count > 0 ? totalCost / count : 0;
  
  // Calculate standard deviation in batches
  let sumSquaredDiffs = 0;
  for (let i = 0; i < workloads.length; i += BATCH_SIZE) {
    const batch = workloads.slice(i, Math.min(i + BATCH_SIZE, workloads.length));
    for (const w of batch) {
      const cost = w.monthlyCost || 0;
      if (cost > 0) {
        sumSquaredDiffs += Math.pow(cost - avgCost, 2);
      }
    }
  }
  const stdDev = Math.sqrt(sumSquaredDiffs / count);

  // High-cost workloads (more than 3 standard deviations) - process in batches
  const threshold = avgCost + (3 * stdDev);
  const highCostCandidates = [];
  const MAX_CANDIDATES = 20; // Keep more candidates, then sort once at the end
  
  for (let i = 0; i < workloads.length; i += BATCH_SIZE) {
    const batch = workloads.slice(i, Math.min(i + BATCH_SIZE, workloads.length));
    for (const w of batch) {
      const cost = w.monthlyCost || 0;
      if (cost > threshold) {
        highCostCandidates.push({
          name: w.name || w.id,
          cost: cost,
          deviation: ((cost - avgCost) / avgCost * 100).toFixed(1) + '%'
        });
        // Keep only top MAX_CANDIDATES to avoid memory issues
        if (highCostCandidates.length > MAX_CANDIDATES) {
          // Partial sort - find and remove smallest
          let minIdx = 0;
          let minCost = highCostCandidates[0].cost;
          for (let j = 1; j < highCostCandidates.length; j++) {
            if (highCostCandidates[j].cost < minCost) {
              minCost = highCostCandidates[j].cost;
              minIdx = j;
            }
          }
          highCostCandidates.splice(minIdx, 1);
        }
      }
    }
  }
  // Sort once at the end (small array, safe)
  anomalies.highCostWorkloads = highCostCandidates.sort((a, b) => b.cost - a.cost).slice(0, 10);

  // Optimization opportunities: High cost + Low complexity - process in batches
  const optCandidates = [];
  const MAX_OPT_CANDIDATES = 20; // Keep more candidates, then sort once at the end
  
  for (let i = 0; i < workloads.length; i += BATCH_SIZE) {
    const batch = workloads.slice(i, Math.min(i + BATCH_SIZE, workloads.length));
    for (const w of batch) {
      const cost = w.monthlyCost || 0;
      const complexity = w.assessment?.complexity || 10;
      if (cost > avgCost && complexity <= 3) {
        optCandidates.push({
          name: w.name || w.id,
          cost: cost,
          complexity: complexity,
          potentialSavings: (cost * 0.2).toFixed(2) // Assume 20% savings potential
        });
        // Keep only top MAX_OPT_CANDIDATES to avoid memory issues
        if (optCandidates.length > MAX_OPT_CANDIDATES) {
          // Partial sort - find and remove smallest
          let minIdx = 0;
          let minCost = optCandidates[0].cost;
          for (let j = 1; j < optCandidates.length; j++) {
            if (optCandidates[j].cost < minCost) {
              minCost = optCandidates[j].cost;
              minIdx = j;
            }
          }
          optCandidates.splice(minIdx, 1);
        }
      }
    }
  }
  // Sort once at the end (small array, safe)
  anomalies.optimizationOpportunities = optCandidates.sort((a, b) => b.cost - a.cost).slice(0, 10);

  return anomalies;
};

/**
 * Calculate standard deviation
 */
const calculateStandardDeviation = (values) => {
  if (values.length === 0) return 0;
  const avg = values.reduce((sum, v) => sum + (v || 0), 0) / values.length;
  const squareDiffs = values.map(v => Math.pow((v || 0) - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
};

/**
 * Calculate risk assessment
 */
export const calculateRiskAssessment = (reportData, strategyResults) => {
  const risks = [];
  const complexity = reportData?.complexity || {};
  const readiness = reportData?.readiness || {};
  const services = reportData?.services?.topServices || [];

  // High complexity risk
  const highComplexityCount = complexity.high?.count || 0;
  const totalWorkloads = reportData?.summary?.totalWorkloads || 1;
  if (highComplexityCount > 0) {
    risks.push({
      risk: 'High Complexity Workloads',
      likelihood: 'High',
      impact: 'High',
      description: `${highComplexityCount.toLocaleString()} workloads (${(highComplexityCount/totalWorkloads*100).toFixed(1)}%) have high complexity`,
      mitigation: 'Conduct detailed assessment, allocate additional resources, consider phased migration'
    });
  }

  // Not ready risk
  const notReadyCount = readiness.notReady?.count || 0;
  if (notReadyCount > 0) {
    risks.push({
      risk: 'Workloads Not Ready for Migration',
      likelihood: 'Medium',
      impact: 'High',
      description: `${notReadyCount.toLocaleString()} workloads are not ready for migration`,
      mitigation: 'Address blockers, update dependencies, conduct readiness assessment'
    });
  }

  // Cost concentration risk
  const top5Services = services.slice(0, 5);
  const top5Cost = top5Services.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  const totalCost = reportData?.summary?.totalMonthlyCost || 1;
  const concentration = (top5Cost / totalCost * 100);
  if (concentration > 80) {
    risks.push({
      risk: 'High Cost Concentration',
      likelihood: 'Low',
      impact: 'Medium',
      description: `Top 5 services represent ${concentration.toFixed(1)}% of total cost`,
      mitigation: 'Diversify service usage, review cost optimization opportunities'
    });
  }

  return risks.slice(0, 10); // Top 10 risks
};

/**
 * Calculate migration readiness scorecard
 */
export const calculateReadinessScorecard = (readiness) => {
  const ready = readiness.ready?.count || 0;
  const conditional = readiness.conditional?.count || 0;
  const notReady = readiness.notReady?.count || 0;
  const unassigned = readiness.unassigned?.count || 0;
  const total = ready + conditional + notReady + unassigned;

  if (total === 0) return null;

  const readyPercentage = (ready / total * 100);
  const conditionalPercentage = (conditional / total * 100);
  const notReadyPercentage = (notReady / total * 100);

  let overallStatus = 'Not Ready';
  let statusColor = [200, 0, 0]; // Red
  if (readyPercentage >= 70) {
    overallStatus = 'Ready';
    statusColor = [40, 167, 69]; // Green
  } else if (readyPercentage >= 40) {
    overallStatus = 'Conditional';
    statusColor = [255, 193, 7]; // Yellow
  }

  return {
    overallStatus,
    statusColor,
    readyPercentage: readyPercentage.toFixed(1),
    conditionalPercentage: conditionalPercentage.toFixed(1),
    notReadyPercentage: notReadyPercentage.toFixed(1),
    readyCount: ready,
    conditionalCount: conditional,
    notReadyCount: notReady,
    total
  };
};

/**
 * Calculate GCP cost projections
 */
export const calculateGCPProjections = (costEstimates, awsTotalCost) => {
  if (!Array.isArray(costEstimates) || costEstimates.length === 0) {
    return null;
  }

  // CRITICAL: costEstimates array contains objects with costEstimate property
  // Structure: [{ service: 'EC2', costEstimate: { awsCost, gcpOnDemand, gcp1YearCUD, gcp3YearCUD }, ... }]
  let gcpMonthly = 0;
  let gcp3Year = 0;
  let gcp3YearCUD = 0;
  
  // Batch process to avoid memory issues with large arrays
  const BATCH_SIZE = 1000;
  for (let i = 0; i < costEstimates.length; i += BATCH_SIZE) {
    const batch = costEstimates.slice(i, Math.min(i + BATCH_SIZE, costEstimates.length));
    for (const est of batch) {
      const costs = est?.costEstimate || {};
      // Use monthly GCP costs (on-demand as baseline, 3-year CUD for projections)
      gcpMonthly += Math.max(0, costs.gcpOnDemand || 0);
      // Calculate 3-year totals (monthly * 36)
      gcp3Year += Math.max(0, (costs.gcpOnDemand || 0) * 36);
      gcp3YearCUD += Math.max(0, (costs.gcp3YearCUD || 0) * 36);
    }
  }

  const aws3Year = (awsTotalCost || 0) * 36; // 3 years = 36 months

  const monthlySavings = awsTotalCost - gcpMonthly;
  const threeYearSavings = aws3Year - gcp3YearCUD;
  const savingsPercentage = awsTotalCost > 0 ? (monthlySavings / awsTotalCost * 100) : 0;

  return {
    awsMonthly: awsTotalCost,
    gcpMonthly,
    monthlySavings,
    aws3Year,
    gcp3Year,
    gcp3YearCUD,
    threeYearSavings,
    savingsPercentage: savingsPercentage.toFixed(1)
  };
};

/**
 * Calculate prioritized action items
 */
export const calculatePrioritizedActions = (reportData, strategyResults, costEstimates) => {
  const actions = {
    high: [],
    medium: [],
    low: []
  };

  const readiness = reportData?.readiness || {};
  const complexity = reportData?.complexity || {};
  const readyCount = readiness.ready?.count || 0;
  const notReadyCount = readiness.notReady?.count || 0;
  const highComplexityCount = complexity.high?.count || 0;

  // High priority actions
  if (readyCount > 0) {
    actions.high.push({
      action: `Migrate ${readyCount.toLocaleString()} ready workloads`,
      owner: 'Migration Team',
      timeline: '1-3 months',
      kpi: `${readyCount.toLocaleString()} workloads migrated`
    });
  }

  if (notReadyCount > 0) {
    actions.high.push({
      action: `Address blockers for ${notReadyCount.toLocaleString()} not-ready workloads`,
      owner: 'Architecture Team',
      timeline: '2-4 months',
      kpi: `${notReadyCount.toLocaleString()} workloads made ready`
    });
  }

  // Medium priority actions
  if (highComplexityCount > 0) {
    actions.medium.push({
      action: `Conduct detailed assessment for ${highComplexityCount.toLocaleString()} high-complexity workloads`,
      owner: 'Assessment Team',
      timeline: '3-6 months',
      kpi: 'Assessment reports completed'
    });
  }

  // Low priority actions
  actions.low.push({
    action: 'Review and optimize cost allocation',
    owner: 'Finance Team',
    timeline: 'Ongoing',
    kpi: 'Cost reduction achieved'
  });

  return actions;
};

/**
 * Calculate quick wins
 */
export const calculateQuickWins = (reportData) => {
  const wins = [];
  const complexity = reportData?.complexity || {};
  const readiness = reportData?.readiness || {};
  const lowComplexityCount = complexity.low?.count || 0;
  const lowComplexityCost = complexity.low?.totalCost || 0;
  const readyCount = readiness.ready?.count || 0;

  if (lowComplexityCount > 0 && lowComplexityCost > 0) {
    wins.push({
      title: 'Low-Complexity Workloads',
      description: `${lowComplexityCount.toLocaleString()} workloads with low complexity`,
      impact: 'High',
      effort: 'Low',
      cost: lowComplexityCost,
      savings: (lowComplexityCost * 0.15).toFixed(2) // Assume 15% savings
    });
  }

  if (readyCount > 0) {
    wins.push({
      title: 'Ready-to-Migrate Workloads',
      description: `${readyCount.toLocaleString()} workloads ready for immediate migration`,
      impact: 'High',
      effort: 'Low',
      count: readyCount
    });
  }

  return wins;
};

/**
 * Calculate data quality indicators
 * MEMORY-EFFICIENT: Uses summary data instead of full workloads array
 */
export const calculateDataQuality = (reportData, workloads = []) => {
  // CRITICAL: Use summary data instead of workloads array to avoid memory issues
  const totalWorkloads = reportData?.summary?.totalWorkloads || 0;
  const unassignedComplexity = reportData?.complexity?.unassigned?.count || 0;
  const unassignedReadiness = reportData?.readiness?.unassigned?.count || 0;
  
  // Only use workloads array if it's small and provided
  const assessedCount = workloads.length > 0 && workloads.length < 10000
    ? workloads.filter(w => w.assessment).length
    : (totalWorkloads - Math.max(unassignedComplexity, unassignedReadiness));
  
  const completeness = totalWorkloads > 0 
    ? (assessedCount / totalWorkloads * 100)
    : 0;

  let confidenceLevel = 'High';
  if (completeness < 50) {
    confidenceLevel = 'Low';
  } else if (completeness < 80) {
    confidenceLevel = 'Medium';
  }

  return {
    completeness: completeness.toFixed(1),
    confidenceLevel,
    assessedWorkloads: totalWorkloads - Math.max(unassignedComplexity, unassignedReadiness),
    totalWorkloads,
    dataFreshness: 'Current' // Could be enhanced with timestamp
  };
};
