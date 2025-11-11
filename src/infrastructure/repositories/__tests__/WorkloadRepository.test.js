/**
 * Workload Repository Tests
 * 
 * Tests infrastructure repository implementation
 */

import { WorkloadRepository } from '../WorkloadRepository.js';
import { Workload } from '../../../domain/entities/Workload.js';

describe('WorkloadRepository', () => {
  let repository;
  const testStorageKey = 'test_workloads';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    repository = new WorkloadRepository({
      storageKey: testStorageKey
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('save', () => {
    it('should save workload to repository', async () => {
      const workload = new Workload({
        name: 'Test Workload',
        cpu: 4,
        memory: 8,
        sourceProvider: 'aws'
      });

      await repository.save(workload);

      const saved = await repository.findById(workload.id);
      expect(saved).toBeDefined();
      expect(saved.id).toBe(workload.id);
      expect(saved.name).toBe('Test Workload');
    });

    it('should throw error for invalid workload', async () => {
      await expect(
        repository.save(null)
      ).rejects.toThrow('Workload instance required');
    });
  });

  describe('findById', () => {
    it('should find workload by ID', async () => {
      const workload = new Workload({
        name: 'Test',
        sourceProvider: 'aws'
      });

      await repository.save(workload);
      const found = await repository.findById(workload.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(workload.id);
    });

    it('should return null if not found', async () => {
      const found = await repository.findById('invalid_id');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all workloads', async () => {
      const workload1 = new Workload({
        name: 'Workload 1',
        sourceProvider: 'aws'
      });
      const workload2 = new Workload({
        name: 'Workload 2',
        sourceProvider: 'aws'
      });

      await repository.save(workload1);
      await repository.save(workload2);

      const all = await repository.findAll();
      expect(all).toHaveLength(2);
    });

    it('should return empty array if no workloads', async () => {
      const all = await repository.findAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete workload', async () => {
      const workload = new Workload({
        name: 'Test',
        sourceProvider: 'aws'
      });

      await repository.save(workload);
      const deleted = await repository.delete(workload.id);

      expect(deleted).toBe(true);

      const found = await repository.findById(workload.id);
      expect(found).toBeNull();
    });

    it('should return false if workload not found', async () => {
      const deleted = await repository.delete('invalid_id');
      expect(deleted).toBe(false);
    });
  });

  describe('findByProvider', () => {
    it('should find workloads by provider', async () => {
      const awsWorkload = new Workload({
        name: 'AWS Workload',
        sourceProvider: 'aws'
      });
      const azureWorkload = new Workload({
        name: 'Azure Workload',
        sourceProvider: 'azure'
      });

      await repository.save(awsWorkload);
      await repository.save(azureWorkload);

      const awsWorkloads = await repository.findByProvider('aws');
      expect(awsWorkloads).toHaveLength(1);
      expect(awsWorkloads[0].sourceProvider.type).toBe('aws');
    });
  });

  describe('persistence', () => {
    it('should persist to localStorage', async () => {
      const workload = new Workload({
        name: 'Test',
        sourceProvider: 'aws'
      });

      await repository.save(workload);

      const stored = localStorage.getItem(testStorageKey);
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Test');
    });

    it('should load from localStorage', async () => {
      const workload = new Workload({
        name: 'Test',
        sourceProvider: 'aws'
      });

      await repository.save(workload);

      // Create new repository instance (simulates page reload)
      const newRepository = new WorkloadRepository({
        storageKey: testStorageKey
      });

      const loaded = await newRepository.findById(workload.id);
      expect(loaded).toBeDefined();
      expect(loaded.name).toBe('Test');
    });
  });
});
