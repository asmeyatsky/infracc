/**
 * Agent Cache Service Tests
 */

// Mock localforage BEFORE importing the service
const mockStore = new Map();

jest.mock('localforage', () => {
  const mockLocalforage = {
    config: jest.fn(),
    setItem: jest.fn((key, value) => {
      mockStore.set(key, value);
      return Promise.resolve(value);
    }),
    getItem: jest.fn((key) => {
      const value = mockStore.get(key);
      return Promise.resolve(value !== undefined ? value : null);
    }),
    removeItem: jest.fn((key) => {
      mockStore.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockStore.clear();
      return Promise.resolve();
    })
  };
  return mockLocalforage;
});

// Get reference to mocked localforage
import localforage from 'localforage';
const mockLocalforage = localforage;

// Now import the service (after mock is set up)
import {
  saveAgentOutput,
  getAgentOutput,
  hasAgentOutput,
  clearAgentOutput,
  clearAllCacheForFile,
  savePipelineState,
  getPipelineState,
  clearPipelineState,
  getCachedAgentIds
} from '../agentCacheService.js';

describe('Agent Cache Service', () => {
  const testFileUUID = 'test-uuid-123';
  const testAgentId = 'discovery';
  const testOutput = {
    workloads: [{ id: 'w1', name: 'Workload 1' }],
    workloadIds: ['w1'],
    workloadCount: 1
  };
  const testMetadata = {
    workloadCount: 1,
    timestamp: new Date().toISOString()
  };

  beforeEach(async () => {
    // Clear mock store before each test
    mockStore.clear();
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockLocalforage.setItem.mockImplementation((key, value) => {
      mockStore.set(key, value);
      return Promise.resolve(value);
    });
    mockLocalforage.getItem.mockImplementation((key) => {
      const value = mockStore.get(key);
      return Promise.resolve(value !== undefined ? value : null);
    });
    mockLocalforage.removeItem.mockImplementation((key) => {
      mockStore.delete(key);
      return Promise.resolve();
    });
  });

  describe('saveAgentOutput', () => {
    it('should save agent output to cache', async () => {
      const result = await saveAgentOutput(testFileUUID, testAgentId, testOutput, testMetadata);
      expect(result).toBe(true);

      const cached = await getAgentOutput(testFileUUID, testAgentId);
      expect(cached).toEqual(testOutput);
    });

    it('should include metadata in cache', async () => {
      await saveAgentOutput(testFileUUID, testAgentId, testOutput, testMetadata);
      
      const cached = await mockLocalforage.getItem(`agent_cache_v1_${testFileUUID}_${testAgentId}`);
      expect(cached).toBeDefined();
      expect(cached.metadata).toBeDefined();
      expect(cached.metadata.workloadCount).toBe(1);
      expect(cached.metadata.timestamp).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const originalSetItem = mockLocalforage.setItem;
      mockLocalforage.setItem = jest.fn().mockRejectedValueOnce(new Error('Storage error'));
      
      const result = await saveAgentOutput(testFileUUID, testAgentId, testOutput);
      expect(result).toBe(false);
      
      // Restore original implementation
      mockLocalforage.setItem = originalSetItem;
    });
  });

  describe('getAgentOutput', () => {
    it('should retrieve cached agent output', async () => {
      await saveAgentOutput(testFileUUID, testAgentId, testOutput);
      const cached = await getAgentOutput(testFileUUID, testAgentId);
      expect(cached).toEqual(testOutput);
    });

    it('should return null for non-existent cache', async () => {
      const cached = await getAgentOutput(testFileUUID, 'nonexistent');
      expect(cached).toBeNull();
    });

    it('should return null for wrong file UUID', async () => {
      await saveAgentOutput(testFileUUID, testAgentId, testOutput);
      const cached = await getAgentOutput('wrong-uuid', testAgentId);
      expect(cached).toBeNull();
    });
  });

  describe('hasAgentOutput', () => {
    it('should return true for existing cache', async () => {
      await saveAgentOutput(testFileUUID, testAgentId, testOutput);
      const hasCache = await hasAgentOutput(testFileUUID, testAgentId);
      expect(hasCache).toBe(true);
    });

    it('should return false for non-existent cache', async () => {
      const hasCache = await hasAgentOutput(testFileUUID, 'nonexistent');
      expect(hasCache).toBe(false);
    });
  });

  describe('clearAgentOutput', () => {
    it('should clear specific agent output', async () => {
      await saveAgentOutput(testFileUUID, testAgentId, testOutput);
      await saveAgentOutput(testFileUUID, 'assessment', { results: [] });
      
      await clearAgentOutput(testFileUUID, testAgentId);
      
      expect(await hasAgentOutput(testFileUUID, testAgentId)).toBe(false);
      expect(await hasAgentOutput(testFileUUID, 'assessment')).toBe(true);
    });
  });

  describe('clearAllCacheForFile', () => {
    it('should clear all cache for a file UUID', async () => {
      await saveAgentOutput(testFileUUID, 'discovery', testOutput);
      await saveAgentOutput(testFileUUID, 'assessment', { results: [] });
      await saveAgentOutput(testFileUUID, 'strategy', { waves: [] });
      
      await clearAllCacheForFile(testFileUUID);
      
      expect(await hasAgentOutput(testFileUUID, 'discovery')).toBe(false);
      expect(await hasAgentOutput(testFileUUID, 'assessment')).toBe(false);
      expect(await hasAgentOutput(testFileUUID, 'strategy')).toBe(false);
    });
  });

  describe('savePipelineState', () => {
    it('should save pipeline state', async () => {
      const state = {
        currentAgentIndex: 1,
        overallProgress: 50,
        agentProgress: 75
      };
      
      const result = await savePipelineState(testFileUUID, state);
      expect(result).toBe(true);
      
      const savedState = await getPipelineState(testFileUUID);
      expect(savedState.currentAgentIndex).toBe(1);
      expect(savedState.overallProgress).toBe(50);
    });
  });

  describe('getPipelineState', () => {
    it('should retrieve saved pipeline state', async () => {
      const state = {
        currentAgentIndex: 2,
        overallProgress: 75
      };
      
      await savePipelineState(testFileUUID, state);
      const savedState = await getPipelineState(testFileUUID);
      
      expect(savedState.currentAgentIndex).toBe(2);
      expect(savedState.overallProgress).toBe(75);
    });

    it('should return null for non-existent state', async () => {
      const state = await getPipelineState('nonexistent-uuid');
      expect(state).toBeNull();
    });
  });

  describe('getCachedAgentIds', () => {
    it('should return list of cached agent IDs', async () => {
      await saveAgentOutput(testFileUUID, 'discovery', testOutput);
      await saveAgentOutput(testFileUUID, 'assessment', { results: [] });
      
      const cachedAgents = await getCachedAgentIds(testFileUUID);
      expect(cachedAgents).toContain('discovery');
      expect(cachedAgents).toContain('assessment');
      expect(cachedAgents).not.toContain('strategy');
    });

    it('should return empty array for no cache', async () => {
      const cachedAgents = await getCachedAgentIds('nonexistent-uuid');
      expect(cachedAgents).toEqual([]);
    });
  });
});
