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

    workloads.forEach(workload => {
      const workloadData = workload.toJSON ? workload.toJSON() : workload;
      const complexity = this._extractComplexity(workloadData);
      const cost = this._extractCost(workloadData);

      if (complexity === null || complexity === undefined) {
        result.unassigned.count++;
        result.unassigned.totalCost += cost;
        result.unassigned.workloads.push(workloadData);
      } else if (complexity >= ranges.low.min && complexity <= ranges.low.max) {
        result.low.count++;
        result.low.totalCost += cost;
        result.low.workloads.push(workloadData);
      } else if (complexity >= ranges.medium.min && complexity <= ranges.medium.max) {
        result.medium.count++;
        result.medium.totalCost += cost;
        result.medium.workloads.push(workloadData);
      } else if (complexity >= ranges.high.min && complexity <= ranges.high.max) {
        result.high.count++;
        result.high.totalCost += cost;
        result.high.workloads.push(workloadData);
      } else {
        result.unassigned.count++;
        result.unassigned.totalCost += cost;
        result.unassigned.workloads.push(workloadData);
      }
    });

    return result;
  }

  /**
   * Aggregate workloads by AWS service
   * @param {Array} workloads - Array of workload objects
   * @returns {Array} Aggregated data by service, sorted by cost (descending)
   */
  static aggregateByService(workloads) {
    const serviceMap = new Map();

    workloads.forEach(workload => {
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
          workloads: []
        });
      }

      const serviceData = serviceMap.get(service);
      serviceData.count++;
      serviceData.totalCost += cost;
      if (complexity !== null && complexity !== undefined) {
        serviceData.complexities.push(complexity);
      }
      serviceData.workloads.push(workloadData);
    });

    // Convert to array and calculate averages
    const result = Array.from(serviceMap.values()).map(serviceData => ({
      ...serviceData,
      averageComplexity: serviceData.complexities.length > 0
        ? serviceData.complexities.reduce((a, b) => a + b, 0) / serviceData.complexities.length
        : null,
      complexities: undefined // Remove raw array
    }));

    // Sort by total cost (descending)
    result.sort((a, b) => b.totalCost - a.totalCost);

    return result;
  }

  /**
   * Aggregate workloads by region
   * @param {Array} workloads - Array of workload objects
   * @returns {Array} Aggregated data by region, sorted by cost (descending)
   */
  static aggregateByRegion(workloads) {
    const regionMap = new Map();

    workloads.forEach(workload => {
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
          workloads: []
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

      regionData.workloads.push(workloadData);
    });

    // Convert to array and calculate averages
    const result = Array.from(regionMap.values()).map(regionData => {
      const servicesArray = Array.from(regionData.services.values())
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 3); // Top 3 services

      return {
        region: regionData.region,
        count: regionData.count,
        totalCost: regionData.totalCost,
        averageComplexity: regionData.complexities.length > 0
          ? regionData.complexities.reduce((a, b) => a + b, 0) / regionData.complexities.length
          : null,
        topServices: servicesArray.map(s => s.service),
        topServicesCosts: servicesArray.map(s => s.cost),
        complexities: undefined,
        services: undefined,
        workloads: undefined // Don't include full workload list in summary
      };
    });

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
      count: otherServices.reduce((sum, s) => sum + s.count, 0),
      totalCost: otherServices.reduce((sum, s) => sum + s.totalCost, 0),
      averageComplexity: otherServices.length > 0
        ? otherServices.reduce((sum, s) => sum + (s.averageComplexity || 0) * s.count, 0) /
          otherServices.reduce((sum, s) => sum + s.count, 0)
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
    const result = {
      ready: { count: 0, totalCost: 0 },
      conditional: { count: 0, totalCost: 0 },
      notReady: { count: 0, totalCost: 0 },
      unassigned: { count: 0, totalCost: 0 }
    };

    workloads.forEach(workload => {
      const workloadData = workload.toJSON ? workload.toJSON() : workload;
      const complexity = this._extractComplexity(workloadData);
      const cost = this._extractCost(workloadData);
      const riskFactors = workloadData.assessment?.riskFactors || [];

      let readiness = 'unassigned';
      if (complexity !== null && complexity !== undefined) {
        if (complexity <= 3 && riskFactors.length === 0) {
          readiness = 'ready';
        } else if (complexity <= 6 && riskFactors.length <= 2) {
          readiness = 'conditional';
        } else {
          readiness = 'notReady';
        }
      }

      result[readiness].count++;
      result[readiness].totalCost += cost;
    });

    return result;
  }

  /**
   * Extract complexity score from workload
   * @private
   */
  static _extractComplexity(workloadData) {
    if (workloadData.assessment?.complexityScore !== undefined) {
      return workloadData.assessment.complexityScore;
    }
    if (workloadData.complexityScore !== undefined) {
      return workloadData.complexityScore;
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
      // If it's a Money object (either Workload instance or deserialized Money object)
      if (typeof workloadData.monthlyCost === 'object' && typeof workloadData.monthlyCost.value === 'number') {
        return workloadData.monthlyCost.value;
      }
      // If it's a plain object with an 'amount' property (e.g., from toJSON)
      if (typeof workloadData.monthlyCost === 'object' && 'amount' in workloadData.monthlyCost) {
        return parseFloat(workloadData.monthlyCost.amount) || 0;
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
    
    workloads.forEach((w, idx) => {
      const workloadData = w.toJSON ? w.toJSON() : w;
      const cost = this._extractCost(workloadData);
      
      // Debug: Log first few costs and any issues
      if (idx < 5) {
        console.log(`Cost extraction sample ${idx}:`, {
          cost,
          monthlyCost: workloadData.monthlyCost,
          monthlyCostType: typeof workloadData.monthlyCost,
          hasToJSON: !!w.toJSON,
          workloadType: w.constructor?.name || typeof w
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
    });
    
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

    const complexities = workloads
      .map(w => {
        const workloadData = w.toJSON ? w.toJSON() : w;
        return this._extractComplexity(workloadData);
      })
      .filter(c => c !== null && c !== undefined);

    const averageComplexity = complexities.length > 0
      ? complexities.reduce((a, b) => a + b, 0) / complexities.length
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
  }
}

export default ReportDataAggregator;
