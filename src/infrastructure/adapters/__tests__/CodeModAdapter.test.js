/**
 * CodeMod Adapter Tests
 * 
 * Tests infrastructure adapter implementation
 */

import { CodeModAdapter } from '../CodeModAdapter.js';
import { CodeModAnalysisRequest, CodeModAnalysisResult } from '../../../domain/ports/CodeModPort.js';

describe('CodeModAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new CodeModAdapter({
      useMock: true // Use mock for testing
    });
  });

  describe('isAvailable', () => {
    it('should return true when mock is enabled', async () => {
      const available = await adapter.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('analyzeCode', () => {
    it('should analyze code and return results', async () => {
      const request = new CodeModAnalysisRequest({
        sourceCode: 'const s3 = new AWS.S3();',
        sourceProvider: 'aws',
        serviceType: 'S3',
        filePaths: ['example.js']
      });

      const result = await adapter.analyzeCode(request);

      expect(result).toBeInstanceOf(CodeModAnalysisResult);
      expect(result.serviceMappings).toBeDefined();
      expect(result.complexityScore).toBeGreaterThanOrEqual(1);
      expect(result.complexityScore).toBeLessThanOrEqual(10);
    });

    it('should throw error for invalid request', async () => {
      await expect(
        adapter.analyzeCode({})
      ).rejects.toThrow('Invalid request type');
    });
  });

  describe('getServiceMappings', () => {
    it('should return service mappings for AWS', async () => {
      const mapping = await adapter.getServiceMappings('aws', 'EC2');

      expect(mapping).toBeDefined();
      expect(mapping.gcpService).toBe('Compute Engine');
      expect(mapping.strategy).toBe('rehost');
    });

    it('should return service mappings for Azure', async () => {
      const mapping = await adapter.getServiceMappings('azure', 'Virtual Machines');

      expect(mapping).toBeDefined();
      expect(mapping.gcpService).toBe('Compute Engine');
    });

    it('should return default mapping for unknown service', async () => {
      const mapping = await adapter.getServiceMappings('aws', 'UnknownService');

      expect(mapping).toBeDefined();
      expect(mapping.gcpService).toBe('Unknown');
    });
  });

  describe('generateMigrationPlan', () => {
    it('should generate migration plan from analysis result', async () => {
      const analysisResult = new CodeModAnalysisResult({
        serviceMappings: {
          EC2: {
            gcpService: 'Compute Engine',
            strategy: 'rehost'
          }
        },
        codeChanges: [],
        dependencies: [],
        complexityScore: 5,
        recommendations: []
      });

      const plan = await adapter.generateMigrationPlan(analysisResult);

      expect(plan).toBeDefined();
      expect(plan.serviceMappings).toBeDefined();
      expect(plan.estimatedEffort).toBeDefined();
    });
  });
});
