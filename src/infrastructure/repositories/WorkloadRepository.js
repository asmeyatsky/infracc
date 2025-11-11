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

    // Persist to localStorage
    await this._persistToStorage();

    return workload;
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
      await this._persistToStorage();
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
   * Persist cache to localStorage
   * @private
   */
  async _persistToStorage() {
    try {
      const workloadsData = Array.from(this._cache.values()).map(workload => workload.toJSON());
      localStorage.setItem(this.storageKey, JSON.stringify(workloadsData));
    } catch (error) {
      console.error('Failed to persist workloads:', error);
      throw new Error('Failed to save workloads');
    }
  }

  /**
   * Load from localStorage into cache
   * @private
   */
  async _loadFromStorage() {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) {
        return;
      }

      const workloadsData = JSON.parse(storedData);
      const workloads = workloadsData.map(data => Workload.fromJSON(data));

      // Update cache
      workloads.forEach(workload => {
        this._cache.set(workload.id, workload);
      });
    } catch (error) {
      console.error('Failed to load workloads:', error);
      // Clear corrupted data
      localStorage.removeItem(this.storageKey);
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
