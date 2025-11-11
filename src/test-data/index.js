/**
 * Test Data Index
 * 
 * Centralized test data for the application
 * Provides realistic data for testing all features
 */

import workloadsData from './workloads.json';
import assessmentsData from './assessments.json';
import strategiesData from './migration-strategies.json';
import costScenariosData from './cost-scenarios.json';
import agentExecutionsData from './agent-executions.json';

export const testWorkloads = workloadsData.workloads;
export const testWorkloadsSummary = workloadsData.summary;

export const testAssessments = assessmentsData.assessments;
export const testAssessmentsSummary = assessmentsData.summary;

export const testStrategies = strategiesData.strategies;
export const testWavePlan = strategiesData.wavePlan;
export const testStrategiesSummary = strategiesData.summary;

export const testCostScenarios = costScenariosData.scenarios;
export const defaultCostScenario = costScenariosData.scenarios.find(
  s => s.id === costScenariosData.defaultScenario
) || costScenariosData.scenarios[0];

export const testAgentExecutions = agentExecutionsData.executions;
export const testWorkflow = agentExecutionsData.workflow;

/**
 * Load complete test project
 */
export function loadTestProject() {
  return {
    projectName: 'Test E-Commerce Migration Project',
    workloads: testWorkloads,
    assessments: testAssessments,
    strategies: testStrategies,
    wavePlan: testWavePlan,
    costInputs: defaultCostScenario,
    agentExecutions: testAgentExecutions,
    workflow: testWorkflow,
    metadata: {
      createdAt: '2024-01-15T10:00:00Z',
      lastModified: '2024-01-15T10:21:15Z',
      version: '1.0.0'
    }
  };
}

/**
 * Get workload by ID
 */
export function getWorkloadById(workloadId) {
  return testWorkloads.find(w => w.id === workloadId);
}

/**
 * Get assessment by workload ID
 */
export function getAssessmentByWorkloadId(workloadId) {
  return testAssessments.find(a => a.workloadId === workloadId);
}

/**
 * Get strategy by workload ID
 */
export function getStrategyByWorkloadId(workloadId) {
  return testStrategies.find(s => s.workloadId === workloadId);
}

/**
 * Get workloads by type
 */
export function getWorkloadsByType(type) {
  return testWorkloads.filter(w => w.type === type);
}

/**
 * Get workloads by provider
 */
export function getWorkloadsByProvider(provider) {
  return testWorkloads.filter(w => w.sourceProvider === provider);
}

/**
 * Get critical workloads
 */
export function getCriticalWorkloads() {
  return testWorkloads.filter(w => w.tags && w.tags.includes('critical'));
}

/**
 * Get cost scenario by ID
 */
export function getCostScenarioById(scenarioId) {
  return testCostScenarios.find(s => s.id === scenarioId);
}

export default {
  testWorkloads,
  testWorkloadsSummary,
  testAssessments,
  testAssessmentsSummary,
  testStrategies,
  testWavePlan,
  testStrategiesSummary,
  testCostScenarios,
  defaultCostScenario,
  testAgentExecutions,
  testWorkflow,
  loadTestProject,
  getWorkloadById,
  getAssessmentByWorkloadId,
  getStrategyByWorkloadId,
  getWorkloadsByType,
  getWorkloadsByProvider,
  getCriticalWorkloads,
  getCostScenarioById
};
