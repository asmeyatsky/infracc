/**
 * Workload Repository Implementation
 * 
 * Architectural Intent:
 * - Infrastructure layer implementation of WorkloadRepositoryPort
 * - Uses localStorage for persistence (can be replaced with API/database)
 * - Handles serialization/deserialization
 * - Isolated from domain layer
 */

import { WorkloadRepositoryPort } from '../../domain/ports/WorkloadRepositoryPort.js';
import { Workload } from '../../domain/entities/Workload.js';

/**
 * Workload Repository
 * 
 * Implementation Notes:
 * - Uses localStorage for persistence
 * - Can be easily replaced with API/database adapter
 * - Handles entity serialization transparently
 */
export class WorkloadRepository extends WorkloadRepositoryPort {
  /**
   * @param {Object} config
   * @param {string} config.storageKey - localStorage key (default: 'workloads')
   */
  constructor(config = {}) {
    super();
    this.storageKey = config.storageKey || 'workloads';
    this._cache = new Map(); // In-memory cache
  }

  /**
   * Save a workload
   * @param {Workload} workload 
   * @returns {Promise<Workload>}
   */
  async save(workload) {
    if (!(workload instanceof Workload)) {
      throw new Error('Workload instance required');
    }

    // Update cache
    this._cache.set(workload.id, workload);

    // Debounce persistence to avoid saving after every single workload
    // This prevents stack overflow when saving many workloads
    this._debouncedPersist();

    return workload;
  }

  /**
   * Debounced persistence - batches saves to avoid stack overflow
   * @private
   */
  _debouncedPersist() {
    // Clear existing timeout
    if (this._persistTimeout) {
      clearTimeout(this._persistTimeout);
    }

    // Set new timeout - persist after 500ms of no new saves
    this._persistTimeout = setTimeout(async () => {
      try {
        await this._persistToStorage();
      } catch (error) {
        console.error('Debounced persistence failed:', error);
      }
    }, 500);
  }

  /**
   * Force immediate persistence (for critical saves)
   * @private
   */
  async _forcePersist() {
    if (this._persistTimeout) {
      clearTimeout(this._persistTimeout);
      this._persistTimeout = null;
    }
    await this._persistToStorage();
  }

  /**
   * Find workload by ID
   * @param {string} id 
   * @returns {Promise<Workload|null>}
   */
  async findById(id) {
    // Check cache first
    if (this._cache.has(id)) {
      return this._cache.get(id);
    }

    // Load from storage
    await this._loadFromStorage();

    return this._cache.get(id) || null;
  }

  /**
   * Find all workloads
   * @returns {Promise<Workload[]>}
   */
  async findAll() {
    await this._loadFromStorage();
    return Array.from(this._cache.values());
  }

  /**
   * Delete workload
   * @param {string} id 
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const deleted = this._cache.delete(id);
    if (deleted) {
      this._debouncedPersist();
    }
    return deleted;
  }

  /**
   * Find workloads by source provider
   * @param {string} provider 
   * @returns {Promise<Workload[]>}
   */
  async findByProvider(provider) {
    await this._loadFromStorage();
    return Array.from(this._cache.values())
      .filter(workload => workload.sourceProvider.type === provider);
  }

  /**
   * Find workload by deduplication key (resource ID + service + region)
   * Used to prevent duplicate workloads when uploading multiple CUR files
   * @param {string} resourceId - AWS resource ID
   * @param {string} service - Service name
   * @param {string} region - Region
   * @returns {Promise<Workload|null>}
   */
  async findByDedupeKey(resourceId, service, region) {
    // Ensure cache is loaded (but don't reload if already loaded to avoid performance issues)
    if (this._cache.size === 0) {
      await this._loadFromStorage();
    }
    
    // Normalize input values
    const normalizedResourceId = String(resourceId || '').trim();
    const normalizedService = String(service || '').trim();
    const normalizedRegion = String(region || '').trim();
    const dedupeKey = `${normalizedResourceId}_${normalizedService}_${normalizedRegion}`.toLowerCase();
    
    if (!dedupeKey || dedupeKey === '__') {
      return null;
    }
    
    // Search for workload with matching resource ID, service, and region
    // Normalize all values for comparison
    for (const workload of this._cache.values()) {
      const workloadResourceId = String(workload.id || '').trim();
      const workloadService = String(workload.service || '').trim();
      const workloadRegion = String(workload.region || '').trim();
      
      const workloadKey = `${workloadResourceId}_${workloadService}_${workloadRegion}`.toLowerCase();
      
      if (workloadKey === dedupeKey && workloadKey.length > 0) {
        return workload;
      }
    }
    
    return null;
  }

