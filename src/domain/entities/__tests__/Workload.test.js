/**
 * Workload Entity Tests
 * 
 * Tests domain logic and business rules in Workload entity
 */

import { Workload } from '../Workload.js';
import { CloudProvider, CloudProviderType } from '../../value_objects/CloudProvider.js';
import { WorkloadType, WorkloadTypeEnum } from '../../value_objects/WorkloadType.js';
import { Money } from '../../value_objects/Money.js';

describe('Workload Entity', () => {
  describe('Construction', () => {
    it('should create a valid workload with required fields', () => {
      const workload = new Workload({
        name: 'Web Server',
        cpu: 4,
        memory: 8,
        storage: 100,
        monthlyCost: 100,
        sourceProvider: 'aws'
      });

      expect(workload.name).toBe('Web Server');
      expect(workload.cpu).toBe(4);
      expect(workload.memory).toBe(8);
      expect(workload.storage).toBe(100);
      expect(workload.monthlyCost).toBeInstanceOf(Money);
      expect(workload.sourceProvider).toBeInstanceOf(CloudProvider);
      expect(workload.type).toBeInstanceOf(WorkloadType);
    });

    it('should throw error if name is missing', () => {
      expect(() => {
        new Workload({
          cpu: 4,
          memory: 8
        });
      }).toThrow('Workload name is required');
    });

    it('should throw error if source provider is not AWS or Azure', () => {
      expect(() => {
        new Workload({
          name: 'Test',
          sourceProvider: 'gcp'
        });
      }).toThrow('Source provider must be AWS or Azure');
    });

    it('should generate unique ID if not provided', () => {
      const workload1 = new Workload({ name: 'Server 1' });
      const workload2 = new Workload({ name: 'Server 2' });

      expect(workload1.id).toBeDefined();
      expect(workload2.id).toBeDefined();
      expect(workload1.id).not.toBe(workload2.id);
    });
  });

  describe('Business Logic', () => {
    let workload;

    beforeEach(() => {
      workload = new Workload({
        name: 'Test Workload',
        cpu: 4,
        memory: 8,
        storage: 100,
        monthlyCost: 100,
        sourceProvider: 'aws'
      });
    });

    it('should identify large workloads correctly', () => {
      const smallWorkload = new Workload({
        name: 'Small',
        cpu: 4,
        memory: 8,
        sourceProvider: 'aws'
      });
      expect(smallWorkload.isLargeWorkload()).toBe(false);

      const largeWorkload = new Workload({
        name: 'Large',
        cpu: 16,
        memory: 8,
        sourceProvider: 'aws'
      });
      expect(largeWorkload.isLargeWorkload()).toBe(true);

      const largeMemoryWorkload = new Workload({
        name: 'Large Memory',
        cpu: 4,
        memory: 64,
        sourceProvider: 'aws'
      });
      expect(largeMemoryWorkload.isLargeWorkload()).toBe(true);
    });

    it('should detect dependencies correctly', () => {
      expect(workload.hasDependencies()).toBe(false);

      const workloadWithDeps = new Workload({
        name: 'Dependent',
        dependencies: ['dep1', 'dep2'],
        sourceProvider: 'aws'
      });
      expect(workloadWithDeps.hasDependencies()).toBe(true);
    });

    it('should identify Windows workloads', () => {
      const linuxWorkload = new Workload({
        name: 'Linux',
        os: 'linux',
        sourceProvider: 'aws'
      });
      expect(linuxWorkload.isWindowsWorkload()).toBe(false);

      const windowsWorkload = new Workload({
        name: 'Windows',
        os: 'windows',
        sourceProvider: 'aws'
      });
      expect(windowsWorkload.isWindowsWorkload()).toBe(true);
    });

    it('should identify containerized workloads', () => {
      const vmWorkload = new Workload({
        name: 'VM',
        type: 'vm',
        sourceProvider: 'aws'
      });
      expect(vmWorkload.isContainerized()).toBe(false);

      const containerWorkload = new Workload({
        name: 'Container',
        type: 'container',
        sourceProvider: 'aws'
      });
      expect(containerWorkload.isContainerized()).toBe(true);
    });

    it('should calculate resource score correctly', () => {
      const score = workload.calculateResourceScore();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);

      // Larger workload should have higher score
      const largerWorkload = new Workload({
        name: 'Large',
        cpu: 32,
        memory: 128,
        storage: 1000,
        monthlyCost: 10000,
        sourceProvider: 'aws'
      });
      expect(largerWorkload.calculateResourceScore()).toBeGreaterThan(score);
    });
  });

  describe('Assessment Assignment', () => {
    it('should assign assessment to workload', () => {
      const workload = new Workload({
        name: 'Test',
        sourceProvider: 'aws'
      });

      const assessment = {
        complexityScore: 5,
        riskFactors: ['LARGE_WORKLOAD'],
        recommendations: ['Test recommendation']
      };

      workload.assignAssessment(assessment);
      expect(workload.assessment).toEqual(assessment);
    });

    it('should throw error for invalid assessment', () => {
      const workload = new Workload({
        name: 'Test',
        sourceProvider: 'aws'
      });

      expect(() => {
        workload.assignAssessment(null);
      }).toThrow('Assessment must be a valid object');
    });
  });

  describe('Migration Strategy Assignment', () => {
    it('should assign migration strategy to workload', () => {
      const workload = new Workload({
        name: 'Test',
        sourceProvider: 'aws'
      });

      const strategy = {
        strategy: 'rehost',
        targetService: 'Compute Engine',
        effort: 'low'
      };

      workload.assignMigrationStrategy(strategy);
      expect(workload.migrationStrategy).toEqual(strategy);
    });

    it('should throw error for invalid strategy', () => {
      const workload = new Workload({
        name: 'Test',
        sourceProvider: 'aws'
      });

      expect(() => {
        workload.assignMigrationStrategy(null);
      }).toThrow('Migration strategy must be a valid object');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const workload = new Workload({
        id: 'test_id',
        name: 'Test Workload',
        cpu: 4,
        memory: 8,
        storage: 100,
        monthlyCost: 100,
        sourceProvider: 'aws',
        service: 'EC2',
        type: 'vm'
      });

      const json = workload.toJSON();

      expect(json.id).toBe('test_id');
      expect(json.name).toBe('Test Workload');
      expect(json.cpu).toBe(4);
      expect(json.memory).toBe(8);
      expect(json.storage).toBe(100);
      expect(json.monthlyCost).toBe(100);
      expect(json.sourceProvider).toBe('aws');
      expect(json.type).toBe('vm');
    });

    it('should deserialize from JSON correctly', () => {
      const data = {
        id: 'test_id',
        name: 'Test Workload',
        cpu: 4,
        memory: 8,
        storage: 100,
        monthlyCost: 100,
        sourceProvider: 'aws',
        service: 'EC2',
        type: 'vm'
      };

      const workload = Workload.fromJSON(data);

      expect(workload.id).toBe('test_id');
      expect(workload.name).toBe('Test Workload');
      expect(workload.cpu).toBe(4);
      expect(workload.memory).toBe(8);
    });
  });
});
