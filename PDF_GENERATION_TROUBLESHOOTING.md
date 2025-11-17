# PDF Generation Troubleshooting Guide

## Current Situation
- ✅ App hasn't crashed (good!)
- ⚠️ 42 crash logs (previous crashes)
- ❌ No PDF generated yet

## Diagnostic Steps

### Step 1: Check Pipeline Status

Open browser console (F12) and run:

```javascript
// Load the diagnostic script
const script = document.createElement('script');
script.src = '/check-pipeline-status.js';
document.head.appendChild(script);

// Wait a moment, then run:
await window.checkPipelineStatus();
```

Or manually check:

```javascript
// Check agent outputs
const localforage = await import('localforage');
const keys = await localforage.keys();
const fileUUIDs = [...new Set(keys.filter(k => k.includes('_agent_output_')).map(k => k.split('_agent_output_')[0]))];
console.log('File UUIDs:', fileUUIDs);

// Check each agent
const agents = ['discovery', 'assessment', 'strategy', 'cost'];
for (const agentId of agents) {
  const key = `${fileUUIDs[0]}_agent_output_${agentId}`;
  const output = await localforage.getItem(key);
  console.log(`${agentId}:`, output ? 'COMPLETE' : 'NOT COMPLETE');
  if (agentId === 'cost' && output) {
    console.log('  Cost Estimates:', output.costEstimates?.length || 0);
  }
}
```

### Step 2: Check Crash Logs

Click the "📋 View Crash Logs" button in the top-right corner of the app, or run:

```javascript
const logs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
console.log('Total crash logs:', logs.length);
logs.slice(-10).forEach((log, i) => console.log(`${i + 1}. ${log.substring(0, 200)}`));
```

Look for:
- `[PDF]` related errors
- Stack overflow errors
- Missing cost estimates errors
- Agent completion errors

### Step 3: Check PDF Generation Logs

In browser console, look for logs starting with `[PDF]`:

```javascript
// Filter console for PDF logs (if you have console history)
// Or check persistent logs:
const logs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
const pdfLogs = logs.filter(log => typeof log === 'string' && log.includes('[PDF]'));
pdfLogs.forEach(log => console.log(log));
```

### Step 4: Verify All Agents Are Complete

PDF generation requires all 4 agents to complete:
1. ✅ **Discovery Agent** - Must have workloads
2. ✅ **Assessment Agent** - Must have results
3. ✅ **Strategy Agent** - Must have migration plans
4. ✅ **Cost Agent** - **CRITICAL**: Must have `costEstimates` array

**Most common issue**: Cost Agent completes but `costEstimates` array is missing or empty.

### Step 5: Check Cost Estimates

The PDF generator will try to regenerate cost estimates if missing, but this can fail if:
- GCP Pricing API is unavailable
- Workloads are missing from repository
- Service aggregation fails

Check cost estimates:

```javascript
const localforage = await import('localforage');
const keys = await localforage.keys();
const fileUUID = keys.find(k => k.includes('_agent_output_cost'))?.split('_agent_output_')[0];
const costOutput = await localforage.getItem(`${fileUUID}_agent_output_cost`);

console.log('Cost Output:', {
  exists: !!costOutput,
  hasCostEstimates: !!(costOutput?.costEstimates),
  costEstimatesType: Array.isArray(costOutput?.costEstimates) ? 'array' : typeof costOutput?.costEstimates,
  costEstimatesLength: costOutput?.costEstimates?.length || 0,
  costOutputKeys: costOutput ? Object.keys(costOutput) : []
});
```

## Common Issues & Solutions

### Issue 1: Cost Agent Complete But No costEstimates

**Symptoms**: Cost Agent shows complete, but `costEstimates` is missing or empty.

**Solution**: 
1. Re-run the Cost Agent manually
2. Check GCP Pricing API connection
3. Check browser console for GCP API errors

### Issue 2: PDF Generation Stuck/Freezing

**Symptoms**: "Generating PDF report..." toast appears but nothing happens.

**Possible Causes**:
- Large dataset (599K+ workloads) causing memory issues
- Stack overflow during report summary generation
- Missing data causing errors

**Solution**:
1. Check browser console for errors
2. Check crash logs for stack overflow
3. Try with smaller dataset first
4. Check if report summary generation is completing

### Issue 3: Pipeline Complete But PDF Not Triggered

**Symptoms**: All agents complete, but PDF doesn't auto-generate.

**Check**:
```javascript
// Check output format
const localforage = await import('localforage');
const keys = await localforage.keys();
const fileUUID = keys.find(k => k.includes('_pipeline_state'))?.split('_pipeline_state')[0];
const state = await localforage.getItem(`${fileUUID}_pipeline_state`);
console.log('Output Format:', state?.outputFormat); // Should be 'pdf'
```

**Solution**: Ensure output format is set to 'pdf' before pipeline completes.

### Issue 4: Workloads Missing from Repository

**Symptoms**: PDF generation fails with "No workloads found".

**Solution**:
1. Verify workloads were saved during upload
2. Check IndexedDB: Application → IndexedDB → WorkloadRepository
3. Re-upload files if needed

## Manual PDF Generation

If auto-generation fails, you can try manual generation:

1. Wait for all agents to complete
2. Look for "Generate PDF Report" button (if screen format)
3. Or trigger manually in console:

```javascript
// Get the MigrationPipeline component instance
// This is tricky - better to use the UI button if available
```

## Next Steps

1. **Run the diagnostic script** to see current state
2. **Check crash logs** for specific errors
3. **Verify Cost Agent** has costEstimates array
4. **Check browser console** for [PDF] logs
5. **If stuck**: Refresh page and re-run pipeline (agents are cached, so it should be faster)

## Expected Behavior

When PDF generation works:
1. Pipeline completes all 4 agents
2. "Generating PDF report..." toast appears
3. Console shows `[PDF]` logs progressing
4. PDF downloads automatically
5. Success message appears in DOM

If you see "Generating PDF report..." but nothing happens, check the console for where it's stuck.
