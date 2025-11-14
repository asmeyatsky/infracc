/**
 * Integration test for Pipeline flow - Assessment to Strategy transition
 * Root Cause Analysis: Verify Assessment output is available when Strategy Agent runs
 */

import { saveAgentOutput, getAgentOutput, clearAllCacheForFile } from '../../../utils/agentCacheService';

// Mock localforage - use a module-level storage that persists
const mockStorage = new Map();

jest.mock('localforage', () => {
  return {
    config: jest.fn(),
    setItem: (key, value) => {
      mockStorage.set(key, value);
      return Promise.resolve(value);
    },
    getItem: (key) => {
      const value = mockStorage.get(key);
      return Promise.resolve(value !== undefined ? value : null);
    },
    removeItem: (key) => {
      mockStorage.delete(key);
      return Promise.resolve();
    },
    clear: () => {
      mockStorage.clear();
      return Promise.resolve();
    }
  };
});

describe('Pipeline Flow - Assessment to Strategy Transition', () => {
  const testFileUUID = 'test-pipeline-uuid';

  beforeEach(() => {
    mockStorage.clear();
  });

  test('should have assessment output available after assessment completes', async () => {
    // Step 1: Save discovery output (prerequisite)
    const discoveryOutput = {
      workloadIds: ['w1', 'w2', 'w3'],
      workloads: [],
      timestamp: new Date().toISOString()
    };
    await saveAgentOutput(testFileUUID, 'discovery', discoveryOutput);

    // Step 2: Save assessment output (simulating Assessment Agent completion)
    const assessmentOutput = {
      results: [
        { workloadId: 'w1', complexity: 'low' },
        { workloadId: 'w2', complexity: 'medium' },
        { workloadId: 'w3', complexity: 'high' }
      ],
      failed: [],
      totalProcessed: 3,
      successfulCount: 3,
      failedCount: 0,
      timestamp: new Date().toISOString()
    };

    const saveSuccess = await saveAgentOutput(testFileUUID, 'assessment', assessmentOutput, {
      totalProcessed: 3,
      successfulCount: 3,
      failedCount: 0
    });

    expect(saveSuccess).toBe(true);

    // Step 3: Immediately verify assessment output exists (Strategy Agent check)
    const verifyAssessment = await getAgentOutput(testFileUUID, 'assessment');
    
    expect(verifyAssessment).not.toBeNull();
    expect(verifyAssessment.results).toHaveLength(3);
    expect(verifyAssessment.results).toBeDefined();
    expect(Array.isArray(verifyAssessment.results)).toBe(true);
  });

  test('should handle fileUUID consistency throughout pipeline', async () => {
    const fileUUID = 'consistent-uuid-test';
    
    // Save discovery
    await saveAgentOutput(fileUUID, 'discovery', {
      workloadIds: ['w1'],
      workloads: []
    });

    // Save assessment with same UUID
    const assessmentOutput = {
      results: [{ workloadId: 'w1', complexity: 'low' }],
      failed: [],
      totalProcessed: 1,
      successfulCount: 1,
      failedCount: 0
    };

    await saveAgentOutput(fileUUID, 'assessment', assessmentOutput);

    // Retrieve with same UUID (Strategy Agent scenario)
    const retrieved = await getAgentOutput(fileUUID, 'assessment');
    
    expect(retrieved).not.toBeNull();
    expect(retrieved.results).toHaveLength(1);
  });

  test('should fail gracefully when assessment output is missing', async () => {
    // Only discovery exists, no assessment
    await saveAgentOutput(testFileUUID, 'discovery', {
      workloadIds: ['w1'],
      workloads: []
    });

    // Strategy Agent tries to get assessment (should be null)
    const assessmentOutput = await getAgentOutput(testFileUUID, 'assessment');
    
    expect(assessmentOutput).toBeNull();
  });

  test('should verify assessment output structure matches Strategy Agent expectations', async () => {
    const assessmentOutput = {
      results: [
        { workloadId: 'w1', complexity: 'low', readiness: 'high' }
      ],
      failed: [],
      totalProcessed: 1,
      successfulCount: 1,
      failedCount: 0,
      timestamp: new Date().toISOString()
    };

    await saveAgentOutput(testFileUUID, 'assessment', assessmentOutput);

    const retrieved = await getAgentOutput(testFileUUID, 'assessment');

    // Strategy Agent expects these fields
    expect(retrieved).not.toBeNull();
    expect(retrieved.results).toBeDefined();
    expect(Array.isArray(retrieved.results)).toBe(true);
    expect(retrieved.results.length).toBeGreaterThan(0);
  });
});
