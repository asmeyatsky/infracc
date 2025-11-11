/**
 * Workload Repository Port (Interface)
 * 
 * Architectural Intent:
 * - Defines contract for workload persistence
 * - Infrastructure layer implements this (localStorage, database, API)
 * - Keeps domain layer independent of storage mechanism
 */

import { Workload } from '../entities/Workload.js';

/**
 * Workload Repository Port Interface
 * 
 * All workload persistence operations go through this interface
 */
export class WorkloadRepositoryPort {
  /**
   * Save a workload
   * @param {Workload} workload - Workload to save
   * @returns {Promise<Workload>} Saved workload
   * @abstract
   */
  async save(workload) {
    throw new Error('WorkloadRepositoryPort.save must be implemented');
  }

  /**
   * Find workload by ID
   * @param {string} id - Workload ID
   * @returns {Promise<Workload|null>} Workload or null if not found
   * @abstract
   */
  async findById(id) {
    throw new Error('WorkloadRepositoryPort.findById must be implemented');
  }

  /**
   * Find all workloads
   * @returns {Promise<Workload[]>} Array of workloads
   * @abstract
   */
  async findAll() {
    throw new Error('WorkloadRepositoryPort.findAll must be implemented');
  }

  /**
   * Delete workload
   * @param {string} id - Workload ID
   * @returns {Promise<boolean>} True if deleted
   * @abstract
   */
  async delete(id) {
    throw new Error('WorkloadRepositoryPort.delete must be implemented');
  }

  /**
   * Find workloads by source provider
   * @param {string} provider - Source provider ('aws' or 'azure')
   * @returns {Promise<Workload[]>} Array of workloads
   * @abstract
   */
  async findByProvider(provider) {
    throw new Error('WorkloadRepositoryPort.findByProvider must be implemented');
  }
}

export default WorkloadRepositoryPort;
