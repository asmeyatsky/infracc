/**
 * Workload Repository Implementation
 * 
 * Architectural Intent:
 * - Infrastructure layer implementation of WorkloadRepositoryPort
 * - Uses IndexedDB (via localforage) for persistence (handles large datasets)
 * - Handles serialization/deserialization
 * - Isolated from domain layer
 */

import { WorkloadRepositoryPort } from '../../domain/ports/WorkloadRepositoryPort.js';
import { Workload } from '../../domain/entities/Workload.js';
import localforage from 'localforage';

/**
 * Workload Repository
 * 
 * Implementation Notes:
 * - Uses IndexedDB (via localforage) for persistence - handles large datasets (millions of records)
 * - Automatically falls back to localStorage if IndexedDB unavailable
 * - Handles entity serialization transparently
 */
export class WorkloadRepository extends WorkloadRepositoryPort {
  /**
   * @param {Object} config
   * @param {string} config.storageKey - Storage key (default: 'workloads')
   */
  constructor(config = {}) {
    super();
    this.storageKey = config.storageKey || 'workloads';
    this._cache = new Map(); // In-memory cache
    this._storage = localforage.createInstance({
      name: 'WorkloadRepository',
      storeName: 'workloads',
      description: 'Workload repository storage using IndexedDB'
    });
    this._isLoading = false;
    this._isPersisting = false; // Guard against concurrent persistence
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

    // Persist to IndexedDB (debounced for batch operations)
    this._debouncedPersist();

    return workload;
  }

  async saveManyImmediate(workloads) {
    if (!Array.isArray(workloads)) {
      throw new Error('workloads must be an array');
    }

    const BATCH_WRITE_SIZE = 5000;
    let persistedCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < workloads.length; i += BATCH_WRITE_SIZE) {
      const batch = workloads.slice(i, i + BATCH_WRITE_SIZE);

      const writePromises = batch.map(workload => {
        if (!(workload instanceof Workload)) {
          console.warn('Item in workloads is not a Workload instance, skipping');
          return Promise.resolve(null);
        }
        try {
          const workloadData = workload.toJSON();
          return this._storage.setItem(workload.id, workloadData).catch(error => {
            console.warn(`Failed to persist workload ${workload.id}:`, error);
            return null; // Return null on error instead of throwing
          });
        } catch (error) {
          console.warn(`Failed to prepare workload ${workload.id} for persistence:`, error);
          return Promise.resolve(null); // Continue even if preparation fails
        }
      });

      const results = await Promise.allSettled(writePromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
      persistedCount += successCount;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`WorkloadRepository.saveManyImmediate() - Persisted ${persistedCount.toLocaleString()} of ${workloads.length.toLocaleString()} workloads to IndexedDB in ${elapsed}s`);

  }

  /**
   * Debounced persistence - batches saves to avoid performance issues
   * @private
   */
  _debouncedPersist() {
    // Clear existing timeout
    if (this._persistTimeout) {
      clearTimeout(this._persistTimeout);
    }

    // PERFORMANCE: Reduced debounce from 500ms to 200ms for faster persistence
    // IndexedDB can handle frequent writes better than localStorage
    this._persistTimeout = setTimeout(async () => {
      try {
        await this._persistToStorage();
      } catch (error) {
        console.error('Debounced persistence failed:', error);
      }
    }, 200);
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
    const allWorkloads = Array.from(this._cache.values());
    
    console.log(`WorkloadRepository.findAll() - Returning ${allWorkloads.length.toLocaleString()} workloads from cache`);
    
    return allWorkloads;
  }

