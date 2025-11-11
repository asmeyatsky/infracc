/**
 * Service Mapping Repository
 * 
 * Architectural Intent:
 * - Infrastructure layer implementation of ServiceMappingPort
 * - Uses static service mapping data (can be enhanced with CodeMod)
 * - Provides fast, in-memory service mappings
 * - Isolated from domain layer
 */

import { ServiceMappingPort } from '../../domain/ports/ServiceMappingPort.js';
import { ServiceMapping } from '../../domain/entities/ServiceMapping.js';
import { CloudProvider, CloudProviderType } from '../../domain/value_objects/CloudProvider.js';
import { awsToGcpMapping, azureToGcpMapping } from '../../utils/serviceMapping.js';
import GoogleCloudDocsAdapter from '../adapters/GoogleCloudDocsAdapter.js';

/**
 * Service Mapping Repository
 * 
 * Implementation Notes:
 * - Uses static mapping data from utils/serviceMapping.js
 * - Can be enhanced with CodeMod integration
 * - Provides fast lookups with caching
 */
export class ServiceMappingRepository extends ServiceMappingPort {
  constructor(config = {}) {
    super();
    this.useOfficialDocs = config.useOfficialDocs !== false; // Default to true
    this.googleCloudDocsAdapter = new GoogleCloudDocsAdapter();
    this._awsMappings = this._buildMappings(awsToGcpMapping, CloudProviderType.AWS);
    this._azureMappings = this._buildMappings(azureToGcpMapping, CloudProviderType.AZURE);
  }

  /**
   * Build ServiceMapping entities from static data
   * @private
   */
  _buildMappings(mappingData, providerType) {
    const mappings = new Map();
    
    for (const [sourceService, mappingInfo] of Object.entries(mappingData)) {
      try {
        // Normalize migration strategy to lowercase (enum expects lowercase)
        const strategy = (mappingInfo.migrationStrategy || 'rehost').toLowerCase();
        
        // Normalize effort to lowercase
        const effort = (mappingInfo.effort || 'medium').toLowerCase();
        
        const serviceMapping = new ServiceMapping({
          sourceService,
          sourceProvider: providerType,
          gcpService: mappingInfo.gcpService,
          gcpApi: mappingInfo.gcpApi || '',
          migrationStrategy: strategy,
          effort: effort,
          notes: mappingInfo.notes || '',
          considerations: mappingInfo.considerations || []
        });
        
        mappings.set(sourceService.toUpperCase(), serviceMapping);
      } catch (error) {
        console.warn(`Failed to create mapping for ${sourceService}:`, error);
      }
    }
    
    return mappings;
  }

  /**
   * Get service mapping for source service
   * Enhanced with official Google Cloud documentation
   * @param {string} sourceService 
   * @param {CloudProvider} sourceProvider 
   * @returns {Promise<ServiceMapping>}
   */
  async getMapping(sourceService, sourceProvider) {
    if (!(sourceProvider instanceof CloudProvider)) {
      sourceProvider = new CloudProvider(sourceProvider);
    }

    // First, try to get official mapping from Google Cloud docs
    if (this.useOfficialDocs) {
      try {
        const officialMapping = await this.googleCloudDocsAdapter.getOfficialMapping(
          sourceProvider.type,
          sourceService
        );

        if (officialMapping) {
          // Enhance with official documentation data
          // Normalize migration strategy to lowercase (enum expects lowercase)
          const strategy = (officialMapping.migrationStrategy || 'rehost').toLowerCase();
          const effort = (officialMapping.effort || 'medium').toLowerCase();
          
          return new ServiceMapping({
            sourceService,
            sourceProvider: sourceProvider.type,
            gcpService: officialMapping.gcpService,
            gcpApi: officialMapping.gcpApi || '',
            migrationStrategy: strategy,
            effort: effort,
            notes: officialMapping.notes || '',
            considerations: officialMapping.considerations || []
          });
        }
        // Fall through to static mappings if official mapping not found
      } catch (error) {
        console.warn('Error getting official mapping, falling back to static:', error);
        // Fall through to static mappings
      }
    }

    // Fall back to static mappings
    const mappings = sourceProvider.type === CloudProviderType.AWS 
      ? this._awsMappings 
      : this._azureMappings;

    const serviceKey = sourceService.toUpperCase();
    const mapping = mappings.get(serviceKey);

    if (!mapping) {
      throw new Error(`No mapping found for service: ${sourceService} (${sourceProvider.type})`);
    }

    return mapping;
  }

  /**
   * Get all mappings for a provider
   * @param {CloudProvider} sourceProvider 
   * @returns {Promise<ServiceMapping[]>}
   */
  async getAllMappings(sourceProvider) {
    if (!(sourceProvider instanceof CloudProvider)) {
      sourceProvider = new CloudProvider(sourceProvider);
    }

    const mappings = sourceProvider.type === CloudProviderType.AWS 
      ? this._awsMappings 
      : this._azureMappings;

    return Array.from(mappings.values());
  }

  /**
   * Search for service mappings by keyword
   * Enhanced with official Google Cloud documentation
   * @param {string} keyword 
   * @param {CloudProvider} sourceProvider 
   * @returns {Promise<ServiceMapping[]>}
   */
  async searchMappings(keyword, sourceProvider) {
    if (!(sourceProvider instanceof CloudProvider)) {
      sourceProvider = new CloudProvider(sourceProvider);
    }

    const results = [];

    // Search in static mappings
    const mappings = sourceProvider.type === CloudProviderType.AWS 
      ? this._awsMappings 
      : this._azureMappings;

    const keywordUpper = keyword.toUpperCase();

    for (const mapping of mappings.values()) {
      if (mapping.sourceService.toUpperCase().includes(keywordUpper) ||
          mapping.gcpService.toUpperCase().includes(keywordUpper) ||
          mapping.notes.toUpperCase().includes(keywordUpper)) {
        results.push(mapping);
      }
    }

    // Also search in official docs if enabled
    if (this.useOfficialDocs) {
      try {
        const officialMappings = await this.googleCloudDocsAdapter.getAllOfficialMappings(
          sourceProvider.type
        );

        for (const [service, mapping] of Object.entries(officialMappings)) {
          if (service.toUpperCase().includes(keywordUpper) ||
              mapping.gcpService.toUpperCase().includes(keywordUpper) ||
              (mapping.notes && mapping.notes.toUpperCase().includes(keywordUpper))) {
            // Normalize migration strategy to lowercase (enum expects lowercase)
            const strategy = (mapping.migrationStrategy || 'rehost').toLowerCase();
            const effort = (mapping.effort || 'medium').toLowerCase();
            
            results.push(new ServiceMapping({
              sourceService: service,
              sourceProvider: sourceProvider.type,
              gcpService: mapping.gcpService,
              gcpApi: mapping.gcpApi || '',
              migrationStrategy: strategy,
              effort: effort,
              notes: mapping.notes || '',
              considerations: mapping.considerations || []
            }));
          }
        }
      } catch (error) {
        console.warn('Error searching official docs:', error);
        // Continue with static mappings only
      }
    }

    return results;
  }

  /**
   * Check if mapping exists for service
   * @param {string} sourceService 
   * @param {CloudProvider} sourceProvider 
   * @returns {Promise<boolean>}
   */
  async hasMapping(sourceService, sourceProvider) {
    try {
      await this.getMapping(sourceService, sourceProvider);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default ServiceMappingRepository;
