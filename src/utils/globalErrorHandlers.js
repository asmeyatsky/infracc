/**
 * Global Error Handlers
 * 
 * Comprehensive error handling to prevent crashes:
 * - Unhandled promise rejections
 * - Uncaught errors
 * - React errors
 * - Memory warnings
 */

if (typeof window !== 'undefined') {
  // Store logs in localStorage as backup (survives crash)
  if (!window.persistentLog) {
    window.persistentLog = (level, ...args) => {
      try {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${args.map(a => {
          if (typeof a === 'object') {
            try {
              return JSON.stringify(a);
            } catch (e) {
              return String(a);
            }
          }
          return String(a);
        }).join(' ')}`;
        
        // Get existing logs (keep last 1000 entries for more history)
        const existingLogs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
        existingLogs.push(logEntry);
        if (existingLogs.length > 1000) {
          existingLogs.shift(); // Keep only last 1000
        }
        localStorage.setItem('crashLogs', JSON.stringify(existingLogs));
        
        // Also log to console
        if (level === 'ERROR' || level === 'CRITICAL') {
          console.error(logEntry);
        } else {
          console.log(logEntry);
        }
      } catch (e) {
        // If localStorage fails, at least try console
        try {
          console.error('Failed to write persistent log:', e);
        } catch (e2) {
          // Even console might fail, ignore
        }
      }
    };
  }
  
  const persistentLog = window.persistentLog;
  
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    const errorInfo = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      stack: event.error?.stack
    };
    
    console.error('[GLOBAL ERROR HANDLER] Unhandled error:', errorInfo);
    persistentLog('ERROR', 'Unhandled error', JSON.stringify(errorInfo));
    
    // Check for stack overflow
    if (event.error instanceof RangeError || 
        (event.message && event.message.includes('Maximum call stack size exceeded'))) {
      console.error('[GLOBAL ERROR HANDLER] STACK OVERFLOW DETECTED!');
      console.error('[GLOBAL ERROR HANDLER] Location:', event.filename, 'Line:', event.lineno);
      persistentLog('CRITICAL', 'STACK OVERFLOW', event.filename, event.lineno, event.message);
    }
    
    // Prevent default error handling (we're handling it)
    event.preventDefault();
  }, true);
  
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const errorInfo = {
      reason: event.reason,
      promise: event.promise,
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack
    };
    
    console.error('[GLOBAL ERROR HANDLER] Unhandled promise rejection:', errorInfo);
    persistentLog('ERROR', 'Unhandled promise rejection', JSON.stringify(errorInfo));
    
    // Check for stack overflow
    if (event.reason instanceof RangeError || 
        (event.reason?.message && event.reason.message.includes('Maximum call stack size exceeded'))) {
      console.error('[GLOBAL ERROR HANDLER] STACK OVERFLOW in promise!');
      persistentLog('CRITICAL', 'STACK OVERFLOW in promise', event.reason?.message);
    }
    
    // Prevent default error handling
    event.preventDefault();
  });
  
  // Memory monitoring
  let memoryCheckInterval = null;
  if (typeof performance !== 'undefined' && performance.memory) {
    memoryCheckInterval = setInterval(() => {
      try {
        const used = performance.memory.usedJSHeapSize;
        const limit = performance.memory.jsHeapSizeLimit;
        const percentUsed = (used / limit) * 100;
        
        if (percentUsed > 90) {
          console.warn(`[MEMORY WARNING] ${percentUsed.toFixed(1)}% memory used (${(used / 1024 / 1024).toFixed(1)}MB / ${(limit / 1024 / 1024).toFixed(1)}MB)`);
          persistentLog('WARNING', 'High memory usage', `${percentUsed.toFixed(1)}%`);
        }
      } catch (e) {
        // Ignore memory check errors
      }
    }, 10000); // Check every 10 seconds
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (memoryCheckInterval) {
      clearInterval(memoryCheckInterval);
    }
  });
  
  console.log('=== GLOBAL ERROR HANDLERS INSTALLED ===');
  console.log('All logs written to: Browser Console (Press F12 or Cmd+Option+I to open)');
  console.log('Crash logs also saved to: localStorage key "crashLogs"');
  console.log('To view crash logs: localStorage.getItem("crashLogs") in console');
}
