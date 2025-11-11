/**
 * Test Data Tests
 * 
 * Tests to verify test data is properly structured
 */

import {
  testWorkloads,
  testAssessments,
  testStrategies,
  testCostScenarios,
  loadTestProject,
  getWorkloadById,
  getAssessmentByWorkloadId,
  getStrategyByWorkloadId,
  getWorkloadsByType,
  getWorkloadsByProvider,
  getCriticalWorkloads,
  getCostScenarioById
} from '../index.js';

describe('Test Data', () => {
  test('should load all workloads', () => {
    expect(testWorkloads).toBeDefined();
    expect(Array.isArray(testWorkloads)).toBe(true);
    expect(testWorkloads.length).toBeGreaterThan(0);
  });

  test('should load all assessments', () => {
    expect(testAssessments).toBeDefined();
    expect(Array.isArray(testAssessments)).toBe(true);
    expect(testAssessments.length).toBeGreaterThan(0);
  });

  test('should load all strategies', () => {
    expect(testStrategies).toBeDefined();
    expect(Array.isArray(testStrategies)).toBe(true);
    expect(testStrategies.length).toBeGreaterThan(0);
  });

  test('should load cost scenarios', () => {
    expect(testCostScenarios).toBeDefined();
    expect(Array.isArray(testCostScenarios)).toBe(true);
    expect(testCostScenarios.length).toBeGreaterThan(0);
  });

  test('should load complete test project', () => {
    const project = loadTestProject();
    expect(project).toBeDefined();
    expect(project.workloads).toBeDefined();
    expect(project.assessments).toBeDefined();
    expect(project.strategies).toBeDefined();
    expect(project.costInputs).toBeDefined();
  });

  test('should get workload by ID', () => {
    const workload = getWorkloadById('wl-001');
    expect(workload).toBeDefined();
    expect(workload.id).toBe('wl-001');
  });

  test('should get assessment by workload ID', () => {
    const assessment = getAssessmentByWorkloadId('wl-001');
    expect(assessment).toBeDefined();
    expect(assessment.workloadId).toBe('wl-001');
  });

  test('should get strategy by workload ID', () => {
    const strategy = getStrategyByWorkloadId('wl-001');
    expect(strategy).toBeDefined();
    expect(strategy.workloadId).toBe('wl-001');
  });

  test('should get workloads by type', () => {
    const applications = getWorkloadsByType('application');
    expect(applications.length).toBeGreaterThan(0);
    applications.forEach(w => {
      expect(w.type).toBe('application');
    });
  });

  test('should get workloads by provider', () => {
    const awsWorkloads = getWorkloadsByProvider('aws');
    expect(awsWorkloads.length).toBeGreaterThan(0);
    awsWorkloads.forEach(w => {
      expect(w.sourceProvider).toBe('aws');
    });
  });

  test('should get critical workloads', () => {
    const critical = getCriticalWorkloads();
    expect(critical.length).toBeGreaterThan(0);
    critical.forEach(w => {
      expect(w.tags).toContain('critical');
    });
  });

  test('should get cost scenario by ID', () => {
    const scenario = getCostScenarioById('scenario-1');
    expect(scenario).toBeDefined();
    expect(scenario.id).toBe('scenario-1');
  });
});
