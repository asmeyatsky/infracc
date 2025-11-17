# Emergency Recovery - System Frozen

## IMMEDIATE ACTIONS

### Step 1: Force Refresh Browser
1. **Close the browser tab** (or force quit if needed)
2. **Reopen the application**
3. The system should recover - agent outputs are cached in IndexedDB

### Step 2: Check What Caused the Freeze

After refreshing, check crash logs:

```javascript
// In browser console after refresh
const logs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
console.log('Total crash logs:', logs.length);

// Find the most recent crash/freeze
const recentLogs = logs.slice(-10);
recentLogs.forEach((log, i) => {
  if (log.includes('STACK') || log.includes('OVERFLOW') || log.includes('PDF') || log.includes('freeze')) {
    console.log(`⚠️ CRITICAL LOG ${i}:`, log);
  }
});
```

## Common Causes of Freezing

### 1. **Stack Overflow During PDF Generation**
- **Symptom**: System freezes when generating PDF with large datasets
- **Location**: Report summary generation or workload merging
- **Fix**: Already implemented batching, but may need more aggressive batching

### 2. **Infinite Loop in Workload Processing**
- **Symptom**: System freezes during agent execution
- **Location**: Assessment merging, cost calculation, or report generation
- **Fix**: Need to add loop guards and progress indicators

### 3. **Memory Exhaustion**
- **Symptom**: Browser tab becomes unresponsive, eventually crashes
- **Location**: Loading too many workloads into memory at once
- **Fix**: Need more aggressive memory management

### 4. **Blocking Operation**
- **Symptom**: UI freezes but console shows activity
- **Location**: Synchronous operation on large dataset
- **Fix**: Need to make operations async with yields

## Prevention Measures Needed

### 1. Add Progress Indicators
Show progress during long operations so user knows system is working.

### 2. Add Timeout Guards
Kill operations that take too long.

### 3. Add Memory Monitoring
Warn user if memory usage is too high.

### 4. Add Checkpoints
Allow resuming from last checkpoint instead of starting over.

## After Recovery

1. **Don't re-run the pipeline immediately** - check what caused the freeze first
2. **Check crash logs** to identify the exact operation that froze
3. **Try with smaller dataset** if possible
4. **Use Screen format instead of PDF** for large datasets (less memory intensive)

## Quick Diagnostic After Refresh

```javascript
// Check what was happening when it froze
const logs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
const freezeLogs = logs.filter(log => 
  typeof log === 'string' && (
    log.includes('[PDF]') || 
    log.includes('generateReportSummary') ||
    log.includes('merging') ||
    log.includes('batch')
  )
);

console.log('Operations in progress when freeze occurred:');
freezeLogs.slice(-20).forEach(log => console.log(log));
```