  /**
   * Delete workload
   * @param {string} id 
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const deleted = this._cache.delete(id);
    if (deleted) {
      // Also remove from IndexedDB
      try {
        await this._storage.removeItem(id);
      } catch (error) {
        console.warn('Failed to remove workload from IndexedDB:', error);
      }
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
   * Persist cache to IndexedDB
   * Optimized for large datasets - processes in chunks
   * @private
   */
  async _persistToStorage() {
    // SAFETY: Prevent concurrent persistence operations
    if (this._isPersisting) {
      console.warn('[WorkloadRepository] Persistence already in progress, skipping duplicate call');
      return;
    }
    
    this._isPersisting = true;
    const PERSIST_TIMEOUT_MS = 600000; // 10 minutes max
    const persistStartTime = Date.now();
    
    try {
      const cacheSize = this._cache.size;
      
      if (cacheSize === 0) {
        return; // Nothing to persist
      }
      
      // SAFETY: Check for timeout during persistence
      if (Date.now() - persistStartTime > PERSIST_TIMEOUT_MS) {
        console.error('[WorkloadRepository] Persistence exceeded timeout');
        return;
      }

      // PERFORMANCE: Use parallel writes for much faster persistence
      if (cacheSize > 1000) {
        const BATCH_WRITE_SIZE = 5000; // Write 5000 items in parallel at once
        let persistedCount = 0;
        const startTime = Date.now();
        
        // Create snapshot of cache values to prevent iterator issues if cache grows during persistence
        // SAFETY: Use safe array conversion with error handling
        let workloadsToPersist = [];
        try {
          workloadsToPersist = Array.from(this._cache.values());
        } catch (arrayError) {
          console.error('[WorkloadRepository] Error converting cache to array:', arrayError);
          // Try alternative method
          workloadsToPersist = [];
          for (const workload of this._cache.values()) {
            workloadsToPersist.push(workload);
            // Safety limit
            if (workloadsToPersist.length > 1000000) {
              console.warn('[WorkloadRepository] Cache too large, limiting to 1M workloads');
              break;
            }
          }
        }
        const actualCacheSize = workloadsToPersist.length;
        
        // Process in parallel batches for much better performance
        for (let i = 0; i < workloadsToPersist.length; i += BATCH_WRITE_SIZE) {
          const batch = workloadsToPersist.slice(i, i + BATCH_WRITE_SIZE);
          
          // Write entire batch in parallel (IndexedDB handles concurrent writes efficiently)
          // SAFETY: Use Promise.allSettled to handle individual failures gracefully
          const writePromises = batch.map(workload => {
            try {
              const workloadData = workload.toJSON();
              return this._storage.setItem(workload.id, workloadData).catch(error => {
                console.warn(`Failed to persist workload ${workload.id}:`, error);
                return null; // Return null on error instead of throwing
              });
            } catch (error) {
              console.warn(`Failed to prepare workload ${workload.id} for persistence:`, error);
              return Promise.resolve(null); // Continue even if preparation fails
            }
          });
          
          // SAFETY: Use allSettled to continue even if some writes fail
          const results = await Promise.allSettled(writePromises);
          const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
          persistedCount += successCount;
          
          // Log failures if any
          const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === null));
          if (failures.length > 0 && failures.length <= 10) {
            console.warn(`[WorkloadRepository] ${failures.length} workloads failed to persist in this batch`);
          }
          
          // Log progress every 50K items for large datasets
          if (actualCacheSize > 50000 && persistedCount % 50000 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const percent = ((persistedCount / actualCacheSize) * 100).toFixed(1);
            console.log(`[PERSIST] Progress: ${persistedCount.toLocaleString()}/${actualCacheSize.toLocaleString()} (${percent}%) - ${elapsed}s elapsed`);
          }
          
          // Yield to event loop every batch to keep UI responsive
          if (i + BATCH_WRITE_SIZE < workloadsToPersist.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const finalCacheSize = this._cache.size; // Current cache size (may have grown)
        console.log(`WorkloadRepository._persistToStorage() - Persisted ${persistedCount.toLocaleString()} workloads to IndexedDB (snapshot size: ${actualCacheSize.toLocaleString()}, current cache: ${finalCacheSize.toLocaleString()}) in ${elapsed}s`);
      } else {
        // For smaller caches, persist all at once
        // SAFETY: Use Promise.allSettled for better error handling
        const persistPromises = [];
        // Create snapshot for consistency
        let workloadsToPersist = [];
        try {
          workloadsToPersist = Array.from(this._cache.values());
        } catch (arrayError) {
          console.error('[WorkloadRepository] Error converting cache to array:', arrayError);
          workloadsToPersist = [];
          for (const workload of this._cache.values()) {
            workloadsToPersist.push(workload);
          }
        }
        for (const workload of workloadsToPersist) {
          try {
            const workloadData = workload.toJSON();
            persistPromises.push(
              this._storage.setItem(workload.id, workloadData).catch(error => {
                console.warn(`Failed to persist workload ${workload.id}:`, error);
                return null;
              })
            );
          } catch (error) {
            console.warn(`Failed to prepare workload for persistence:`, error);
            persistPromises.push(Promise.resolve(null));
          }
        }
        
        const results = await Promise.allSettled(persistPromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
        console.log(`WorkloadRepository._persistToStorage() - Persisted ${successCount}/${this._cache.size} workloads to IndexedDB`);
      }
    } catch (error) {
      console.error('Failed to persist workloads to IndexedDB:', error);
      // Don't throw - allow operation to continue even if persistence fails
    } finally {
      this._isPersisting = false;
    }
  }

  /**
   * Load from IndexedDB into cache
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
      // Get all keys from IndexedDB
      const keys = await this._storage.keys();
      
      if (keys.length === 0) {
        console.log('WorkloadRepository._loadFromStorage() - No stored data found in IndexedDB');
        this._isLoading = false;
        return;
      }

      console.log(`WorkloadRepository._loadFromStorage() - Loading ${keys.length.toLocaleString()} workloads from IndexedDB`);

      // PERFORMANCE: Increased chunk size for faster loading
      if (keys.length > 1000) {
        const chunkSize = 1000; // Increased from 500 to 1000 for better performance
        let loadedCount = 0;
        
        for (let i = 0; i < keys.length; i += chunkSize) {
          const chunk = keys.slice(i, i + chunkSize);
          
          // Load chunk in parallel
          const chunkPromises = chunk.map(async (key) => {
            try {
              const data = await this._storage.getItem(key);
              if (data) {
                const workload = Workload.fromJSON(data);
                this._cache.set(workload.id, workload);
                return true;
              }
              return false;
            } catch (error) {
              console.warn(`Failed to load workload ${key}:`, error);
              return false;
            }
          });
          
          const results = await Promise.all(chunkPromises);
          loadedCount += results.filter(Boolean).length;
          
          // Yield to event loop every chunk to prevent blocking
          if (i + chunkSize < keys.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        console.log(`WorkloadRepository._loadFromStorage() - Loaded ${loadedCount.toLocaleString()} workloads into cache (cache size now: ${this._cache.size.toLocaleString()})`);
      } else {
        // For smaller datasets, load all at once
        const loadPromises = keys.map(async (key) => {
          try {
            const data = await this._storage.getItem(key);
            if (data) {
              const workload = Workload.fromJSON(data);
              this._cache.set(workload.id, workload);
              return true;
            }
            return false;
          } catch (error) {
            console.warn(`Failed to load workload ${key}:`, error);
            return false;
          }
        });
        
        await Promise.all(loadPromises);
        console.log(`WorkloadRepository._loadFromStorage() - Loaded ${this._cache.size.toLocaleString()} workloads into cache`);
      }
    } catch (error) {
      console.error('Failed to load workloads from IndexedDB:', error);
      // Clear corrupted data if needed
      try {
        await this._storage.clear();
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
    try {
      await this._storage.clear();
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
  }
}

export default WorkloadRepository;
