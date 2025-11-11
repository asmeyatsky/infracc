/**
 * GCP Cost Estimator Service
 * 
 * Estimates GCP costs for migrated workloads:
 * - On-demand pricing
 * - 1-year Committed Use Discount (CUD) pricing
 * - 3-year CUD pricing
 * 
 * Uses real-time GCP Pricing API when available, falls back to mock data
 */

import CloudPricingAPI from '../../utils/cloudPricingAPI.js';
import { getAwsToGcpMapping } from '../../utils/serviceMapping.js';

/**
 * GCP Cost Estimator
 * Calculates GCP costs for AWS workloads
 */
export class GCPCostEstimator {
  /**
   * CUD discount rates
   */
  static CUD_DISCOUNTS = {
    COMPUTE_1_YEAR: 0.25,  // 25% discount for 1-year CUD on compute
    COMPUTE_3_YEAR: 0.45,  // 45% discount for 3-year CUD on compute
    STORAGE_1_YEAR: 0.15,  // 15% discount for 1-year CUD on storage
    STORAGE_3_YEAR: 0.30,  // 30% discount for 3-year CUD on storage
    DATABASE_1_YEAR: 0.20, // 20% discount for 1-year CUD on databases
    DATABASE_3_YEAR: 0.40  // 40% discount for 3-year CUD on databases
  };

  /**
   * Estimate GCP costs for a service aggregation
   * @param {Object} serviceData - Service aggregation data from ReportDataAggregator
   * @param {string} gcpService - Target GCP service name
   * @param {string} region - Target GCP region (default: 'us-central1')
   * @returns {Promise<Object>} Cost estimates
   */
  static async estimateServiceCosts(serviceData, gcpService, region = 'us-central1') {
    const awsCost = serviceData.totalCost;
    
    // Get base GCP pricing
    const gcpPricing = await this._getGCPPricing(gcpService, serviceData, region);
    
    // Calculate on-demand cost
    const onDemandCost = gcpPricing.onDemand || awsCost * 0.9; // Default: 10% cheaper than AWS
    
    // Calculate CUD costs based on service type
    const serviceType = this._getServiceType(gcpService);
    const cud1Year = this._applyCUDDiscount(onDemandCost, serviceType, 1);
    const cud3Year = this._applyCUDDiscount(onDemandCost, serviceType, 3);
    
    return {
      awsCost,
      gcpOnDemand: onDemandCost,
      gcp1YearCUD: cud1Year,
      gcp3YearCUD: cud3Year,
      savings1Year: awsCost - cud1Year,
      savings3Year: awsCost - cud3Year,
      savingsPercent1Year: ((awsCost - cud1Year) / awsCost) * 100,
      savingsPercent3Year: ((awsCost - cud3Year) / awsCost) * 100,
      region,
      gcpService
    };
  }

  /**
   * Estimate costs for all services
   * @param {Array} serviceAggregation - Result from ReportDataAggregator.aggregateByService
   * @param {string} targetRegion - Target GCP region
   * @returns {Promise<Array>} Cost estimates for each service
   */
  static async estimateAllServiceCosts(serviceAggregation, targetRegion = 'us-central1') {
    const estimates = await Promise.all(
      serviceAggregation.map(async (serviceData) => {
        const mapping = getAwsToGcpMapping(serviceData.service);
        const gcpService = mapping.gcpService;
        
        try {
          const costEstimate = await this.estimateServiceCosts(
            serviceData,
            gcpService,
            targetRegion
          );
          
          return {
            ...serviceData,
            costEstimate
          };
        } catch (error) {
          console.warn(`Failed to estimate costs for ${serviceData.service}:`, error);
          // Return fallback estimate
          return {
            ...serviceData,
            costEstimate: {
              awsCost: serviceData.totalCost,
              gcpOnDemand: serviceData.totalCost * 0.9,
              gcp1YearCUD: serviceData.totalCost * 0.675, // 25% discount
              gcp3YearCUD: serviceData.totalCost * 0.495, // 45% discount
              savings1Year: serviceData.totalCost * 0.225,
              savings3Year: serviceData.totalCost * 0.405,
              savingsPercent1Year: 22.5,
              savingsPercent3Year: 40.5,
              region: targetRegion,
              gcpService,
              error: error.message
            }
          };
        }
      })
    );
    
    return estimates;
  }

