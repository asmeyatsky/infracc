/**
 * @file FileUploadManager.test.js
 * @description This file contains tests for the FileUploadManager class.
 */

import { FileUploadManager } from '../CurUploadButton';
import { Workload } from '../../domain/entities/Workload';
import { parseAwsCurStreaming } from '../../utils/streamingCsvParser';

// Mock dependencies
jest.mock('../../utils/streamingCsvParser', () => ({
  parseAwsCurStreaming: jest.fn(),
}));

const mockWorkloadRepository = {
  findById: jest.fn(),
  save: jest.fn(),
};

describe('FileUploadManager', () => {
  let fileUploadManager;

  beforeEach(() => {
    jest.clearAllMocks();
    fileUploadManager = new FileUploadManager(mockWorkloadRepository);
  });

  describe('CSV processing', () => {
    it('should use streaming parser for large files', async () => {
      const largeFile = new File(['a'.repeat(60 * 1024 * 1024)], 'large.csv', { type: 'text/csv' });
      await fileUploadManager._processCsvFile(largeFile);
      expect(parseAwsCurStreaming).toHaveBeenCalled();
    });

    it('should use filereader for small files', async () => {
        const smallFile = new File(['a,b,c'], 'small.csv', { type: 'text/csv' });
        global.FileReader = jest.fn(() => ({
            readAsText: jest.fn(),
            result: 'test,data',
            onload: null,
            onerror: null,
          }));
        await fileUploadManager._processCsvFile(smallFile);
        expect(parseAwsCurStreaming).not.toHaveBeenCalled();
      });
  });

  describe('Deduplication and saving', () => {
    it('should save a new workload', async () => {
      const workloads = [{ id: 'res-1', service: 's1', region: 'r1', monthlyCost: 100 }];
      mockWorkloadRepository.findById.mockResolvedValue(null);

      await fileUploadManager._deduplicateAndSave(workloads, new Map(), new Set(), () => {});

      expect(mockWorkloadRepository.save).toHaveBeenCalledTimes(1);
      expect(mockWorkloadRepository.save).toHaveBeenCalledWith(expect.any(Workload));
    });

    it('should update an existing workload', async () => {
        const existingWorkload = new Workload({ id: 'res-1_s1_r1', name: 'test', service: 's1', region: 'r1', monthlyCost: 50 });
        const workloads = [{ id: 'res-1', service: 's1', region: 'r1', monthlyCost: 100 }];
        mockWorkloadRepository.findById.mockResolvedValue(existingWorkload);
  
        await fileUploadManager._deduplicateAndSave(workloads, new Map(), new Set(), () => {});
  
        expect(mockWorkloadRepository.save).toHaveBeenCalledTimes(1);
        const savedWorkload = mockWorkloadRepository.save.mock.calls[0][0];
        expect(savedWorkload.monthlyCost.amount).toBe(150);
      });
  });
});
