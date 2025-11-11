/**
 * Service Mapping Port (Interface)
 * 
 * Architectural Intent:
 * - Defines contract for service mapping operations
 * - Infrastructure layer provides implementations (from CodeMod or static mappings)
 * - Keeps domain layer independent of mapping source
 */

import { CloudProvider, CloudProviderType } from '../value_objects/CloudProvider.js';
import { ServiceMapping } from '../entities/ServiceMapping.js';

/**
 * Service Mapping Port Interface
 * 
 * All service mapping operations go through this interface
 */
export class ServiceMappingPort {
  /**
   * Get service mapping for source service
   * @param {string} sourceService - Source cloud service name
   * @param {CloudProvider} sourceProvider - Source cloud provider
   * @returns {Promise<ServiceMapping>} Service mapping
   * @abstract
   */
  async getMapping(sourceService, sourceProvider) {
    throw new Error('ServiceMappingPort.getMapping must be implemented');
  }

  /**
   * Get all mappings for a provider
   * @param {CloudProvider} sourceProvider - Source cloud provider
   * @returns {Promise<ServiceMapping[]>} Array of service mappings
   * @abstract
   */
  async getAllMappings(sourceProvider) {
    throw new Error('ServiceMappingPort.getAllMappings must be implemented');
  }

  /**
   * Search for service mappings by keyword
   * @param {string} keyword - Search keyword
   * @param {CloudProvider} sourceProvider - Source cloud provider
   * @returns {Promise<ServiceMapping[]>} Array of matching mappings
   * @abstract
   */
  async searchMappings(keyword, sourceProvider) {
    throw new Error('ServiceMappingPort.searchMappings must be implemented');
  }

  /**
   * Check if mapping exists for service
   * @param {string} sourceService - Source cloud service name
   * @param {CloudProvider} sourceProvider - Source cloud provider
   * @returns {Promise<boolean>} True if mapping exists
   * @abstract
   */
  async hasMapping(sourceService, sourceProvider) {
    throw new Error('ServiceMappingPort.hasMapping must be implemented');
  }
}

export default ServiceMappingPort;