  /**
   * Get GCP pricing for a service
   * @private
   */
  static async _getGCPPricing(gcpService, serviceData, region) {
    try {
      // Map GCP service names to pricing API service types
      const serviceType = this._mapGCPServiceToPricingType(gcpService);
      
      if (serviceType) {
        // Try static method first, then instance method
        let pricing = null;
        if (typeof CloudPricingAPI.getGCPPrices === 'function') {
          pricing = await CloudPricingAPI.getGCPPrices(serviceType, region);
        } else if (CloudPricingAPI && typeof CloudPricingAPI.getGCPPrices === 'function') {
          pricing = await CloudPricingAPI.getGCPPrices(serviceType, region);
        }
        if (pricing && pricing.onDemand) {
          return pricing;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch GCP pricing from API:', error);
    }
    
    // Fallback: estimate based on AWS cost
    return {
      onDemand: serviceData.totalCost * 0.9, // Assume 10% cheaper
      sustainedUse: serviceData.totalCost * 0.75
    };
  }

  /**
   * Map GCP service name to pricing API service type
   * @private
   */
  static _mapGCPServiceToPricingType(gcpService) {
    const mapping = {
      'Compute Engine': 'computeEngine',
      'Google Kubernetes Engine (GKE)': 'computeEngine', // GKE uses Compute Engine pricing
      'Cloud Run': 'computeEngine',
      'Cloud Functions': 'computeEngine',
      'Cloud Storage': 'cloudStorage',
      'Cloud SQL': 'cloudSql',
      'BigQuery': 'bigquery',
      'Cloud Pub/Sub': 'pubsub',
      'Cloud Load Balancing': 'loadBalancing'
    };
    
    return mapping[gcpService] || null;
  }

  /**
   * Get service type for CUD discount calculation
   * @private
   */
  static _getServiceType(gcpService) {
    if (gcpService.includes('Compute') || gcpService.includes('GKE') || 
        gcpService.includes('Cloud Run') || gcpService.includes('Functions')) {
      return 'COMPUTE';
    }
    if (gcpService.includes('Storage')) {
      return 'STORAGE';
    }
    if (gcpService.includes('SQL') || gcpService.includes('Database')) {
      return 'DATABASE';
    }
    return 'COMPUTE'; // Default
  }

  /**
   * Apply CUD discount to cost
   * @private
   */
  static _applyCUDDiscount(baseCost, serviceType, years) {
    const discountKey = `${serviceType}_${years}_YEAR`;
    const discount = this.CUD_DISCOUNTS[discountKey] || this.CUD_DISCOUNTS.COMPUTE_1_YEAR;
    return baseCost * (1 - discount);
  }

  /**
   * Calculate total cost estimates across all services
   * @param {Array} costEstimates - Result from estimateAllServiceCosts
   * @returns {Object} Total cost summary
   */
  static calculateTotalCosts(costEstimates) {
    const totals = costEstimates.reduce((acc, estimate) => {
      const costs = estimate.costEstimate || {};
      acc.awsTotal += costs.awsCost || 0;
      acc.gcpOnDemandTotal += costs.gcpOnDemand || 0;
      acc.gcp1YearCUDTotal += costs.gcp1YearCUD || 0;
      acc.gcp3YearCUDTotal += costs.gcp3YearCUD || 0;
      return acc;
    }, {
      awsTotal: 0,
      gcpOnDemandTotal: 0,
      gcp1YearCUDTotal: 0,
      gcp3YearCUDTotal: 0
    });

    return {
      ...totals,
      savings1Year: totals.awsTotal - totals.gcp1YearCUDTotal,
      savings3Year: totals.awsTotal - totals.gcp3YearCUDTotal,
      savingsPercent1Year: totals.awsTotal > 0 
        ? ((totals.awsTotal - totals.gcp1YearCUDTotal) / totals.awsTotal) * 100 
        : 0,
      savingsPercent3Year: totals.awsTotal > 0
        ? ((totals.awsTotal - totals.gcp3YearCUDTotal) / totals.awsTotal) * 100
        : 0
    };
  }
}

export default GCPCostEstimator;
