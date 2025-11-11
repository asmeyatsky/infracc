/**
 * Cloud Pricing Port (Interface)
 * 
 * Architectural Intent:
 * - Defines contract for cloud pricing data retrieval
 * - Infrastructure layer implements this (AWS Pricing API, Azure Pricing, GCP Pricing)
 * - Keeps domain layer independent of pricing API details
 */

/**
 * Pricing Request
 */
export class PricingRequest {
  /**
   * @param {Object} params
   * @param {string} params.provider - Cloud provider ('aws', 'azure', 'gcp')
   * @param {string} params.serviceType - Service type (e.g., 'compute', 'storage')
   * @param {string} params.region - Region identifier
   * @param {Object} params.configuration - Service-specific configuration
   */
  constructor(params) {
    this.provider = params.provider;
    this.serviceType = params.serviceType;
    this.region = params.region;
    this.configuration = params.configuration || {};
  }
}

/**
 * Pricing Response
 */
export class PricingResponse {
  /**
   * @param {Object} params
   * @param {number} params.onDemandPrice - On-demand pricing
   * @param {number} params.reservedPrice - Reserved instance pricing (optional)
   * @param {number} params.sustainedUsePrice - Sustained use pricing (GCP, optional)
   * @param {string} params.currency - Currency code
   * @param {string} params.unit - Pricing unit (e.g., 'per-hour', 'per-GB-month')
   */
  constructor(params) {
    this.onDemandPrice = params.onDemandPrice || 0;
    this.reservedPrice = params.reservedPrice || null;
    this.sustainedUsePrice = params.sustainedUsePrice || null;
    this.currency = params.currency || 'USD';
    this.unit = params.unit || 'per-hour';
  }
}

/**
 * Pricing Port Interface
 * 
 * All pricing data retrieval goes through this interface
 */
export class PricingPort {
  /**
   * Get pricing for a service
   * @param {PricingRequest} request - Pricing request
   * @returns {Promise<PricingResponse>} Pricing data
   * @abstract
   */
  async getPricing(request) {
    throw new Error('PricingPort.getPricing must be implemented');
  }

  /**
   * Get bulk pricing for multiple services
   * @param {PricingRequest[]} requests - Array of pricing requests
   * @returns {Promise<PricingResponse[]>} Array of pricing responses
   * @abstract
   */
  async getBulkPricing(requests) {
    throw new Error('PricingPort.getBulkPricing must be implemented');
  }

  /**
   * Check if pricing service is available
   * @returns {Promise<boolean>} True if available
   * @abstract
   */
  async isAvailable() {
    throw new Error('PricingPort.isAvailable must be implemented');
  }
}

export default PricingPort;
