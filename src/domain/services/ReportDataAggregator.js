/**
 * Report Data Aggregator Service
 * 
 * Aggregates workloads for reporting purposes:
 * - By complexity ranges
 * - By AWS service
 * - By region
 * - Maps to GCP services
 */

import { getAwsToGcpMapping } from '../../utils/serviceMapping.js';

/**
 * Report Data Aggregator
 * Provides aggregated views of workloads for reporting
 */
export class ReportDataAggregator {
  /**
   * Aggregate workloads by complexity ranges
   * @param {Array} workloads - Array of workload objects (plain JSON or Workload instances)
   * @returns {Object} Aggregated data by complexity
   */
  static aggregateByComplexity(workloads) {
    // SAFETY: Memory guard - limit processing to prevent stack overflow
    const MAX_WORKLOADS = 1000000; // Hard limit of 1M workloads
    const safeWorkloads = workloads.length > MAX_WORKLOADS 
      ? workloads.slice(0, MAX_WORKLOADS) 
      : workloads;
    
    if (workloads.length > MAX_WORKLOADS) {
      console.warn(`[ReportDataAggregator] Limiting complexity aggregation to ${MAX_WORKLOADS} workloads (from ${workloads.length}) to prevent memory issues`);
    }

    const ranges = {
      low: { min: 1, max: 3, label: 'Low (1-3)' },
      medium: { min: 4, max: 6, label: 'Medium (4-6)' },
      high: { min: 7, max: 10, label: 'High (7-10)' }
    };

    const result = {
      low: { count: 0, totalCost: 0, workloads: [] },
      medium: { count: 0, totalCost: 0, workloads: [] },
      high: { count: 0, totalCost: 0, workloads: [] },
      unassigned: { count: 0, totalCost: 0, workloads: [] }
    };

    // FIX: Process in batches to avoid stack overflow with very large datasets (599K+ workloads)
    const BATCH_SIZE = 10000; // Process 10K workloads at a time
    const totalWorkloads = safeWorkloads.length;
    
    for (let i = 0; i < totalWorkloads; i += BATCH_SIZE) {
      const batch = safeWorkloads.slice(i, Math.min(i + BATCH_SIZE, totalWorkloads));
      
      for (const workload of batch) {
        const workloadData = workload.toJSON ? workload.toJSON() : workload;
        const complexity = this._extractComplexity(workloadData);
        const cost = this._extractCost(workloadData);

        if (complexity === null || complexity === undefined) {
          result.unassigned.count++;
          result.unassigned.totalCost += cost;
          // SAFETY: Limit workload storage to prevent memory issues
          if (result.unassigned.workloads.length < 1000) {
            result.unassigned.workloads.push(workloadData);
          }
        } else if (complexity >= ranges.low.min && complexity <= ranges.low.max) {
          result.low.count++;
          result.low.totalCost += cost;
          if (result.low.workloads.length < 1000) {
            result.low.workloads.push(workloadData);
          }
        } else if (complexity >= ranges.medium.min && complexity <= ranges.medium.max) {
          result.medium.count++;
          result.medium.totalCost += cost;
          if (result.medium.workloads.length < 1000) {
            result.medium.workloads.push(workloadData);
          }
        } else if (complexity >= ranges.high.min && complexity <= ranges.high.max) {
          result.high.count++;
          result.high.totalCost += cost;
          if (result.high.workloads.length < 1000) {
            result.high.workloads.push(workloadData);
          }
        } else {
          result.unassigned.count++;
          result.unassigned.totalCost += cost;
          if (result.unassigned.workloads.length < 1000) {
            result.unassigned.workloads.push(workloadData);
          }
        }
      }
      
      // Log progress for large datasets
      if (totalWorkloads > 50000 && (i + BATCH_SIZE) % 50000 === 0) {
        const percent = ((i + BATCH_SIZE) / totalWorkloads * 100).toFixed(1);
        console.log(`[ReportDataAggregator] Complexity aggregation: ${Math.min(i + BATCH_SIZE, totalWorkloads)}/${totalWorkloads} (${percent}%)`);
      }
    }

    return result;
  }

