/**
 * UUID Generator Tests
 */

import { generateFileUUID, generateFilesUUID, generateNewUUID } from '../uuidGenerator.js';

describe('UUID Generator', () => {
  // Mock File object
  const createMockFile = (name, size, lastModified) => {
    return {
      name,
      size,
      lastModified,
      type: 'text/csv'
    };
  };

  describe('generateFileUUID', () => {
    it('should generate deterministic UUID from file metadata', async () => {
      const file = createMockFile('test.csv', 1024, 1234567890);
      const uuid1 = await generateFileUUID(file);
      const uuid2 = await generateFileUUID(file);

      expect(uuid1).toBe(uuid2); // Deterministic
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should generate different UUIDs for different files', async () => {
      const file1 = createMockFile('test1.csv', 1024, 1234567890);
      const file2 = createMockFile('test2.csv', 2048, 1234567890);
      
      const uuid1 = await generateFileUUID(file1);
      const uuid2 = await generateFileUUID(file2);

      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate different UUIDs for same file with different size', async () => {
      const file1 = createMockFile('test.csv', 1024, 1234567890);
      const file2 = createMockFile('test.csv', 2048, 1234567890);
      
      const uuid1 = await generateFileUUID(file1);
      const uuid2 = await generateFileUUID(file2);

      expect(uuid1).not.toBe(uuid2);
    });

    it('should throw error for null file', async () => {
      await expect(generateFileUUID(null)).rejects.toThrow('File is required');
    });

    it('should throw error for undefined file', async () => {
      await expect(generateFileUUID(undefined)).rejects.toThrow('File is required');
    });
  });

  describe('generateFilesUUID', () => {
    it('should generate deterministic UUID from file array', async () => {
      const files = [
        createMockFile('test1.csv', 1024, 1234567890),
        createMockFile('test2.csv', 2048, 1234567890)
      ];
      
      const uuid1 = await generateFilesUUID(files);
      const uuid2 = await generateFilesUUID(files);

      expect(uuid1).toBe(uuid2); // Deterministic
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should generate same UUID regardless of file order', async () => {
      const files1 = [
        createMockFile('test1.csv', 1024, 1234567890),
        createMockFile('test2.csv', 2048, 1234567890)
      ];
      const files2 = [
        createMockFile('test2.csv', 2048, 1234567890),
        createMockFile('test1.csv', 1024, 1234567890)
      ];
      
      const uuid1 = await generateFilesUUID(files1);
      const uuid2 = await generateFilesUUID(files2);

      expect(uuid1).toBe(uuid2); // Should be same due to sorting
    });

    it('should throw error for empty array', async () => {
      await expect(generateFilesUUID([])).rejects.toThrow('Files array is required');
    });

    it('should throw error for null', async () => {
      await expect(generateFilesUUID(null)).rejects.toThrow('Files array is required');
    });
  });

  describe('generateNewUUID', () => {
    it('should generate valid UUID format', () => {
      const uuid = generateNewUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate different UUIDs on each call', () => {
      const uuid1 = generateNewUUID();
      const uuid2 = generateNewUUID();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate UUID v4 format', () => {
      const uuid = generateNewUUID();
      // Check version 4 indicator (13th character should be '4')
      expect(uuid[14]).toBe('4');
      // Check variant (17th character should be 8, 9, a, or b)
      expect(['8', '9', 'a', 'b']).toContain(uuid[19]);
    });
  });
});
