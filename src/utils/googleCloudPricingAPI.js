/**
 * Google Cloud Pricing API Integration
 * 
 * Uses the latest Google Cloud Pricing API:
 * - Cloud Billing API v1 (for actual costs)
 * - Cloud Pricing API (for price lists)
 * - Recommender API (for optimization recommendations)
 * 
 * Documentation:
 * - https://cloud.google.com/billing/docs/how-to/export-data-bigquery
 * - https://cloud.google.com/billing/docs/reference/rest
 * - https://cloud.google.com/recommender/docs/reference/rest
 */

import { getConfigManager } from './configManager.js';

const GCP_PRICING_CONFIG = {
  // Cloud Billing API
  billingApiEndpoint: 'https://cloudbilling.googleapis.com/v1',
  
  // Cloud Pricing API (via Cloud Billing)
  pricingApiEndpoint: 'https://cloudbilling.googleapis.com/v1',
  
  // Recommender API (for cost optimization)
  recommenderApiEndpoint: 'https://recommender.googleapis.com/v1',
  
  // Service Usage API (for service catalog)
  serviceUsageApiEndpoint: 'https://serviceusage.googleapis.com/v1',
  
  // Backend proxy endpoint
  backendEndpoint: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3002',
  
  // API Key or OAuth token (will be loaded from ConfigManager)
  apiKey: '',
  projectId: '',
  
  // Cache settings
  cacheTimeout: 3600000, // 1 hour
  useCache: true,
};

// In-memory cache
const pricingCache = new Map();

/**
 * Google Cloud Pricing API Client
 */
class GoogleCloudPricingAPI {
  constructor(config = {}) {
    this.configManager = getConfigManager();
    this.apiKey = config.apiKey || '';
    this.projectId = config.projectId || '';
    this.billingApiEndpoint = config.billingApiEndpoint || GCP_PRICING_CONFIG.billingApiEndpoint;
    this.pricingApiEndpoint = config.pricingApiEndpoint || GCP_PRICING_CONFIG.pricingApiEndpoint;
    this.recommenderApiEndpoint = config.recommenderApiEndpoint || GCP_PRICING_CONFIG.recommenderApiEndpoint;
    this._configPromise = null;
  }

  /**
   * Initialize configuration from Secret Manager or env vars
   * @private
   */
  async _initializeConfig() {
    if (this._configPromise) {
      return await this._configPromise;
    }

    this._configPromise = (async () => {
      if (!this.apiKey) {
        this.apiKey = await this.configManager.getGcpApiKey();
      }
      if (!this.projectId) {
        this.projectId = await this.configManager.getGcpProjectId();
      }
    })();

    return await this._configPromise;
  }