  /**
   * Persist cache to localStorage
   * Optimized for large datasets - processes in chunks
   * Handles quota exceeded gracefully
   * @private
   */
  async _persistToStorage() {
    try {
      const cacheSize = this._cache.size;
      
      // For very large caches, serialize in chunks to avoid stack overflow
      if (cacheSize > 100) {
        const workloadsArray = [];
        let index = 0;
        
        // Process cache values in chunks
        for (const workload of this._cache.values()) {
          workloadsArray.push(workload.toJSON());
          index++;
          
          // Yield to event loop every 50 items to prevent blocking
          if (index % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        // Stringify in chunks if needed
        const jsonString = JSON.stringify(workloadsArray);
        
        try {
          localStorage.setItem(this.storageKey, jsonString);
        } catch (quotaError) {
          if (quotaError.name === 'QuotaExceededError') {
            // Try to save a subset if quota exceeded
            console.warn(`localStorage quota exceeded (${cacheSize} workloads). Attempting to save subset...`);
            
            // Save only the most recent 50% of workloads
            const subset = workloadsArray.slice(-Math.floor(workloadsArray.length / 2));
            const subsetJson = JSON.stringify(subset);
            
            try {
              localStorage.setItem(this.storageKey, subsetJson);
              console.warn(`Saved ${subset.length} most recent workloads (${workloadsArray.length - subset.length} older workloads not persisted)`);
            } catch (subsetError) {
              // If even subset fails, clear old data and try again
              console.warn('Even subset failed. Clearing old data and retrying...');
              localStorage.removeItem(this.storageKey);
              
              // Try saving just the last 100 workloads
              const minimal = workloadsArray.slice(-100);
              localStorage.setItem(this.storageKey, JSON.stringify(minimal));
              console.warn(`Saved only ${minimal.length} most recent workloads due to storage limits`);
            }
          } else {
            throw quotaError;
          }
        }
      } else {
        // For smaller caches, use direct serialization
        const workloadsData = Array.from(this._cache.values()).map(workload => workload.toJSON());
        
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(workloadsData));
        } catch (quotaError) {
          if (quotaError.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded. Clearing old data and retrying...');
            localStorage.removeItem(this.storageKey);
            localStorage.setItem(this.storageKey, JSON.stringify(workloadsData));
          } else {
            throw quotaError;
          }
        }
      }
    } catch (error) {
      console.error('Failed to persist workloads:', error);
      // Don't throw - allow operation to continue even if persistence fails
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded. Data will remain in memory cache only.');
      }
    }
  }

  /**
   * Load from localStorage into cache
   * Optimized for large datasets - processes in chunks
   * @private
   */
  async _loadFromStorage() {
    // Prevent concurrent loads
    if (this._isLoading) {
      return;
    }

    // If cache is already populated, skip loading
    if (this._cache.size > 0) {
      return;
    }

    this._isLoading = true;

    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) {
        this._isLoading = false;
        return;
      }

      // Parse JSON
      const workloadsData = JSON.parse(storedData);
      
      // For large datasets, process in chunks to avoid stack overflow
      if (workloadsData.length > 100) {
        const chunkSize = 50;
        for (let i = 0; i < workloadsData.length; i += chunkSize) {
          const chunk = workloadsData.slice(i, i + chunkSize);
          
          // Process chunk
          for (const data of chunk) {
            try {
              const workload = Workload.fromJSON(data);
              this._cache.set(workload.id, workload);
            } catch (error) {
              console.warn('Failed to create workload from stored data:', error);
            }
          }
          
          // Yield to event loop every chunk to prevent blocking
          if (i + chunkSize < workloadsData.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      } else {
        // For smaller datasets, process all at once
        const workloads = workloadsData.map(data => Workload.fromJSON(data));
        workloads.forEach(workload => {
          this._cache.set(workload.id, workload);
        });
      }
    } catch (error) {
      console.error('Failed to load workloads:', error);
      // Clear corrupted data
      try {
        localStorage.removeItem(this.storageKey);
      } catch (e) {
        // Ignore errors when clearing
      }
    } finally {
      this._isLoading = false;
    }
  }

  /**
   * Clear all workloads
   * @returns {Promise<void>}
   */
  async clear() {
    this._cache.clear();
    localStorage.removeItem(this.storageKey);
  }
}

export default WorkloadRepository;