  /**
   * Aggregate workloads by AWS service
   * @param {Array} workloads - Array of workload objects
   * @returns {Array} Aggregated data by service, sorted by cost (descending)
   */
  static aggregateByService(workloads) {
    console.log(`[ReportDataAggregator.aggregateByService] ENTERING: ${workloads.length} workloads`);
    console.log(`[ReportDataAggregator.aggregateByService] Workloads is array: ${Array.isArray(workloads)}`);
    
    // SAFETY: Memory guard - limit processing to prevent stack overflow
    const MAX_WORKLOADS = 1000000; // Hard limit of 1M workloads
    const safeWorkloads = workloads.length > MAX_WORKLOADS 
      ? workloads.slice(0, MAX_WORKLOADS) 
      : workloads;
    
    if (workloads.length > MAX_WORKLOADS) {
      console.warn(`[ReportDataAggregator] Limiting service aggregation to ${MAX_WORKLOADS} workloads (from ${workloads.length}) to prevent memory issues`);
    }

    console.log(`[ReportDataAggregator.aggregateByService] Starting batch processing with ${safeWorkloads.length} workloads...`);
    const serviceMap = new Map();

    // FIX: Process in batches to avoid stack overflow with very large datasets (599K+ workloads)
    const BATCH_SIZE = 10000; // Process 10K workloads at a time
    const totalWorkloads = safeWorkloads.length;
    
    for (let i = 0; i < totalWorkloads; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, totalWorkloads);
      if (i % 50000 === 0 || i === 0) {
        console.log(`[ReportDataAggregator.aggregateByService] Processing batch ${i}-${batchEnd} of ${totalWorkloads}...`);
      }
      const batch = safeWorkloads.slice(i, batchEnd);
      
      console.log(`[ReportDataAggregator.aggregateByService] INSIDE BATCH LOOP: Processing ${batch.length} workloads in batch starting at index ${i}...`);
      for (const workload of batch) {
        const workloadData = workload.toJSON ? workload.toJSON() : workload;
        const service = workloadData.service || 'Unknown';
        const cost = this._extractCost(workloadData);
        const complexity = this._extractComplexity(workloadData);

        if (!serviceMap.has(service)) {
          const gcpMapping = getAwsToGcpMapping(service);
          serviceMap.set(service, {
            service,
            gcpService: gcpMapping.gcpService,
            gcpApi: gcpMapping.gcpApi,
            migrationStrategy: gcpMapping.migrationStrategy,
            effort: gcpMapping.effort,
            count: 0,
            totalCost: 0,
            complexities: [],
            workloads: [] // SAFETY: Limit workload storage
          });
        }

        const serviceData = serviceMap.get(service);
        serviceData.count++;
        serviceData.totalCost += cost;
        if (complexity !== null && complexity !== undefined) {
          serviceData.complexities.push(complexity);
        }
        // SAFETY: Limit workload storage to prevent memory issues (keep only first 100 per service)
        if (serviceData.workloads.length < 100) {
          serviceData.workloads.push(workloadData);
        }
      }
      console.log(`[ReportDataAggregator.aggregateByService] COMPLETED BATCH: ${i}-${batchEnd}, serviceMap now has ${serviceMap.size} services`);
      
      // Log progress for large datasets
      if (totalWorkloads > 50000 && (i + BATCH_SIZE) % 50000 === 0) {
        const percent = ((i + BATCH_SIZE) / totalWorkloads * 100).toFixed(1);
        console.log(`[ReportDataAggregator] Service aggregation: ${Math.min(i + BATCH_SIZE, totalWorkloads)}/${totalWorkloads} (${percent}%)`);
      }
    }
    console.log(`[ReportDataAggregator.aggregateByService] ALL BATCHES COMPLETE: Processed ${totalWorkloads} workloads, found ${serviceMap.size} unique services`);

    // Convert to array and calculate averages
    // SAFETY: Use loop instead of map to avoid any potential issues, and reduce for complexity calculation
    const result = [];
    for (const serviceData of serviceMap.values()) {
      let averageComplexity = null;
      if (serviceData.complexities && serviceData.complexities.length > 0) {
        // SAFETY: Use reduce safely with error handling
        try {
          const sum = serviceData.complexities.reduce((a, b) => {
            const numA = typeof a === 'number' ? a : 0;
            const numB = typeof b === 'number' ? (b || 0) : 0;
            return numA + numB;
          }, 0);
          averageComplexity = sum / serviceData.complexities.length;
        } catch (reduceError) {
          console.warn('[ReportDataAggregator] Error calculating average complexity:', reduceError);
          averageComplexity = null;
        }
      }
      result.push({
        service: serviceData.service,
        gcpService: serviceData.gcpService,
        gcpApi: serviceData.gcpApi,
        migrationStrategy: serviceData.migrationStrategy,
        effort: serviceData.effort,
        count: serviceData.count,
        totalCost: serviceData.totalCost,
        averageComplexity,
        workloads: serviceData.workloads // Limited to 100 per service
      });
    }

