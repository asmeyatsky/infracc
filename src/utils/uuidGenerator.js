/**
 * UUID Generator for File/Bill Identification
 * 
 * Generates a deterministic UUID based on file content/metadata
 * to enable cache reuse for the same file
 */

/**
 * Generate a UUID from file metadata
 * Uses file name, size, and last modified date to create a deterministic ID
 * @param {File} file - The file to generate UUID for
 * @returns {Promise<string>} UUID string
 */
export async function generateFileUUID(file) {
  if (!file) {
    throw new Error('File is required to generate UUID');
  }

  // Create a deterministic identifier from file metadata
  const metadata = `${file.name}_${file.size}_${file.lastModified}`;
  
  // Use Web Crypto API to create a hash-based UUID
  const encoder = new TextEncoder();
  const data = encoder.encode(metadata);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Format as UUID v4-like string (but deterministic)
  return `${hashHex.substring(0, 8)}-${hashHex.substring(8, 12)}-${hashHex.substring(12, 16)}-${hashHex.substring(16, 20)}-${hashHex.substring(20, 32)}`;
}

/**
 * Generate a UUID from file list (for multiple files)
 * @param {File[]} files - Array of files
 * @returns {Promise<string>} UUID string
 */
export async function generateFilesUUID(files) {
  if (!files || files.length === 0) {
    throw new Error('Files array is required');
  }

  // Sort files by name for consistency
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));
  
  // Create metadata string from all files
  const metadata = sortedFiles
    .map(f => `${f.name}_${f.size}_${f.lastModified}`)
    .join('|');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(metadata);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${hashHex.substring(0, 8)}-${hashHex.substring(8, 12)}-${hashHex.substring(12, 16)}-${hashHex.substring(16, 20)}-${hashHex.substring(20, 32)}`;
}

/**
 * Generate a simple UUID v4 (for new cases)
 * @returns {string} UUID string
 */
export function generateNewUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
