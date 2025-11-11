/**
 * Workload Assessment Service Tests
 * 
 * Tests domain service business logic for workload assessment
 */

import { WorkloadAssessmentService } from '../WorkloadAssessmentService.js';
import { Workload } from '../../entities/Workload.js';
import { Assessment } from '../../entities/Assessment.js';

describe('WorkloadAssessmentService', () => {
  let service;

  beforeEach(() => {
    service = new WorkloadAssessmentService();
  });

  describe('Complexity Assessment', () => {
    it('should assess complexity for small workload', () => {
      const workload = new Workload({
        name: 'Small',
        cpu: 2,
        memory: 4,
        sourceProvider: 'aws'
      });

      const complexity = service.assessComplexity(workload);
      expect(complexity).toBeGreaterThanOrEqual(1);
      expect(complexity).toBeLessThanOrEqual(10);
    });

    it('should assess higher complexity for large workload', () => {
      const small = new Workload({
        name: 'Small',
        cpu: 2,
        memory: 4,
        sourceProvider: 'aws'
      });

      const large = new Workload({
        name: 'Large',
        cpu: 32,
        memory: 128,
        sourceProvider: 'aws'
      });

      const smallComplexity = service.assessComplexity(small);
      const largeComplexity = service.assessComplexity(large);

      expect(largeComplexity).toBeGreaterThan(smallComplexity);
    });

    it('should assess higher complexity for workloads with dependencies', () => {
      const noDeps = new Workload({
        name: 'No Deps',
        cpu: 4,
        memory: 8,
        sourceProvider: 'aws'
      });

      const withDeps = new Workload({
        name: 'With Deps',
        cpu: 4,
        memory: 8,
        dependencies: ['dep1', 'dep2', 'dep3'],
        sourceProvider: 'aws'
      });

      const noDepsComplexity = service.assessComplexity(noDeps);
      const withDepsComplexity = service.assessComplexity(withDeps);

      expect(withDepsComplexity).toBeGreaterThan(noDepsComplexity);
    });

    it('should throw error for invalid input', () => {
      expect(() => {
        service.assessComplexity(null);
      }).toThrow('Workload instance required');
    });
  });

  describe('Risk Factor Identification', () => {
    it('should identify large workload risk', () => {
      const workload = new Workload({
        name: 'Large',
        cpu: 32,
        memory: 8,
        sourceProvider: 'aws'
      });

      const risks = service.identifyRiskFactors(workload);
      expect(risks).toContain('LARGE_WORKLOAD');
    });

    it('should identify dependency risks', () => {
      const workload = new Workload({
        name: 'Dependent',
        cpu: 4,
        memory: 8,
        dependencies: ['dep1'],
        sourceProvider: 'aws'
      });

      const risks = service.identifyRiskFactors(workload);
      expect(risks).toContain('DEPENDENCIES');
    });

    it('should identify high cost risk', () => {
      const workload = new Workload({
        name: 'Expensive',
        cpu: 4,
        memory: 8,
        monthlyCost: 15000,
        sourceProvider: 'aws'
      });

      const risks = service.identifyRiskFactors(workload);
      expect(risks).toContain('HIGH_COST');
    });

    it('should identify high traffic risk', () => {
      const workload = new Workload({
        name: 'High Traffic',
        cpu: 4,
        memory: 8,
        monthlyTraffic: 2000,
        sourceProvider: 'aws'
      });

      const risks = service.identifyRiskFactors(workload);
      expect(risks).toContain('HIGH_TRAFFIC');
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate recommendations for high complexity', () => {
      const workload = new Workload({
        name: 'Complex',
        cpu: 32,
        memory: 128,
        sourceProvider: 'aws'
      });

      const complexity = service.assessComplexity(workload);
      const risks = service.identifyRiskFactors(workload);
      const recommendations = service.generateRecommendations(workload, complexity, risks);

      expect(recommendations.length).toBeGreaterThan(0);
      if (complexity >= 8) {
        expect(recommendations.some(r => r.includes('phased migration'))).toBe(true);
      }
    });

    it('should recommend dependency mapping for dependent workloads', () => {
      const workload = new Workload({
        name: 'Dependent',
        cpu: 4,
        memory: 8,
        dependencies: ['dep1'],
        sourceProvider: 'aws'
      });

      const complexity = service.assessComplexity(workload);
      const risks = service.identifyRiskFactors(workload);
      const recommendations = service.generateRecommendations(workload, complexity, risks);

      expect(recommendations.some(r => r.includes('dependencies'))).toBe(true);
    });
  });

  describe('Infrastructure Assessment', () => {
    it('should perform infrastructure assessment', () => {
      const workload = new Workload({
        name: 'Test',
        cpu: 4,
        memory: 8,
        storage: 100,
        os: 'linux',
        region: 'us-east-1',
        sourceProvider: 'aws'
      });

      const assessment = service.performInfrastructureAssessment(workload);

      expect(assessment).toHaveProperty('cpu', 4);
      expect(assessment).toHaveProperty('memory', 8);
      expect(assessment).toHaveProperty('storage', 100);
      expect(assessment).toHaveProperty('complexityScore');
      expect(assessment).toHaveProperty('riskFactors');
      expect(assessment).toHaveProperty('recommendations');
      expect(assessment).toHaveProperty('estimatedMigrationTime');
      expect(assessment).toHaveProperty('resourceCompatibility');
    });

    it('should assess resource compatibility', () => {
      const workload = new Workload({
        name: 'Large',
        cpu: 100,
        memory: 700,
        sourceProvider: 'aws'
      });

      const assessment = service.performInfrastructureAssessment(workload);
      
      expect(assessment.resourceCompatibility).toBeDefined();
      expect(assessment.resourceCompatibility.cpu).toBeDefined();
      expect(assessment.resourceCompatibility.memory).toBeDefined();
    });
  });

  describe('Assessment Creation', () => {
    it('should create comprehensive assessment', () => {
      const workload = new Workload({
        name: 'Test',
        cpu: 4,
        memory: 8,
        sourceProvider: 'aws'
      });

      const infraData = service.performInfrastructureAssessment(workload);
      const appData = {
        serviceType: 'EC2',
        codeModAnalysis: true
      };

      const assessment = service.createAssessment(
        workload,
        infraData,
        appData,
        { serviceMappings: {} }
      );

      expect(assessment).toBeInstanceOf(Assessment);
      expect(assessment.isComprehensive()).toBe(true);
      expect(assessment.hasCodeModResults()).toBe(true);
    });

    it('should create infrastructure-only assessment', () => {
      const workload = new Workload({
        name: 'Test',
        cpu: 4,
        memory: 8,
        sourceProvider: 'aws'
      });

      const infraData = service.performInfrastructureAssessment(workload);
      const assessment = service.createAssessment(workload, infraData);

      expect(assessment).toBeInstanceOf(Assessment);
      expect(assessment.type).toBe('infrastructure');
    });
  });
});
