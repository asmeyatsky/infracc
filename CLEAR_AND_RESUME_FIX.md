# CLEAR DATA AND AUTO-RESUME PDF FIX

## Status: ✅ COMPLETE

### User Requirements
1. ✅ Clear all previous data (IndexedDB, localStorage, etc.)
2. ✅ Run pipeline fresh
3. ✅ If pipeline crashes during PDF generation, reload should auto-resume PDF generation from cached data

## Changes Made

### 1. Enhanced clearAllStorage Function ✅
**File**: `src/utils/clearAllStorage.js`

- Added `crashLogs` to keys cleared (both 'crashLogs' and 'crash-logs' formats)
- Ensures complete cleanup of all stored data

### 2. Fixed Auto-Resume PDF Generation ✅
**File**: `src/components/pipeline/MigrationPipeline.js`

- Added `generatePDFReportRef` to store function reference
- Fixed auto-resume to properly call `generatePDFReport` function
- Added fallback logic if function isn't available yet
- Ensures PDF generation works on reload if pipeline completed but PDF crashed

### 3. Clear Button Already Available ✅
**File**: `src/components/pipeline/MigrationPipeline.js`

- Clear button is already in the UI (top-right corner)
- Button calls `clearAllStorageAndReload()` which:
  - Clears all IndexedDB databases
  - Clears all localStorage data
  - Clears all agent outputs
  - Clears all pipeline states
  - Reloads the page

## How It Works

### Scenario 1: Fresh Start
1. Click "🗑️ Clear All Data" button (top-right)
2. Confirm the action
3. All data is cleared and page reloads
4. Upload new file and run pipeline

### Scenario 2: Pipeline Crashes During PDF Generation
1. Pipeline runs and all 4 agents complete successfully
2. Agent outputs are saved to IndexedDB
3. PDF generation starts but crashes
4. User reloads the page
5. **Auto-resume detects:**
   - All agents are complete ✅
   - PDF format was selected ✅
   - PDF was not generated (`pdfGenerated: false`) ✅
6. **Auto-resume triggers:**
   - Loads all agent outputs from cache
   - Automatically calls `generatePDFReport` with cached data
   - Generates PDF without re-running pipeline
   - Shows success message when complete

## Auto-Resume Logic

The auto-resume logic in `MigrationPipeline.js` checks:

```javascript
if (allAgentsComplete) {
  if (savedState.outputFormat === 'pdf' && !savedState.pdfGenerated) {
    // Auto-resume PDF generation
    await generatePDFReport(agentOutputs, fileUUID);
  }
}
```

## Storage Cleared

When you click "Clear All Data", the following is cleared:

1. **IndexedDB Databases:**
   - `infracc-agent-cache` (agent outputs)
   - `WorkloadRepository` (workload data)
   - `infracc-checkpoints` (progress checkpoints)

2. **localStorage Keys:**
   - `crashLogs` / `crash-logs`
   - `checkpoints`
   - `gcp-modernization-accelerator`
   - `gcp-ma-projects`
   - `sessionId`
   - All keys starting with `agent_cache_`, `pipeline_state_`, `checkpoint_`

3. **All localforage Data:**
   - All cached agent outputs
   - All pipeline states

## Testing

### Test 1: Clear All Data
1. Run pipeline with some data
2. Click "🗑️ Clear All Data" button
3. Confirm action
4. Verify page reloads
5. Verify no cached data remains (check console logs)

### Test 2: Auto-Resume PDF
1. Run pipeline until all agents complete
2. Select PDF format
3. **Before PDF generates**, force a crash (close tab, refresh, etc.)
4. Reload the page
5. Verify:
   - Page detects all agents are complete
   - Auto-resumes PDF generation
   - PDF downloads successfully
   - No need to re-run pipeline

### Test 3: Manual PDF Generation After Reload
1. Run pipeline until all agents complete
2. Select PDF format
3. Reload page before PDF generates
4. If auto-resume doesn't trigger, you can manually click "Generate PDF" button
5. PDF should generate from cached data

## Console Logs to Watch

When auto-resuming PDF generation, you'll see:

```
[RESTORE] Found saved pipeline state for UUID: xxx
[RESTORE] Agent discovery complete
[RESTORE] Agent assessment complete
[RESTORE] Agent strategy complete
[RESTORE] Agent cost complete
[RESTORE] All agents complete! Restoring state and resuming...
[RESTORE] PDF format selected but not generated. Auto-resuming PDF generation...
[PDF] generatePDFReport: ENTERING
[PDF] Starting PDF generation process...
[PDF] PDF generation completed successfully
```

## Notes

- Auto-resume only works if **all 4 agents completed successfully**
- Auto-resume only works if **PDF format was selected** (`outputFormat: 'pdf'`)
- Auto-resume only works if **PDF was not generated** (`pdfGenerated: false` or missing)
- If any agent failed, you'll need to re-run the pipeline
- Clear button requires confirmation to prevent accidental data loss
