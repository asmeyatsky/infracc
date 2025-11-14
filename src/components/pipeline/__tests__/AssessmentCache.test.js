/**
 * Unit tests for Assessment Agent cache saving and retrieval
 * Root Cause Analysis: Verify Assessment output is properly saved and retrieved
 */

import { saveAgentOutput, getAgentOutput, clearAgentOutput, getCachedAgentIds } from '../../../utils/agentCacheService';

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

describe('Assessment Agent Cache - Root Cause Analysis', () => {
  const testFileUUID = 'test-uuid-123';
  const testAssessmentOutput = {
    results: [
      { workloadId: 'w1', complexity: 'low', readiness: 'high' },
      { workloadId: 'w2', complexity: 'medium', readiness: 'medium' }
    ],
    failed: [],
    totalProcessed: 2,
    successfulCount: 2,
    failedCount: 0,
    timestamp: new Date().toISOString()
  };

  beforeEach(() => {
    // Clear cache before each test
    mockStorage.clear();
  });

  test('should save assessment output successfully', async () => {
    const success = await saveAgentOutput(testFileUUID, 'assessment', testAssessmentOutput, {
      totalProcessed: 2,
      successfulCount: 2,
      failedCount: 0
    });

    expect(success).toBe(true);
  });

  test('should retrieve assessment output immediately after saving', async () => {
    await saveAgentOutput(testFileUUID, 'assessment', testAssessmentOutput);
    
    const retrieved = await getAgentOutput(testFileUUID, 'assessment');
    
    expect(retrieved).not.toBeNull();
    expect(retrieved.results).toHaveLength(2);
    expect(retrieved.successfulCount).toBe(2);
  });

  test('should verify fileUUID consistency between save and retrieve', async () => {
    const fileUUID1 = 'test-uuid-123';
    const fileUUID2 = 'test-uuid-456';
    
    await saveAgentOutput(fileUUID1, 'assessment', testAssessmentOutput);
    
    // Should find with correct UUID
    const found1 = await getAgentOutput(fileUUID1, 'assessment');
    expect(found1).not.toBeNull();
    
    // Should NOT find with different UUID
    const found2 = await getAgentOutput(fileUUID2, 'assessment');
    expect(found2).toBeNull();
  });

  test('should handle empty results array', async () => {
    const emptyOutput = {
      results: [],
      failed: [],
      totalProcessed: 0,
      successfulCount: 0,
      failedCount: 0,
      timestamp: new Date().toISOString()
    };

    await saveAgentOutput(testFileUUID, 'assessment', emptyOutput);
    const retrieved = await getAgentOutput(testFileUUID, 'assessment');
    
    expect(retrieved).not.toBeNull();
    expect(retrieved.results).toHaveLength(0);
  });

  test('should appear in cached agent IDs list', async () => {
    await saveAgentOutput(testFileUUID, 'assessment', testAssessmentOutput);
    
    const cachedAgents = await getCachedAgentIds(testFileUUID);
    
    expect(cachedAgents).toContain('assessment');
  });

  test('should handle concurrent save and retrieve', async () => {
    // Simulate concurrent operations
    const savePromise = saveAgentOutput(testFileUUID, 'assessment', testAssessmentOutput);
    const retrievePromise = getAgentOutput(testFileUUID, 'assessment');
    
    await savePromise;
    const retrieved = await retrievePromise;
    
    // Should either be null (if retrieve happened before save) or have data
    // But after save completes, should definitely be retrievable
    const finalRetrieved = await getAgentOutput(testFileUUID, 'assessment');
    expect(finalRetrieved).not.toBeNull();
  });

  test('should verify cache key format consistency', async () => {
    await saveAgentOutput(testFileUUID, 'assessment', testAssessmentOutput);
    
    // Try to retrieve with same UUID but different agent ID
    const wrongAgent = await getAgentOutput(testFileUUID, 'discovery');
    expect(wrongAgent).toBeNull();
    
    // Correct agent ID should work
    const correctAgent = await getAgentOutput(testFileUUID, 'assessment');
    expect(correctAgent).not.toBeNull();
  });
});