    // Sort by total cost (descending) - safe, result array should be small (number of unique services)
    console.log(`[ReportDataAggregator.aggregateByService] Sorting ${result.length} services...`);
    result.sort((a, b) => b.totalCost - a.totalCost);
    console.log(`[ReportDataAggregator.aggregateByService] COMPLETED: Returning ${result.length} services`);

    return result;
  }

  /**
   * Aggregate workloads by region
   * @param {Array} workloads - Array of workload objects
   * @returns {Array} Aggregated data by region, sorted by cost (descending)
   */
  static aggregateByRegion(workloads) {
    // SAFETY: Memory guard - limit processing to prevent stack overflow
    const MAX_WORKLOADS = 1000000; // Hard limit of 1M workloads
    const safeWorkloads = workloads.length > MAX_WORKLOADS 
      ? workloads.slice(0, MAX_WORKLOADS) 
      : workloads;
    
    if (workloads.length > MAX_WORKLOADS) {
      console.warn(`[ReportDataAggregator] Limiting region aggregation to ${MAX_WORKLOADS} workloads (from ${workloads.length}) to prevent memory issues`);
    }

    const regionMap = new Map();

    // FIX: Process in batches to avoid stack overflow with very large datasets (599K+ workloads)
    const BATCH_SIZE = 10000; // Process 10K workloads at a time
    const totalWorkloads = safeWorkloads.length;
    
    for (let i = 0; i < totalWorkloads; i += BATCH_SIZE) {
      const batch = safeWorkloads.slice(i, Math.min(i + BATCH_SIZE, totalWorkloads));
      
      for (const workload of batch) {
        const workloadData = workload.toJSON ? workload.toJSON() : workload;
        const region = workloadData.region || 'Unknown';
        const cost = this._extractCost(workloadData);
        const complexity = this._extractComplexity(workloadData);
        const service = workloadData.service || 'Unknown';

        if (!regionMap.has(region)) {
          regionMap.set(region, {
            region,
            count: 0,
            totalCost: 0,
            complexities: [],
            services: new Map(),
            workloads: [] // SAFETY: Limit workload storage
          });
        }

        const regionData = regionMap.get(region);
        regionData.count++;
        regionData.totalCost += cost;
        if (complexity !== null && complexity !== undefined) {
          regionData.complexities.push(complexity);
        }

        // Track services in this region
        if (!regionData.services.has(service)) {
          regionData.services.set(service, { service, count: 0, cost: 0 });
        }
        const serviceData = regionData.services.get(service);
        serviceData.count++;
        serviceData.cost += cost;

        // SAFETY: Limit workload storage to prevent memory issues (keep only first 100 per region)
        if (regionData.workloads.length < 100) {
          regionData.workloads.push(workloadData);
        }
      }
      
      // Log progress for large datasets
      if (totalWorkloads > 50000 && (i + BATCH_SIZE) % 50000 === 0) {
        const percent = ((i + BATCH_SIZE) / totalWorkloads * 100).toFixed(1);
        console.log(`[ReportDataAggregator] Region aggregation: ${Math.min(i + BATCH_SIZE, totalWorkloads)}/${totalWorkloads} (${percent}%)`);
      }
    }

    // Convert to array and calculate averages
    // SAFETY: regionMap should be small (number of unique regions), so map is safe
    const result = [];
    for (const regionData of regionMap.values()) {
      const servicesArray = Array.from(regionData.services.values())
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 3); // Top 3 services

      // SAFETY: Use loops instead of map for small arrays
      const topServices = [];
      const topServicesCosts = [];
      for (const s of servicesArray) {
        topServices.push(s.service);
        topServicesCosts.push(s.cost);
      }

      let averageComplexity = null;
      if (regionData.complexities && regionData.complexities.length > 0) {
        // SAFETY: Use reduce safely with error handling
        try {
          const sum = regionData.complexities.reduce((a, b) => {
            const numA = typeof a === 'number' ? a : 0;
            const numB = typeof b === 'number' ? (b || 0) : 0;
            return numA + numB;
          }, 0);
          averageComplexity = sum / regionData.complexities.length;
        } catch (reduceError) {
          console.warn('[ReportDataAggregator] Error calculating average complexity for region:', reduceError);
          averageComplexity = null;
        }
      }

      result.push({
        region: regionData.region,
        count: regionData.count,
        totalCost: regionData.totalCost,
        averageComplexity,
        topServices,
        topServicesCosts,
        complexities: undefined,
        services: undefined,
        workloads: undefined // Don't include full workload list in summary
      });
    }

    // Sort by total cost (descending)
    result.sort((a, b) => b.totalCost - a.totalCost);

    return result;
  }

  /**
   * Get top N services with "Other" category
   * @param {Array} serviceAggregation - Result from aggregateByService
   * @param {number} topN - Number of top services to show (default: 15)
   * @returns {Object} { topServices: [...], other: {...} }
   */
  static getTopServicesWithOther(serviceAggregation, topN = 15) {
    const topServices = serviceAggregation.slice(0, topN);
    const otherServices = serviceAggregation.slice(topN);

    const other = {
      service: 'Other',
      gcpService: 'Multiple GCP Services',
      gcpApi: null,
      migrationStrategy: 'Mixed',
      effort: 'Medium',
      // SAFETY: Batch reduce to avoid stack overflow with large otherServices arrays
      count: (() => {
        let sum = 0;
        for (const s of otherServices) {
          sum += s.count || 0;
        }
        return sum;
      })(),
      totalCost: (() => {
        let sum = 0;
        for (const s of otherServices) {
          sum += s.totalCost || 0;
        }
        return sum;
      })(),
      averageComplexity: otherServices.length > 0
        ? (() => {
            let complexitySum = 0;
            let countSum = 0;
            for (const s of otherServices) {
              complexitySum += (s.averageComplexity || 0) * (s.count || 0);
              countSum += s.count || 0;
            }
            return countSum > 0 ? complexitySum / countSum : null;
          })()
        : null
    };

    return {
      topServices,
      other: other.count > 0 ? other : null
    };
  }

  /**
   * Aggregate by migration readiness
   * @param {Array} workloads - Array of workload objects
   * @returns {Object} Aggregated data by readiness
   */
  static aggregateByReadiness(workloads) {
    // SAFETY: Memory guard - limit processing to prevent stack overflow
    const MAX_WORKLOADS = 1000000; // Hard limit of 1M workloads
    const safeWorkloads = workloads.length > MAX_WORKLOADS 
      ? workloads.slice(0, MAX_WORKLOADS) 
      : workloads;
    
    if (workloads.length > MAX_WORKLOADS) {
      console.warn(`[ReportDataAggregator] Limiting readiness aggregation to ${MAX_WORKLOADS} workloads (from ${workloads.length}) to prevent memory issues`);
    }

    const result = {
      ready: { count: 0, totalCost: 0 },
      conditional: { count: 0, totalCost: 0 },
      notReady: { count: 0, totalCost: 0 },
      unassigned: { count: 0, totalCost: 0 }
    };

    // FIX: Process in batches to avoid stack overflow with very large datasets (599K+ workloads)
    const BATCH_SIZE = 10000; // Process 10K workloads at a time
    const totalWorkloads = safeWorkloads.length;
    
    for (let i = 0; i < totalWorkloads; i += BATCH_SIZE) {
      const batch = safeWorkloads.slice(i, Math.min(i + BATCH_SIZE, totalWorkloads));
      
      for (const workload of batch) {
        const workloadData = workload.toJSON ? workload.toJSON() : workload;
        const cost = this._extractCost(workloadData);
        
        // Use the proper readiness extraction method
        const readinessScore = this._extractReadiness(workloadData);
        
        let readiness = 'unassigned';
        if (readinessScore !== null && readinessScore !== undefined) {
          // Use readiness score thresholds (matching Assessment.getReadinessScore logic)
          if (readinessScore >= 70) {
            readiness = 'ready';
          } else if (readinessScore >= 40) {
            readiness = 'conditional';
          } else {
            readiness = 'notReady';
          }
        } else {
          // Fallback: calculate from complexity if readiness not available
          const complexity = this._extractComplexity(workloadData);
          if (complexity !== null && complexity !== undefined) {
            const riskFactors = workloadData.assessment?.riskFactors || 
                              workloadData.assessment?.infrastructureAssessment?.riskFactors || 
                              [];
            const riskCount = Array.isArray(riskFactors) ? riskFactors.length : 0;
            
            if (complexity <= 3 && riskCount === 0) {
              readiness = 'ready';
            } else if (complexity <= 6 && riskCount <= 2) {
              readiness = 'conditional';
            } else {
              readiness = 'notReady';
            }
          }
        }

        result[readiness].count++;
        result[readiness].totalCost += cost;
      }
      
      // Log progress for large datasets
      if (totalWorkloads > 50000 && (i + BATCH_SIZE) % 50000 === 0) {
        const percent = ((i + BATCH_SIZE) / totalWorkloads * 100).toFixed(1);
        console.log(`[ReportDataAggregator] Readiness aggregation: ${Math.min(i + BATCH_SIZE, totalWorkloads)}/${totalWorkloads} (${percent}%)`);
      }
    }

    return result;
  }

  /**
   * Extract complexity score from workload
   * @private
   */
  static _extractComplexity(workloadData) {
    // Try multiple locations for complexity score
    // 1. assessment.complexityScore (most common)
    if (workloadData.assessment?.complexityScore !== undefined && workloadData.assessment.complexityScore !== null) {
      return parseFloat(workloadData.assessment.complexityScore);
    }
    
    // 2. Direct complexityScore on workload
    if (workloadData.complexityScore !== undefined && workloadData.complexityScore !== null) {
      return parseFloat(workloadData.complexityScore);
    }
    
    // 3. assessment.infrastructureAssessment.complexityScore
    if (workloadData.assessment?.infrastructureAssessment?.complexityScore !== undefined && 
        workloadData.assessment.infrastructureAssessment.complexityScore !== null) {
      return parseFloat(workloadData.assessment.infrastructureAssessment.complexityScore);
    }
    
    // 4. If assessment is an Assessment entity, try getter
    if (workloadData.assessment && typeof workloadData.assessment.complexityScore === 'number') {
      return workloadData.assessment.complexityScore;
    }
    
    // 5. Try toJSON if it's an entity
    if (workloadData.assessment && typeof workloadData.assessment.toJSON === 'function') {
      const assessmentJson = workloadData.assessment.toJSON();
      if (assessmentJson.complexityScore !== undefined && assessmentJson.complexityScore !== null) {
        return parseFloat(assessmentJson.complexityScore);
      }
    }
    
    return null;
  }
  
  /**
   * Extract readiness score from workload
   * @private
   */
  static _extractReadiness(workloadData) {
    // Try multiple locations for readiness score
    // 1. assessment.readinessScore (calculated)
    if (workloadData.assessment?.readinessScore !== undefined && workloadData.assessment.readinessScore !== null) {
      return parseFloat(workloadData.assessment.readinessScore);
    }
    
    // 2. If assessment is an Assessment entity, use getReadinessScore method
    if (workloadData.assessment && typeof workloadData.assessment.getReadinessScore === 'function') {
      return workloadData.assessment.getReadinessScore();
    }
    
    // 3. Calculate from complexity and risk factors if available
    const complexity = this._extractComplexity(workloadData);
    if (complexity !== null && complexity !== undefined) {
      const riskFactors = workloadData.assessment?.riskFactors || 
                         workloadData.assessment?.infrastructureAssessment?.riskFactors || 
                         [];
      const riskCount = Array.isArray(riskFactors) ? riskFactors.length : 0;
      
      // Use same formula as Assessment.getReadinessScore()
      let score = 100;
      score -= (complexity - 1) * 5; // Deduct for complexity (0-45 points)
      score -= riskCount * 10; // Deduct for risk factors (0-50 points)
      
      // Bonus for comprehensive assessment
      if (workloadData.assessment?.infrastructureAssessment && workloadData.assessment?.applicationAssessment) {
        score += 10;
      }
      
      return Math.max(0, Math.min(100, Math.round(score)));
    }
    
    return null;
  }

  /**
   * Extract cost from workload
   * Handles both Money objects and plain numbers
   * @private
   */
  static _extractCost(workloadData) {
    if (workloadData.monthlyCost !== undefined && workloadData.monthlyCost !== null) {
      // If it's a Money object instance (has amount getter)
      if (workloadData.monthlyCost instanceof Object && typeof workloadData.monthlyCost.amount === 'number') {
        return workloadData.monthlyCost.amount;
      }
      // If it's a Money object (either Workload instance or deserialized Money object) with value property
      if (typeof workloadData.monthlyCost === 'object' && typeof workloadData.monthlyCost.value === 'number') {
        return workloadData.monthlyCost.value;
      }
      // If it's a plain object with an 'amount' property (e.g., from toJSON)
      if (typeof workloadData.monthlyCost === 'object' && 'amount' in workloadData.monthlyCost) {
        return parseFloat(workloadData.monthlyCost.amount) || 0;
      }
      // If it's a Money object with _amount (internal property)
      if (typeof workloadData.monthlyCost === 'object' && '_amount' in workloadData.monthlyCost) {
        return parseFloat(workloadData.monthlyCost._amount) || 0;
      }
      // Handle plain number
      const numValue = parseFloat(workloadData.monthlyCost);
      return isNaN(numValue) ? 0 : numValue;
    }
    return 0;
  }

  /**
   * Generate comprehensive report summary
   * @param {Array} workloads - Array of workload objects
   * @returns {Object} Complete report summary
   */
  static generateReportSummary(workloads) {
    // SAFETY: Wrap aggregation in try-catch to handle any stack overflow errors
    try {
      const complexityAgg = this.aggregateByComplexity(workloads);
      const serviceAgg = this.aggregateByService(workloads);
      const regionAgg = this.aggregateByRegion(workloads);
      const readinessAgg = this.aggregateByReadiness(workloads);
    
    // Return ALL services, not just top N - all services must be mapped and included in TCO
    const allServicesData = {
      topServices: serviceAgg, // All services (keeping name for backward compatibility)
      other: null // No "other" category - all services are shown
    };

    const totalWorkloads = workloads.length;
    let totalCost = 0;
    let costExtractionIssues = 0;
    
    // FIX: Process workloads in batches to avoid stack overflow with very large datasets (599K+ workloads)
    // Processing all 599K workloads at once with forEach can exceed call stack
    const BATCH_SIZE = 10000; // Process 10K workloads at a time
    let processedCount = 0;
    
    for (let i = 0; i < workloads.length; i += BATCH_SIZE) {
      const batch = workloads.slice(i, Math.min(i + BATCH_SIZE, workloads.length));
      
      for (let idx = 0; idx < batch.length; idx++) {
        const w = batch[idx];
        const globalIdx = i + idx;
        const workloadData = w.toJSON ? w.toJSON() : w;
        const cost = this._extractCost(workloadData);
        
        // Debug: Log first few costs and any issues
        if (globalIdx < 5) {
          const monthlyCostRaw = workloadData.monthlyCost;
          let monthlyCostDetails = {};
          if (monthlyCostRaw !== undefined && monthlyCostRaw !== null) {
            if (typeof monthlyCostRaw === 'object') {
              monthlyCostDetails = {
                hasAmount: 'amount' in monthlyCostRaw,
                hasValue: 'value' in monthlyCostRaw,
                hasAmountProp: '_amount' in monthlyCostRaw,
                amountValue: monthlyCostRaw.amount,
                valueValue: monthlyCostRaw.value,
                amountPropValue: monthlyCostRaw._amount,
                keys: Object.keys(monthlyCostRaw)
              };
            }
          }
          console.log(`Cost extraction sample ${globalIdx}:`, {
            extractedCost: cost,
            monthlyCostRaw: monthlyCostRaw,
            monthlyCostType: typeof monthlyCostRaw,
            monthlyCostDetails,
            hasToJSON: !!w.toJSON,
            workloadType: w.constructor?.name || typeof w,
            workloadId: workloadData.id
          });
        }
        
        // Track if cost seems incorrect (very small compared to expected)
        if (cost > 0 && cost < 1 && workloads.length > 1000) {
          costExtractionIssues++;
          if (costExtractionIssues <= 5) {
            console.warn('Very small cost detected:', { 
              cost, 
              monthlyCost: workloadData.monthlyCost,
              monthlyCostType: typeof workloadData.monthlyCost,
              hasToJSON: !!w.toJSON,
              workloadType: w.constructor?.name || typeof w
            });
          }
        }
        
        totalCost += cost;
        processedCount++;
      }
      
      // Log progress for large datasets
      if (workloads.length > 50000 && (i + BATCH_SIZE) % 50000 === 0) {
        const percent = ((i + BATCH_SIZE) / workloads.length * 100).toFixed(1);
        console.log(`[ReportDataAggregator] Processing costs: ${Math.min(i + BATCH_SIZE, workloads.length)}/${workloads.length} (${percent}%)`);
      }
    }
    
    // CRITICAL FIX: Ensure totalCost is never negative (handle credits/refunds)
    if (totalCost < 0) {
      console.warn(`⚠️ WARNING: Calculated totalCost is negative (${totalCost.toFixed(2)}). This might indicate credits/refunds or cost extraction issues.`);
      console.warn(`This suggests workloads may have negative costs (credits) or cost extraction is failing.`);
    }
    
    if (costExtractionIssues > 0) {
      console.warn(`Cost extraction: Found ${costExtractionIssues} workloads with very small costs (< $1)`);
    }
    
    console.log(`ReportDataAggregator: Calculated totalMonthlyCost = $${totalCost.toFixed(2)} from ${totalWorkloads} workloads`);
    console.log(`ReportDataAggregator: Found ${serviceAgg.length} unique AWS services (all will be mapped and included in TCO)`);
    
    // CRITICAL DEBUG: Check if costs are actually present
    if (totalCost === 0 && totalWorkloads > 0) {
      console.error('⚠️ WARNING: Total cost is $0.00 but there are workloads!');
      console.error('⚠️ This indicates costs are not being extracted from workloads.');
      
      // Sample a few workloads to see their cost structure
      const sampleWorkloads = workloads.slice(0, 5);
      console.error('⚠️ Sample workloads cost structure:');
      sampleWorkloads.forEach((w, idx) => {
        const workloadData = w.toJSON ? w.toJSON() : w;
        console.error(`  Workload ${idx}:`, {
          id: workloadData.id,
          monthlyCost: workloadData.monthlyCost,
          monthlyCostType: typeof workloadData.monthlyCost,
          extractedCost: this._extractCost(workloadData),
          hasToJSON: !!w.toJSON,
          rawWorkload: w
        });
      });
    } else if (totalCost > 0) {
      console.log(`✓ Costs are present: Total = $${totalCost.toFixed(2)}`);
    }

    // FIX: Process complexities in batches to avoid stack overflow with large datasets
    const complexities = [];
    const COMPLEXITY_BATCH_SIZE = 10000;
    for (let i = 0; i < workloads.length; i += COMPLEXITY_BATCH_SIZE) {
      const batch = workloads.slice(i, Math.min(i + COMPLEXITY_BATCH_SIZE, workloads.length));
      const batchComplexities = batch
        .map(w => {
          const workloadData = w.toJSON ? w.toJSON() : w;
          return this._extractComplexity(workloadData);
        })
        .filter(c => c !== null && c !== undefined);
      // Use loop instead of spread operator for extra safety
      for (const complexity of batchComplexities) {
        complexities.push(complexity);
      }
    }

    const averageComplexity = complexities.length > 0
      ? (() => {
          try {
            const sum = complexities.reduce((a, b) => {
              const numA = typeof a === 'number' ? a : 0;
              const numB = typeof b === 'number' ? (b || 0) : 0;
              return numA + numB;
            }, 0);
            return sum / complexities.length;
          } catch (reduceError) {
            console.warn('[ReportDataAggregator] Error calculating average complexity:', reduceError);
            return null;
          }
        })()
      : null;

      return {
        summary: {
          totalWorkloads,
          totalMonthlyCost: totalCost,
          averageComplexity,
          totalRegions: regionAgg.length,
          totalServices: serviceAgg.length
        },
        complexity: complexityAgg,
        readiness: readinessAgg,
        services: allServicesData, // All services (not limited to top N)
        regions: regionAgg,
        allServices: serviceAgg // Keep full list for detailed analysis (same as services.topServices now)
      };
    } catch (error) {
      // SAFETY: Catch stack overflow errors and provide helpful message
      if (error instanceof RangeError && (error.message.includes('Maximum call stack size exceeded') || error.message.includes('stack'))) {
        console.error('[ReportDataAggregator] Stack overflow in generateReportSummary:', error);
        throw new Error(
          `Report summary generation failed due to stack overflow with ${workloads.length} workloads. ` +
          `This operation needs to be batched. Please check the code for unbatched array operations.`
        );
      }
      throw error;
    }
  }
}

export default ReportDataAggregator;