  /**
   * Get authentication headers
   * @private
   */
  _getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      return headers; // API key will be added as query parameter
    }
    
    // For OAuth, token should be in Authorization header
    // This would typically come from gcloud auth or service account
    return headers;
  }

  /**
   * Get Compute Engine pricing
   * @param {string} machineType - Machine type (e.g., 'n1-standard-1')
   * @param {string} region - Region (e.g., 'us-central1')
   * @param {string} usageType - Usage type ('OnDemand', 'Preemptible', 'Committed')
   * @returns {Promise<Object>} Pricing data
   */
  async getComputePricing(machineType, region = 'us-central1', usageType = 'OnDemand') {
    await this._initializeConfig();
    
    const cacheKey = `gcp-compute-${machineType}-${region}-${usageType}`;
    
    if (GCP_PRICING_CONFIG.useCache && pricingCache.has(cacheKey)) {
      const cached = pricingCache.get(cacheKey);
      if (Date.now() - cached.timestamp < GCP_PRICING_CONFIG.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Use Cloud Billing API to get SKU pricing
      // Note: This requires a backend proxy due to CORS and authentication
      const backendEndpoint = process.env.REACT_APP_GCP_PRICING_BACKEND || 
                              'http://localhost:3002/api/gcp/pricing';
      
      const response = await fetch(`${backendEndpoint}/compute`, {
        method: 'POST',
        headers: this._getAuthHeaders(),
        body: JSON.stringify({
          machineType,
          region,
          usageType,
          projectId: this.projectId,
        }),
      });

      if (!response.ok) {
        throw new Error(`GCP Pricing API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (GCP_PRICING_CONFIG.useCache) {
        pricingCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      // CRITICAL: Exclude Marketplace CUD offerings
      // Marketplace CUD offerings are not eligible for standard CUD discounts
      let committedUse1Year = data.committedUse1Year;
      let committedUse3Year = data.committedUse3Year;
      
      // Check if this is a Marketplace offering
      const isMarketplace = data.category === 'Marketplace' || 
                           data.skuCategory === 'Marketplace' ||
                           (data.skuDescription && data.skuDescription.toLowerCase().includes('marketplace')) ||
                           (data.committedUse1Year && typeof data.committedUse1Year === 'object' && 
                            (data.committedUse1Year.category?.toLowerCase().includes('marketplace') ||
                             data.committedUse1Year.skuCategory?.toLowerCase().includes('marketplace'))) ||
                           (data.committedUse3Year && typeof data.committedUse3Year === 'object' && 
                            (data.committedUse3Year.category?.toLowerCase().includes('marketplace') ||
                             data.committedUse3Year.skuCategory?.toLowerCase().includes('marketplace')));
      
      if (isMarketplace) {
        // Exclude Marketplace CUD offerings
        console.log(`[CUD Filter] Excluding Marketplace CUD offering for ${machineType} in ${region}`);
        committedUse1Year = null;
        committedUse3Year = null;
      }

      return {
        machineType,
        region,
        usageType,
        onDemand: data.onDemand || data.price,
        preemptible: data.preemptible,
        committedUse1Year,
        committedUse3Year,
        sustainedUseDiscount: data.sustainedUseDiscount,
        currency: data.currency || 'USD',
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        isMarketplace: isMarketplace || false, // Flag for debugging
      };
    } catch (error) {
      console.error('Error fetching GCP Compute pricing:', error);
      throw error;
    }
  }

  /**
   * Get Cloud Storage pricing
   * @param {string} storageClass - Storage class ('STANDARD', 'NEARLINE', 'COLDLINE', 'ARCHIVE')
   * @param {string} region - Region
   * @returns {Promise<Object>} Pricing data
   */
  async getStoragePricing(storageClass = 'STANDARD', region = 'us-central1') {
    const cacheKey = `gcp-storage-${storageClass}-${region}`;
    
    if (GCP_PRICING_CONFIG.useCache && pricingCache.has(cacheKey)) {
      const cached = pricingCache.get(cacheKey);
      if (Date.now() - cached.timestamp < GCP_PRICING_CONFIG.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const backendEndpoint = process.env.REACT_APP_GCP_PRICING_BACKEND || 
                              'http://localhost:3002/api/gcp/pricing';
      
      const response = await fetch(`${backendEndpoint}/storage`, {
        method: 'POST',
        headers: this._getAuthHeaders(),
        body: JSON.stringify({
          storageClass,
          region,
          projectId: this.projectId,
        }),
      });

      if (!response.ok) {
        throw new Error(`GCP Pricing API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (GCP_PRICING_CONFIG.useCache) {
        pricingCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      return {
        storageClass,
        region,
        pricePerGB: data.pricePerGB,
        pricePerGBMonth: data.pricePerGBMonth,
        operationsPrice: data.operationsPrice,
        retrievalPrice: data.retrievalPrice,
        currency: data.currency || 'USD',
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching GCP Storage pricing:', error);
      throw error;
    }
  }

  /**
   * Get Cloud SQL pricing
   * @param {string} instanceType - Instance type (e.g., 'db-n1-standard-1')
   * @param {string} databaseEngine - Database engine ('MYSQL', 'POSTGRES', 'SQLSERVER')
   * @param {string} region - Region
   * @returns {Promise<Object>} Pricing data
   */
  async getCloudSQLPricing(instanceType, databaseEngine = 'MYSQL', region = 'us-central1') {
    try {
      const backendEndpoint = process.env.REACT_APP_GCP_PRICING_BACKEND || 
                              'http://localhost:3002/api/gcp/pricing';
      
      const response = await fetch(`${backendEndpoint}/cloudsql`, {
        method: 'POST',
        headers: this._getAuthHeaders(),
        body: JSON.stringify({
          instanceType,
          databaseEngine,
          region,
          projectId: this.projectId,
        }),
      });

      if (!response.ok) {
        throw new Error(`GCP Pricing API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        instanceType,
        databaseEngine,
        region,
        onDemand: data.onDemand,
        reserved1Year: data.reserved1Year,
        reserved3Year: data.reserved3Year,
        storagePrice: data.storagePrice,
        backupPrice: data.backupPrice,
        currency: data.currency || 'USD',
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching Cloud SQL pricing:', error);
      throw error;
    }
  }

  /**
   * Get actual costs from Cloud Billing API
   * @param {string} billingAccountId - Billing account ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Cost data
   */
  async getActualCosts(billingAccountId, startDate, endDate) {
    try {
      const backendEndpoint = process.env.REACT_APP_GCP_BILLING_BACKEND || 
                              'http://localhost:3002/api/gcp/billing';
      
      const response = await fetch(`${backendEndpoint}/costs`, {
        method: 'POST',
        headers: this._getAuthHeaders(),
        body: JSON.stringify({
          billingAccountId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          projectId: this.projectId,
        }),
      });

      if (!response.ok) {
        throw new Error(`GCP Billing API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching GCP actual costs:', error);
      throw error;
    }
  }

  /**
   * Get cost optimization recommendations from Recommender API
   * @param {string} projectId - GCP Project ID
   * @param {string} recommenderType - Recommender type ('google.compute.instance.MachineTypeRecommender')
   * @returns {Promise<Array>} Recommendations
   */
  async getOptimizationRecommendations(projectId, recommenderType = 'google.compute.instance.MachineTypeRecommender') {
    try {
      const backendEndpoint = process.env.REACT_APP_GCP_RECOMMENDER_BACKEND || 
                              'http://localhost:3002/api/gcp/recommender';
      
      const response = await fetch(`${backendEndpoint}/recommendations`, {
        method: 'POST',
        headers: this._getAuthHeaders(),
        body: JSON.stringify({
          projectId,
          recommenderType,
        }),
      });

      if (!response.ok) {
        throw new Error(`GCP Recommender API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching optimization recommendations:', error);
      throw error;
    }
  }
}

/**
 * Check if GCP Pricing API is available
 */
export async function checkGCPPricingAvailability() {
  return {
    configured: !!GCP_PRICING_CONFIG.apiKey || !!GCP_PRICING_CONFIG.projectId,
    endpoints: {
      billing: GCP_PRICING_CONFIG.billingApiEndpoint,
      pricing: GCP_PRICING_CONFIG.pricingApiEndpoint,
      recommender: GCP_PRICING_CONFIG.recommenderApiEndpoint,
    },
    requiresBackend: true, // Due to CORS and authentication
  };
}

/**
 * Create GCP Pricing API client
 */
export function createGCPPricingClient(config = {}) {
  return new GoogleCloudPricingAPI(config);
}

export default GoogleCloudPricingAPI;
