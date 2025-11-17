/**
 * Checkpoint Service
 * 
 * Saves progress checkpoints to multiple storage backends:
 * - IndexedDB (most reliable, survives crashes)
 * - localStorage (backup)
 * - Server (for remote monitoring)
 * 
 * Allows resuming from last checkpoint after crash
 */

class CheckpointService {
  constructor() {
    this.dbName = 'infracc-checkpoints';
    this.storeName = 'checkpoints';
    this.db = null;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('[CheckpointService] IndexedDB not available, using localStorage only');
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => {
        console.error('[CheckpointService] Failed to open IndexedDB:', request.error);
        resolve(); // Continue without IndexedDB
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[CheckpointService] IndexedDB initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('sessionId', 'sessionId', { unique: false });
        }
      };
    });
    
    return this.initPromise;
  }

  async saveCheckpoint(sessionId, agentId, progress, status, data = {}) {
    await this.init();
    
    const checkpoint = {
      id: `${sessionId}-${agentId}`,
      sessionId,
      agentId,
      progress,
      status,
      timestamp: new Date().toISOString(),
      data
    };

    // Save to IndexedDB (most reliable)
    if (this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        await new Promise((resolve, reject) => {
          const request = store.put(checkpoint);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        console.log(`[CheckpointService] Saved checkpoint to IndexedDB: ${agentId} @ ${progress}%`);
      } catch (err) {
        console.error('[CheckpointService] IndexedDB save failed:', err);
      }
    }

    // Save to localStorage (backup)
    try {
      const checkpoints = JSON.parse(localStorage.getItem('checkpoints') || '{}');
      checkpoints[checkpoint.id] = checkpoint;
      localStorage.setItem('checkpoints', JSON.stringify(checkpoints));
    } catch (err) {
      console.error('[CheckpointService] localStorage save failed:', err);
    }

    // Save to server (for remote monitoring)
    if (typeof window !== 'undefined' && window.saveProgressCheckpoint) {
      try {
        await window.saveProgressCheckpoint(agentId, progress, status);
      } catch (err) {
        // Best effort - don't block if server is down
      }
    }
  }

  async getLastCheckpoint(sessionId, agentId) {
    await this.init();
    
    const checkpointId = `${sessionId}-${agentId}`;

    // Try IndexedDB first
    if (this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const checkpoint = await new Promise((resolve, reject) => {
          const request = store.get(checkpointId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        if (checkpoint) {
          console.log(`[CheckpointService] Found checkpoint in IndexedDB: ${agentId} @ ${checkpoint.progress}%`);
          return checkpoint;
        }
      } catch (err) {
        console.error('[CheckpointService] IndexedDB read failed:', err);
      }
    }

    // Fallback to localStorage
    try {
      const checkpoints = JSON.parse(localStorage.getItem('checkpoints') || '{}');
      const checkpoint = checkpoints[checkpointId];
      if (checkpoint) {
        console.log(`[CheckpointService] Found checkpoint in localStorage: ${agentId} @ ${checkpoint.progress}%`);
        return checkpoint;
      }
    } catch (err) {
      console.error('[CheckpointService] localStorage read failed:', err);
    }

    return null;
  }

  async getAllCheckpoints(sessionId) {
    await this.init();
    
    const checkpoints = [];

    // Get from IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('sessionId');
        const request = index.getAll(sessionId);
        
        const results = await new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        checkpoints.push(...results);
      } catch (err) {
        console.error('[CheckpointService] IndexedDB query failed:', err);
      }
    }

    // Merge with localStorage
    try {
      const localCheckpoints = JSON.parse(localStorage.getItem('checkpoints') || '{}');
      Object.values(localCheckpoints).forEach(cp => {
        if (cp.sessionId === sessionId && !checkpoints.find(c => c.id === cp.id)) {
          checkpoints.push(cp);
        }
      });
    } catch (err) {
      // Ignore
    }

    return checkpoints.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async clearCheckpoints(sessionId) {
    await this.init();
    
    // Clear from IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('sessionId');
        const request = index.getAll();
        
        const request2 = index.openCursor();
        request2.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.value.sessionId === sessionId) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
      } catch (err) {
        console.error('[CheckpointService] IndexedDB clear failed:', err);
      }
    }

    // Clear from localStorage
    try {
      const checkpoints = JSON.parse(localStorage.getItem('checkpoints') || '{}');
      Object.keys(checkpoints).forEach(key => {
        if (checkpoints[key].sessionId === sessionId) {
          delete checkpoints[key];
        }
      });
      localStorage.setItem('checkpoints', JSON.stringify(checkpoints));
    } catch (err) {
      // Ignore
    }
  }
}

// Export singleton instance
export const checkpointService = new CheckpointService();
