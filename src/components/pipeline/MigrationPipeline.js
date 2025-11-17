/**
 * Migration Pipeline Component
 * 
 * Unified migration flow with:
 * - File upload
 * - Output format selection (Screen/PDF)
 * - Sequential agent pipeline with progress bars
 * - Cached agent outputs
 * - Results display
 */

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import CurUploadButton from '../CurUploadButton.js';
import PipelineOrchestrator from './PipelineOrchestrator.js';
import ReportSummaryView from '../report/ReportSummaryView.js';
import { generateComprehensiveReportPDF } from '../../utils/reportPdfGenerator.js';
import { getAgentOutput, getPipelineState, savePipelineState, clearPipelineState } from '../../utils/agentCacheService.js';
import localforage from 'localforage';
import './MigrationPipeline.css';

export default function MigrationPipeline() {
  const [files, setFiles] = useState(null);
  const [outputFormat, setOutputFormat] = useState(null); // 'screen' | 'pdf' | null
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [pipelineOutputs, setPipelineOutputs] = useState(null);
  const isProcessingPDFRef = useRef(false); // Guard against duplicate PDF generation
  const pdfGeneratedRef = useRef(false); // Track PDF generation without React state
  const [fileUUID, setFileUUID] = useState(null);
  const [error, setError] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [showCrashLogs, setShowCrashLogs] = useState(false);
  const [crashLogs, setCrashLogs] = useState([]);
  const isMountedRef = useRef(true); // Track if component is mounted
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Safe state setter that checks if component is mounted
  const safeSetState = useCallback((setter, value) => {
    if (isMountedRef.current) {
      try {
        setter(value);
      } catch (e) {
        console.warn('[MigrationPipeline] Error setting state after unmount check:', e);
      }
    }
  }, []);

  // Restore pipeline state on mount
  useEffect(() => {
    const restoreState = async () => {
      try {
        setIsRestoring(true);
        
        // Try to find the most recent pipeline state
        // We'll look for any cached agent output to find active fileUUIDs
        const agentIds = ['discovery', 'assessment', 'strategy', 'cost'];
        const CACHE_PREFIX = 'agent_cache_v1';
        
        // Get all keys from localforage
        const keys = await localforage.keys();
        
        // Find the most recent fileUUID by checking pipeline state keys
        let mostRecentUUID = null;
        let mostRecentTimestamp = 0;
        
        for (const key of keys) {
          if (key.includes('_pipeline_state')) {
            const state = await localforage.getItem(key);
            if (state && state.timestamp) {
              const timestamp = new Date(state.timestamp).getTime();
              if (timestamp > mostRecentTimestamp) {
                mostRecentTimestamp = timestamp;
                mostRecentUUID = state.fileUUID;
              }
            }
          }
        }
        
        // CRITICAL FIX: Only restore state if user explicitly wants to resume
        // Don't auto-restore on page load - let user start fresh or choose to resume
        // State restoration should be manual via a "Resume" button, not automatic
        // This prevents the "No workloads found" error when starting fresh
        
        // For now, skip auto-restore. User must upload files to start fresh.
        // If they want to resume, they can use a "Resume Pipeline" button (to be added)
        console.log('[RESTORE] Skipping auto-restore. User must upload files to start fresh.');
        
        // If you want to enable auto-restore in the future, uncomment below:
        /*
        if (mostRecentUUID) {
          const savedState = await getPipelineState(mostRecentUUID);
          if (savedState) {
            console.log('[RESTORE] Found saved pipeline state for UUID:', mostRecentUUID);
            console.log('[RESTORE] Saved state:', savedState);
            
            setFileUUID(mostRecentUUID);
            
            // Restore outputFormat if it was saved
            if (savedState.outputFormat) {
              setOutputFormat(savedState.outputFormat);
            }
            
            // For files, we can't restore File objects, but we can set a placeholder
            // The PipelineOrchestrator will work with the fileUUID
            setFiles([{ name: 'restored', restored: true }]);
            
            // Restore pipeline completion status
            if (savedState.pipelineComplete) {
              setPipelineComplete(true);
            }
            
            toast.info('Pipeline state restored. Continuing from where you left off.', { autoClose: 3000 });
          }
        }
        */
      } catch (err) {
        console.error('Error restoring pipeline state:', err);
      } finally {
        setIsRestoring(false);
      }
    };
    
    restoreState();
  }, []);

  // Generate UUID when files are set
  useEffect(() => {
    if (!files || files.length === 0) {
      // Clear fileUUID when no files (always, not just when not restoring)
      setFileUUID(null);
      setPipelineComplete(false);
      setOutputFormat(null);
      return;
    }

    const generateUUID = async () => {
      try {
        // CRITICAL FIX: If files are restored placeholders, clear them and require fresh upload
        // This ensures user must upload actual files to start fresh
        if (files[0]?.restored) {
          console.log('[CLEAR] Clearing restored placeholder files. User must upload fresh files.');
          setFiles(null);
          setFileUUID(null);
          setPipelineComplete(false);
          setOutputFormat(null);
          return;
        }
        
        const { generateFileUUID, generateFilesUUID } = await import('../../utils/uuidGenerator.js');
        const uuid = files.length === 1 
          ? await generateFileUUID(files[0])
          : await generateFilesUUID(files);
        setFileUUID(uuid);
        
        // Save files info to pipeline state
        if (uuid) {
          await savePipelineState(uuid, {
            outputFormat,
            pipelineComplete,
            filesCount: files.length,
            fileNames: files.map(f => f.name)
          });
        }
      } catch (err) {
        console.error('Error generating UUID:', err);
        setError(err);
      }
    };

    generateUUID();
  }, [files, isRestoring]);

  // Removed unused handleClearState function - not used anywhere in UI

  const handleFileUpload = async (uploadResult) => {
    // CurUploadButton processes files and saves to repository
    if (uploadResult?.summary && uploadResult?.files) {
      try {
        // CRITICAL FIX: Clear any previous state when uploading new files
        // This ensures we start fresh with new files
        if (fileUUID) {
          console.log('[CLEAR] Clearing previous pipeline state for new file upload');
          await clearPipelineState(fileUUID);
        }
        
        // Get container - DO NOT CLEAR repository! CurUploadButton already saved workloads
        const container = await import('../../infrastructure/dependency_injection/Container.js').then(m => m.getContainer());
        
        // CRITICAL: Workloads are already saved by CurUploadButton, just verify they're available
        console.log('[PIPELINE] Verifying workloads are available...');
        
        // Reload from IndexedDB to ensure we have the latest persisted data
        if (typeof container.workloadRepository._loadFromStorage === 'function') {
          await container.workloadRepository._loadFromStorage();
          console.log('[PIPELINE] Reloaded from IndexedDB');
        }
        
        // Wait a moment for any pending persistence
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const workloads = await container.workloadRepository.findAll();
        console.log(`[PIPELINE] Found ${workloads.length} workloads in repository`);
        
        if (workloads.length === 0) {
          // Try one more time with a fresh container instance
          console.warn('[PIPELINE] No workloads found. Trying fresh container instance...');
          const freshContainer = await import('../../infrastructure/dependency_injection/Container.js').then(m => m.getContainer());
          
          if (typeof freshContainer.workloadRepository._loadFromStorage === 'function') {
            await freshContainer.workloadRepository._loadFromStorage();
          }
          
          const freshWorkloads = await freshContainer.workloadRepository.findAll();
          console.log(`[PIPELINE] Fresh container found ${freshWorkloads.length} workloads`);
          
          if (freshWorkloads.length === 0) {
            console.error('[PIPELINE] ERROR: No workloads found after upload!');
            console.error('[PIPELINE] Upload summary:', uploadResult.summary);
            toast.error('No workloads found after upload. Please check file format and console for errors.', { autoClose: 5000 });
            return; // Don't proceed if no workloads
          }
          
          console.log(`[PIPELINE] Successfully found ${freshWorkloads.length} workloads using fresh container`);
        } else {
          console.log(`[PIPELINE] Verified ${workloads.length} workloads ready for pipeline`);
        }
        
        // Generate UUID from actual files for cache consistency
        const { generateFileUUID, generateFilesUUID } = await import('../../utils/uuidGenerator.js');
        const uuid = uploadResult.files.length === 1 
          ? await generateFileUUID(uploadResult.files[0])
          : await generateFilesUUID(uploadResult.files);
        
        setFileUUID(uuid);
        setFiles(uploadResult.files);
        
        // Save state immediately after file upload
        await savePipelineState(uuid, {
          outputFormat: null,
          pipelineComplete: false,
          filesCount: uploadResult.files.length,
          fileNames: uploadResult.files.map(f => f.name)
        });
        
        toast.success(`Files processed successfully. Select output format to continue.`);
      } catch (err) {
        console.error('Error generating UUID from files:', err);
        // Fallback: use summary-based UUID
        try {
          const summaryKey = `${uploadResult.summary.uniqueWorkloads}_${uploadResult.summary.totalRawCost}`;
          const encoder = new TextEncoder();
          const data = encoder.encode(summaryKey);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          const uuid = `${hashHex.substring(0, 8)}-${hashHex.substring(8, 12)}-${hashHex.substring(12, 16)}-${hashHex.substring(16, 20)}-${hashHex.substring(20, 32)}`;
          setFileUUID(uuid);
          setFiles([{ name: 'processed' }]);
          
          // Save state with fallback UUID
          await savePipelineState(uuid, {
            outputFormat: null,
            pipelineComplete: false,
            filesCount: uploadResult.files.length,
            fileNames: uploadResult.files.map(f => f.name)
          });
          
          toast.success('Files processed successfully. Select output format to continue.');
        } catch (fallbackErr) {
          console.error('Error in fallback UUID generation:', fallbackErr);
          setError(fallbackErr);
        }
      }
    }
  };

  const handleOutputFormatSelect = async (format) => {
    setOutputFormat(format);
    toast.info(`Output format set to: ${format === 'screen' ? 'Screen' : 'PDF'}`);
    
    // Save outputFormat to pipeline state
    if (fileUUID) {
      await savePipelineState(fileUUID, {
        outputFormat: format,
        pipelineComplete,
        filesCount: files?.length || 0,
        fileNames: files?.map(f => f.name) || []
      });
    }
  };

  const handlePipelineComplete = async (outputs) => {
    // GUARD: Prevent duplicate processing if already handling completion
    if (isProcessingPDFRef.current) {
      if (typeof window !== 'undefined' && window.persistentLog) {
        window.persistentLog('WARN', '[MigrationPipeline] handlePipelineComplete: Already processing, ignoring duplicate call');
      }
      console.warn('[MigrationPipeline] handlePipelineComplete: Already processing, ignoring duplicate call');
      return;
    }
    
    if (typeof window !== 'undefined' && window.persistentLog) {
      window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: ENTERING');
      window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: outputs type:', typeof outputs);
      window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: hasDiscovery:', !!outputs?.discovery);
      window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: hasAssessment:', !!outputs?.assessment);
      window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: hasStrategy:', !!outputs?.strategy);
      window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: hasCost:', !!outputs?.cost);
      window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: outputFormat:', outputFormat);
    }
    console.log('[MigrationPipeline] handlePipelineComplete: ENTERING');
    // CRITICAL: Don't log entire outputs object - it contains 599K workloads and will crash browser
    console.log('[MigrationPipeline] handlePipelineComplete: outputs summary:', {
      hasDiscovery: !!outputs?.discovery,
      hasAssessment: !!outputs?.assessment,
      hasStrategy: !!outputs?.strategy,
      hasCost: !!outputs?.cost,
      discoveryWorkloads: outputs?.discovery?.workloads?.length || 0,
      assessmentResults: outputs?.assessment?.results?.length || 0
    });
    
    try {
      // CRITICAL: For PDF format, defer state updates until AFTER PDF generation
      // This prevents React from trying to re-render with massive state objects
      if (outputFormat === 'pdf') {
        // Set guard flag to prevent duplicate processing
        isProcessingPDFRef.current = true;
        if (typeof window !== 'undefined' && window.persistentLog) {
          window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: PDF format - deferring state updates');
        }
        console.log('[MigrationPipeline] handlePipelineComplete: PDF format - deferring state updates until after PDF generation');
        
        // Generate PDF FIRST before updating state
        // This prevents React re-render with massive objects
        try {
          if (typeof window !== 'undefined' && window.persistentLog) {
            window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: PDF format selected, about to generate PDF...');
          }
          console.log('[PDF] PDF format selected, auto-generating PDF...');
          
          if (typeof window !== 'undefined' && window.persistentLog) {
            window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: Calling generatePDFReport...');
          }
          await generatePDFReport(outputs);
          
          if (typeof window !== 'undefined' && window.persistentLog) {
            window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: PDF generation completed successfully');
          }
          console.log('[PDF] Auto-generation completed');
          
          // CRITICAL ARCHITECTURE CHANGE: For PDF format, completely avoid React state updates
          // Store completion in ref only - this prevents ANY React re-renders that could crash
          pdfGeneratedRef.current = true;
          
          if (typeof window !== 'undefined' && window.persistentLog) {
            window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: PDF complete - stored in ref (no React state update)');
          }
          console.log('[MigrationPipeline] PDF generation complete - stored in ref, avoiding React state update');
          
          // CRITICAL: Do NOT call setPipelineComplete - it triggers React re-render which crashes
          // Instead, use DOM manipulation to show success message without React state
          pdfGeneratedRef.current = true;
          
          // Use setTimeout to defer DOM manipulation to next tick, avoiding synchronous crash
          setTimeout(() => {
            try {
              // Direct DOM manipulation to show success message - bypasses React entirely
              const successDiv = document.createElement('div');
              successDiv.className = 'alert alert-success text-center mt-3 mb-3';
              successDiv.style.cssText = 'margin: 1rem 0; padding: 1rem;';
              successDiv.innerHTML = `
                <h4>✅ PDF Report Generated Successfully!</h4>
                <p class="mb-0">Your migration assessment PDF has been downloaded.</p>
                <p class="text-muted mt-2 mb-0">
                  <small>Report contains all workloads analyzed across all migration phases.</small>
                </p>
              `;
              
              // Find the pipeline container and append success message
              const pipelineContainer = document.querySelector('.migration-pipeline');
              if (pipelineContainer) {
                // Remove any existing success message
                const existing = pipelineContainer.querySelector('.pdf-success-message');
                if (existing) existing.remove();
                
                successDiv.classList.add('pdf-success-message');
                // Insert after PipelineOrchestrator or at the end
                const orchestrator = pipelineContainer.querySelector('.pipeline-orchestrator') || 
                                   pipelineContainer.querySelector('[class*="orchestrator"]');
                if (orchestrator && orchestrator.nextSibling) {
                  pipelineContainer.insertBefore(successDiv, orchestrator.nextSibling);
                } else {
                  pipelineContainer.appendChild(successDiv);
                }
              }
              
              // Show toast - minimal message only
              try {
                toast.success('PDF downloaded!', { 
                  autoClose: 3000,
                  position: 'top-center'
                });
              } catch (toastErr) {
                // Ignore toast errors
              }
            } catch (domErr) {
              // If DOM manipulation fails, just log - don't crash
              console.log('[MigrationPipeline] PDF generated successfully (DOM update failed)');
            }
          }, 100);
          
          // CRITICAL: Do NOT call setPipelineComplete or setPipelineOutputs
          // This completely avoids React re-renders that cause browser crashes
          // The PDF is already downloaded, so we don't need React state at all
          
        } catch (err) {
          // Reset guard flag on error
          isProcessingPDFRef.current = false;
          if (typeof window !== 'undefined' && window.persistentLog) {
            window.persistentLog('ERROR', '[MigrationPipeline] handlePipelineComplete: PDF generation error:', err.message);
            window.persistentLog('ERROR', '[MigrationPipeline] handlePipelineComplete: PDF error stack:', err.stack);
          }
          console.error('[PDF] Error auto-generating PDF:', err);
          throw err;
        }
        
        // CRITICAL: Don't save pipeline state for PDF format - it might trigger serialization issues
        // The PDF is already generated and downloaded, we don't need to persist state
        // This avoids any potential crashes from trying to serialize large objects
        
        if (typeof window !== 'undefined' && window.persistentLog) {
          window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: COMPLETED SUCCESSFULLY (PDF)');
        }
        console.log('[MigrationPipeline] handlePipelineComplete: COMPLETED SUCCESSFULLY (PDF)');
        
        // Reset guard flag after completion
        isProcessingPDFRef.current = false;
        return; // Exit early for PDF format
      }
      
      // For screen format, update state normally (with safety checks)
      if (isMountedRef.current) {
        try {
          setPipelineComplete(true);
          if (typeof window !== 'undefined' && window.persistentLog) {
            window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: setPipelineComplete(true) called');
          }
          console.log('[MigrationPipeline] handlePipelineComplete: setPipelineComplete(true)');
          
          // CRITICAL: Only set outputs if component is still mounted
          // For very large datasets, this could cause memory issues
          const workloadCount = outputs?.discovery?.workloads?.length || 0;
          if (workloadCount > 100000) {
            console.warn(`[MigrationPipeline] Large dataset (${workloadCount} workloads) - limiting outputs for safety`);
            // Create a limited version of outputs for state
            const limitedOutputs = {
              ...outputs,
              discovery: {
                ...outputs.discovery,
                workloads: outputs.discovery.workloads.slice(0, 100000) // Limit to 100K
              }
            };
            setPipelineOutputs(limitedOutputs);
          } else {
            setPipelineOutputs(outputs);
          }
          
          if (typeof window !== 'undefined' && window.persistentLog) {
            window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: setPipelineOutputs called');
          }
          console.log('[MigrationPipeline] handlePipelineComplete: setPipelineOutputs called');
        } catch (stateError) {
          console.error('[MigrationPipeline] Error setting state:', stateError);
          if (typeof window !== 'undefined' && window.persistentLog) {
            window.persistentLog('ERROR', '[MigrationPipeline] Error setting state:', stateError.message);
          }
        }
      } else {
        console.warn('[MigrationPipeline] Component unmounted, skipping state update');
      }
      
      // Save completion status to pipeline state
      if (fileUUID) {
        if (typeof window !== 'undefined' && window.persistentLog) {
          window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: About to save pipeline state...');
        }
        console.log('[MigrationPipeline] handlePipelineComplete: About to save pipeline state...');
        try {
          await savePipelineState(fileUUID, {
            outputFormat,
            pipelineComplete: true,
            filesCount: files?.length || 0,
            fileNames: files?.map(f => f.name) || []
          });
          if (typeof window !== 'undefined' && window.persistentLog) {
            window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: Pipeline state saved');
          }
          console.log('[MigrationPipeline] handlePipelineComplete: Pipeline state saved');
        } catch (saveErr) {
          if (typeof window !== 'undefined' && window.persistentLog) {
            window.persistentLog('ERROR', '[MigrationPipeline] handlePipelineComplete: Error saving state:', saveErr.message);
          }
          console.error('[MigrationPipeline] handlePipelineComplete: Error saving state:', saveErr);
          // Don't throw - continue even if state save fails
        }
      }
      
      // Screen format path - PDF format already handled above with early return
      
      if (typeof window !== 'undefined' && window.persistentLog) {
        window.persistentLog('INFO', '[MigrationPipeline] handlePipelineComplete: COMPLETED SUCCESSFULLY');
      }
      console.log('[MigrationPipeline] handlePipelineComplete: COMPLETED SUCCESSFULLY');
    } catch (error) {
      if (typeof window !== 'undefined' && window.persistentLog) {
        window.persistentLog('CRITICAL', '[MigrationPipeline] handlePipelineComplete: UNHANDLED ERROR:', error.message);
        window.persistentLog('CRITICAL', '[MigrationPipeline] handlePipelineComplete: Error stack:', error.stack);
      }
      console.error('[MigrationPipeline] handlePipelineComplete: UNHANDLED ERROR:', error);
      console.error('[MigrationPipeline] handlePipelineComplete: Error name:', error?.name);
      console.error('[MigrationPipeline] handlePipelineComplete: Error message:', error?.message);
      console.error('[MigrationPipeline] handlePipelineComplete: Error stack:', error?.stack);
      
      // Check for stack overflow
      if (error instanceof RangeError || (error?.message && error.message.includes('Maximum call stack size exceeded'))) {
        if (typeof window !== 'undefined' && window.persistentLog) {
          window.persistentLog('CRITICAL', '[MigrationPipeline] handlePipelineComplete: STACK OVERFLOW!');
        }
        console.error('[MigrationPipeline] handlePipelineComplete: STACK OVERFLOW DETECTED!');
        toast.error('Pipeline completion failed due to stack overflow. Check crash logs for details.', { autoClose: 15000 });
      } else {
        toast.error(`Pipeline completion failed: ${error.message}`, { autoClose: 10000 });
      }
      
      // Re-throw to let error boundary catch it
      throw error;
    }
  };

  const handlePipelineError = (err, agentId) => {
    console.error(`Pipeline error in ${agentId}:`, err);
    setError(err);
    toast.error(`${agentId} failed: ${err.message}`);
  };

  const handleViewCrashLogs = () => {
    try {
      const logs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
      setCrashLogs(logs);
      setShowCrashLogs(true);
    } catch (err) {
      console.error('Error reading crash logs:', err);
      toast.error('Failed to read crash logs');
    }
  };

  const handleClearCrashLogs = () => {
    try {
      localStorage.removeItem('crashLogs');
      setCrashLogs([]);
      setShowCrashLogs(false);
      toast.success('Crash logs cleared');
    } catch (err) {
      console.error('Error clearing crash logs:', err);
      toast.error('Failed to clear crash logs');
    }
  };

  const generatePDFReport = async (outputs) => {
    if (typeof window !== 'undefined' && window.persistentLog) {
      window.persistentLog('INFO', '[PDF] generatePDFReport: ENTERING');
      window.persistentLog('INFO', '[PDF] generatePDFReport: hasOutputs:', !!outputs);
      window.persistentLog('INFO', '[PDF] generatePDFReport: hasFileUUID:', !!fileUUID);
      window.persistentLog('INFO', '[PDF] generatePDFReport: hasDiscovery:', !!outputs?.discovery);
      window.persistentLog('INFO', '[PDF] generatePDFReport: hasAssessment:', !!outputs?.assessment);
      window.persistentLog('INFO', '[PDF] generatePDFReport: hasStrategy:', !!outputs?.strategy);
      window.persistentLog('INFO', '[PDF] generatePDFReport: hasCost:', !!outputs?.cost);
    }
    console.log('[PDF] generatePDFReport called:', {
      hasOutputs: !!outputs,
      hasFileUUID: !!fileUUID,
      fileUUID: fileUUID,
      hasDiscovery: !!outputs?.discovery,
      hasAssessment: !!outputs?.assessment,
      hasStrategy: !!outputs?.strategy,
      hasCost: !!outputs?.cost
    });
    
    if (!outputs || !fileUUID) {
      const errorMsg = `Missing outputs or file UUID for PDF generation. outputs: ${!!outputs}, fileUUID: ${!!fileUUID}`;
      if (typeof window !== 'undefined' && window.persistentLog) {
        window.persistentLog('ERROR', '[PDF] generatePDFReport: Missing inputs:', errorMsg);
      }
      console.error('[PDF]', errorMsg);
      throw new Error(errorMsg);
    }

    if (typeof window !== 'undefined' && window.persistentLog) {
      window.persistentLog('INFO', '[PDF] generatePDFReport: Starting PDF generation process...');
    }
    console.log('[PDF] Starting PDF generation process...');
    toast.info('Generating PDF report...', { autoClose: 2000 });

    // SAFETY: Wrap entire PDF generation in stack overflow protection
    try {
      // Get all cached outputs
      const discoveryOutput = outputs.discovery || await getAgentOutput(fileUUID, 'discovery');
      const assessmentOutput = outputs.assessment || await getAgentOutput(fileUUID, 'assessment');
      const strategyOutput = outputs.strategy || await getAgentOutput(fileUUID, 'strategy');
      let costOutput = outputs.cost || await getAgentOutput(fileUUID, 'cost');
      
      // CRITICAL: Validate that cost estimates are available
      // Cost estimates are REQUIRED for PDF generation
      console.log('[PDF] Validating cost output:', {
        hasCostOutput: !!costOutput,
        costOutputKeys: costOutput ? Object.keys(costOutput) : [],
        hasCostEstimates: !!(costOutput?.costEstimates),
        costEstimatesType: Array.isArray(costOutput?.costEstimates) ? 'array' : typeof costOutput?.costEstimates,
        costEstimatesLength: costOutput?.costEstimates?.length || 0
      });
      
      if (!costOutput) {
        const errorMsg = 'Cost Agent output is missing. The Cost Agent must complete before generating the PDF report.';
        console.error('[PDF]', errorMsg);
        toast.error(errorMsg, { autoClose: 10000 });
        throw new Error(errorMsg);
      }
      
      // CRITICAL: If costEstimates are missing, regenerate them (for backward compatibility)
      if (!costOutput.costEstimates || !Array.isArray(costOutput.costEstimates) || costOutput.costEstimates.length === 0) {
        console.log('[PDF] Cost estimates missing from cache, regenerating...');
        toast.info('Regenerating cost estimates for PDF...', { autoClose: 3000 });
        
        try {
          // Import required services
          const { GCPCostEstimator } = await import('../../domain/services/GCPCostEstimator.js');
          const { ReportDataAggregator } = await import('../../domain/services/ReportDataAggregator.js');
          
          // CRITICAL: Load actual Workload entities from repository (not plain objects from discovery output)
          // The discovery output contains plain objects, but we need Workload entities with proper cost data
          const container = await import('../../infrastructure/dependency_injection/Container.js').then(m => m.getContainer());
          
          // Reload from IndexedDB to ensure we have the latest data
          if (typeof container.workloadRepository._loadFromStorage === 'function') {
            await container.workloadRepository._loadFromStorage();
          }
          
          // Get actual Workload entities from repository
          let workloads = await container.workloadRepository.findAll();
          
          console.log('[PDF] Regenerating cost estimates - loaded workloads:', {
            count: workloads.length,
            fromDiscovery: discoveryOutput?.workloads?.length || 0,
            usingRepository: workloads.length > 0
          });
          
          // Fallback to discovery output if repository is empty
          if (workloads.length === 0) {
            console.warn('[PDF] No workloads in repository, falling back to discovery output');
            workloads = discoveryOutput?.workloads || [];
          }
          
          if (workloads.length === 0) {
            throw new Error('No workloads found. Cannot generate cost estimates without workloads.');
          }
          
          // Aggregate services from workloads
          // aggregateByService returns an array directly, not an object with topServices
          const serviceAggregation = ReportDataAggregator.aggregateByService(workloads);
          
          console.log('[PDF] Service aggregation result:', {
            serviceCount: serviceAggregation.length,
            sampleServices: serviceAggregation.slice(0, 5).map(s => ({
              service: s.service,
              totalCost: s.totalCost,
              count: s.count
            }))
          });
          
          if (!serviceAggregation || serviceAggregation.length === 0) {
            throw new Error('No services found after aggregation. Cannot generate cost estimates.');
          }
          
          // Generate cost estimates for each service
          const costEstimates = await GCPCostEstimator.estimateAllServiceCosts(
            serviceAggregation, // Pass the array directly
            'us-central1' // target region
          );
          
          console.log('[PDF] Generated cost estimates:', {
            count: costEstimates.length,
            sampleEstimate: costEstimates[0] ? {
              service: costEstimates[0].service,
              hasCostEstimate: !!costEstimates[0].costEstimate,
              awsCost: costEstimates[0].costEstimate?.awsCost
            } : null
          });
          
          if (!costEstimates || costEstimates.length === 0) {
            throw new Error('Cost estimation returned empty array. This may indicate an issue with the GCP pricing API or service mapping.');
          }
          
          // Update cost output with regenerated costEstimates
          costOutput = {
            ...costOutput,
            costEstimates,
            timestamp: new Date().toISOString()
          };
          
          // Save updated output back to cache
          const { saveAgentOutput } = await import('../../utils/agentCacheService.js');
          await saveAgentOutput(fileUUID, 'cost', costOutput);
          
          console.log('[PDF] Successfully regenerated and saved cost estimates:', {
            count: costEstimates.length
          });
        } catch (regenerationError) {
          console.error('[PDF] Failed to regenerate cost estimates:', regenerationError);
          const errorMsg = `Failed to generate cost estimates: ${regenerationError.message}. Please ensure the Cost Agent completes successfully.`;
          toast.error(errorMsg, { autoClose: 10000 });
          throw new Error(errorMsg);
        }
      }
      
      // Final validation
      if (!costOutput.costEstimates || !Array.isArray(costOutput.costEstimates)) {
        const errorMsg = `Cost estimates must be an array, but got ${typeof costOutput.costEstimates}. Cost Agent output may be corrupted.`;
        console.error('[PDF]', errorMsg, { costEstimates: costOutput.costEstimates });
        toast.error(errorMsg, { autoClose: 10000 });
        throw new Error(errorMsg);
      }
      
      if (costOutput.costEstimates.length === 0) {
        const errorMsg = 'Cost estimates array is empty. The Cost Agent must generate cost estimates before generating the PDF report.';
        console.error('[PDF]', errorMsg);
        toast.error(errorMsg, { autoClose: 10000 });
        throw new Error(errorMsg);
      }
      
      console.log('[PDF] Cost estimates validated successfully:', {
        count: costOutput.costEstimates.length,
        sampleEstimate: costOutput.costEstimates[0] ? {
          service: costOutput.costEstimates[0].service,
          hasCostEstimate: !!costOutput.costEstimates[0].costEstimate,
          awsCost: costOutput.costEstimates[0].costEstimate?.awsCost,
          gcpOnDemand: costOutput.costEstimates[0].costEstimate?.gcpOnDemand
        } : null
      });

      // CRITICAL: Load actual Workload entities from repository (not plain objects from discovery output)
      // The discovery output contains plain objects, but we need Workload entities with proper cost data
      const container = await import('../../infrastructure/dependency_injection/Container.js').then(m => m.getContainer());
      
      // Reload from IndexedDB to ensure we have the latest data
      if (typeof container.workloadRepository._loadFromStorage === 'function') {
        await container.workloadRepository._loadFromStorage();
      }
      
      // Get actual Workload entities from repository
      let workloads = await container.workloadRepository.findAll();
      
      console.log('[PDF] Loaded workloads from repository:', {
        count: workloads.length,
        sampleWorkload: workloads[0] ? {
          id: workloads[0].id,
          hasToJSON: typeof workloads[0].toJSON === 'function',
          monthlyCost: workloads[0].toJSON ? workloads[0].toJSON().monthlyCost : 'N/A',
          isWorkloadEntity: workloads[0] instanceof (await import('../../domain/entities/Workload.js').then(m => m.Workload))
        } : null
      });
      
      if (workloads.length === 0) {
        console.warn('[PDF] No workloads found in repository, falling back to discovery output');
        workloads = discoveryOutput?.workloads || [];
      }
      
      // CRITICAL DEBUG: Log what we got from cache
      console.log('[PDF DEBUG] Assessment output from cache:', {
        hasAssessmentOutput: !!assessmentOutput,
        hasResults: !!assessmentOutput?.results,
        resultsLength: assessmentOutput?.results?.length || 0,
        resultsType: Array.isArray(assessmentOutput?.results) ? 'array' : typeof assessmentOutput?.results,
        firstResult: assessmentOutput?.results?.[0] ? {
          hasError: !!assessmentOutput.results[0].error,
          workloadId: assessmentOutput.results[0].workloadId,
          hasComplexityScore: assessmentOutput.results[0].complexityScore !== undefined,
          complexityScore: assessmentOutput.results[0].complexityScore,
          hasReadinessScore: assessmentOutput.results[0].readinessScore !== undefined,
          readinessScore: assessmentOutput.results[0].readinessScore,
          keys: Object.keys(assessmentOutput.results[0] || {})
        } : null
      });
      
      // Merge assessment results into workloads
      if (assessmentOutput?.results && Array.isArray(assessmentOutput.results)) {
        const assessmentMap = new Map();
        let assessmentsWithComplexity = 0;
        let assessmentsWithoutComplexity = 0;
        
        // Build assessment map
        // SAFETY: Batch forEach to avoid stack overflow with large datasets
        const ASSESSMENT_BATCH_SIZE = 10000;
        for (let i = 0; i < assessmentOutput.results.length; i += ASSESSMENT_BATCH_SIZE) {
          const batch = assessmentOutput.results.slice(i, Math.min(i + ASSESSMENT_BATCH_SIZE, assessmentOutput.results.length));
          for (const assessment of batch) {
            if (assessment && !assessment.error) {
              const assessmentObj = assessment.toJSON ? assessment.toJSON() : assessment;
            // Try multiple ways to get workloadId
            const workloadId = assessment.workloadId || 
                              assessmentObj.workloadId || 
                              assessment._workloadId ||
                              assessmentObj._workloadId;
            
            if (!workloadId) {
              console.warn('[PDF DEBUG] Assessment missing workloadId:', {
                assessmentKeys: Object.keys(assessment || {}),
                assessmentObjKeys: Object.keys(assessmentObj || {})
              });
              return;
            }
            
            // Check if this assessment has complexity score
            const hasComplexity = assessmentObj.complexityScore !== undefined && assessmentObj.complexityScore !== null ||
                                 assessment.complexityScore !== undefined && assessment.complexityScore !== null ||
                                 assessmentObj.infrastructureAssessment?.complexityScore !== undefined;
            
            if (hasComplexity) {
              assessmentsWithComplexity++;
            } else {
              assessmentsWithoutComplexity++;
              // Log first few without complexity for debugging
              if (assessmentsWithoutComplexity <= 3) {
                console.warn(`[PDF DEBUG] Assessment without complexity (${assessmentsWithoutComplexity}):`, {
                  workloadId,
                  assessmentObjKeys: Object.keys(assessmentObj),
                  hasToJSON: typeof assessment.toJSON === 'function',
                  infrastructureAssessment: assessmentObj.infrastructureAssessment ? Object.keys(assessmentObj.infrastructureAssessment) : null
                });
              }
            }
            
            // Store in map with workloadId as key
            assessmentMap.set(workloadId, assessment);
          }
        }
      }
        
        console.log(`[PDF DEBUG] Assessment map: ${assessmentMap.size} assessments, ${assessmentsWithComplexity} with complexity, ${assessmentsWithoutComplexity} without`);
        
        // Debug: Log sample workload IDs and assessment workloadIds to see if they match
        if (workloads.length > 0 && assessmentMap.size > 0) {
          const sampleWorkload = workloads[0];
          const workloadData = sampleWorkload.toJSON ? sampleWorkload.toJSON() : sampleWorkload;
          const sampleAssessment = Array.from(assessmentMap.values())[0];
          const assessmentObj = sampleAssessment.toJSON ? sampleAssessment.toJSON() : sampleAssessment;
          const sampleAssessmentKey = Array.from(assessmentMap.keys())[0];
          
          // Try all possible ID sources
          const workloadIdFromGetter = sampleWorkload.id;
          const workloadIdFromData = workloadData.id;
          const workloadIdFromPrivate = workloadData._id || sampleWorkload._id;
          const workloadArn = workloadData.arn || workloadData.resourceId || workloadData.name;
          
          console.log('[PDF DEBUG] Sample ID comparison:', {
            // Workload ID sources
            workloadIdFromGetter: workloadIdFromGetter,
            workloadIdFromData: workloadIdFromData,
            workloadIdFromPrivate: workloadIdFromPrivate,
            workloadArn: workloadArn,
            workloadDataKeys: Object.keys(workloadData),
            // Assessment ID
            assessmentWorkloadId: assessmentObj.workloadId || sampleAssessment.workloadId,
            assessmentWorkloadIdType: typeof (assessmentObj.workloadId || sampleAssessment.workloadId),
            sampleMapKey: sampleAssessmentKey,
            // Matching attempts
            matchByGetter: workloadIdFromGetter === (assessmentObj.workloadId || sampleAssessment.workloadId),
            matchByData: workloadIdFromData === (assessmentObj.workloadId || sampleAssessment.workloadId),
            matchByArn: workloadArn === (assessmentObj.workloadId || sampleAssessment.workloadId),
            inMapByGetter: workloadIdFromGetter ? assessmentMap.has(workloadIdFromGetter) : false,
            inMapByData: workloadIdFromData ? assessmentMap.has(workloadIdFromData) : false,
            inMapByArn: workloadArn ? assessmentMap.has(workloadArn) : false
          });
        }
        
        // Merge assessments into workloads
        let mergedCount = 0;
        let mergedWithComplexity = 0;
        let mergedWithoutComplexity = 0;
        let notFoundInMap = 0;
        
        // FIX: Process workloads in batches to avoid stack overflow with very large datasets (599K+ workloads)
        // Map operation on 599K workloads can exceed call stack
        const BATCH_SIZE = 10000; // Process 10K workloads at a time
        const mappedWorkloads = [];
        
        for (let i = 0; i < workloads.length; i += BATCH_SIZE) {
          const batch = workloads.slice(i, Math.min(i + BATCH_SIZE, workloads.length));
          const batchMapped = batch.map(workload => {
          // CRITICAL: Get workload data, but prioritize entity getters over serialized data
          // If it's a Workload entity, use the getter; otherwise use serialized data
          const workloadData = workload.toJSON ? workload.toJSON() : workload;
          
          // CRITICAL: Try multiple ways to get workload ID
          // Priority: 1) Entity getter (workload.id), 2) Serialized id, 3) Private _id, 4) Other properties
          // The assessment workloadId is an ARN, so the workload.id might also be the ARN
          const workloadId = (workload && typeof workload.id !== 'undefined') ? workload.id :  // Entity getter (most reliable)
                            workloadData?.id ||                                                // From toJSON()
                            (workload && workload._id) ? workload._id :                        // Direct private property
                            workloadData?._id ||                                               // Private property from serialized
                            workloadData?.resourceId ||                                        // Alternative ID property
                            workloadData?.arn ||                                               // ARN might be the ID
                            workloadData?.name ||                                              // Sometimes name is the ID
                            null;
          
          // Try to find assessment by workloadId
          // The assessment map uses assessment.workloadId as the key (which is an ARN)
          // We need to match workload.id (which might also be the ARN) with assessment.workloadId
          let assessment = null;
          
          if (workloadId) {
            // First try direct map lookup
            assessment = assessmentMap.get(workloadId);
            
            // If not found, try string comparison with all map keys
            if (!assessment) {
              for (const [key, value] of assessmentMap.entries()) {
                if (String(key) === String(workloadId) || key === workloadId) {
                  assessment = value;
                  break;
                }
              }
            }
          }
          
          // If still not found, try matching by iterating through assessments and comparing workloadIds
          // This handles cases where the workload.id format doesn't exactly match the assessment.workloadId format
          if (!assessment) {
            for (const [mapKey, assessmentValue] of assessmentMap.entries()) {
              const assessmentObj = assessmentValue.toJSON ? assessmentValue.toJSON() : assessmentValue;
              const assessmentWorkloadId = assessmentObj.workloadId || assessmentValue.workloadId;
              
              // Try all possible workload ID formats against the assessment workloadId
              const idsToTry = [
                workloadId,
                workload?.id,
                workloadData?.id,
                workload?._id,
                workloadData?._id,
                workloadData?.resourceId,
                workloadData?.arn,
                workloadData?.name
              ].filter(Boolean); // Remove undefined/null values
              
              for (const tryId of idsToTry) {
                if (String(assessmentWorkloadId) === String(tryId) || assessmentWorkloadId === tryId) {
                  assessment = assessmentValue;
                  break;
                }
                
                // Try substring matching (in case one is a full ARN and the other is a partial ID)
                if (assessmentWorkloadId && tryId) {
                  const assessmentStr = String(assessmentWorkloadId);
                  const tryStr = String(tryId);
                  if (assessmentStr.includes(tryStr) || tryStr.includes(assessmentStr)) {
                    assessment = assessmentValue;
                    break;
                  }
                }
              }
              
              if (assessment) break;
            }
          }
          
          if (assessment) {
            mergedCount++;
            const assessmentObj = assessment.toJSON ? assessment.toJSON() : assessment;
            
            // Debug first few merges
            if (mergedCount <= 3) {
              console.log(`[PDF DEBUG] Merging assessment ${mergedCount}:`, {
                workloadId,
                assessmentWorkloadId: assessmentObj.workloadId || assessment.workloadId,
                hasComplexity: assessmentObj.complexityScore !== undefined
              });
            }
            
            // Extract complexity and readiness scores - try multiple locations
            let complexityScore = null;
            
            // Try in order of preference
            if (assessmentObj.complexityScore !== undefined && assessmentObj.complexityScore !== null) {
              complexityScore = parseFloat(assessmentObj.complexityScore);
            } else if (assessment.complexityScore !== undefined && assessment.complexityScore !== null) {
              complexityScore = parseFloat(assessment.complexityScore);
            } else if (assessmentObj.infrastructureAssessment?.complexityScore !== undefined && 
                      assessmentObj.infrastructureAssessment.complexityScore !== null) {
              complexityScore = parseFloat(assessmentObj.infrastructureAssessment.complexityScore);
            } else if (assessment.infrastructureAssessment?.complexityScore !== undefined && 
                      assessment.infrastructureAssessment.complexityScore !== null) {
              complexityScore = parseFloat(assessment.infrastructureAssessment.complexityScore);
            }
            
            if (complexityScore !== null && !isNaN(complexityScore) && complexityScore >= 1 && complexityScore <= 10) {
              mergedWithComplexity++;
            } else {
              mergedWithoutComplexity++;
              // Log first few without complexity
              if (mergedWithoutComplexity <= 3) {
                console.warn(`[PDF DEBUG] Merged workload without valid complexity:`, {
                  workloadId: workloadData.id,
                  complexityScore,
                  assessmentObjKeys: Object.keys(assessmentObj),
                  infrastructureAssessmentKeys: assessmentObj.infrastructureAssessment ? Object.keys(assessmentObj.infrastructureAssessment) : null
                });
              }
            }
            
            let readinessScore = null;
            if (assessment && typeof assessment.getReadinessScore === 'function') {
              readinessScore = assessment.getReadinessScore();
            } else if (assessmentObj.readinessScore !== undefined && assessmentObj.readinessScore !== null) {
              readinessScore = parseFloat(assessmentObj.readinessScore);
            } else if (complexityScore !== null && complexityScore !== undefined && !isNaN(complexityScore)) {
              // Calculate readiness from complexity
              const riskFactors = assessmentObj.riskFactors || assessment.riskFactors || [];
              const riskCount = Array.isArray(riskFactors) ? riskFactors.length : 0;
              let score = 100;
              score -= (complexityScore - 1) * 5;
              score -= riskCount * 10;
              if (assessmentObj.infrastructureAssessment && assessmentObj.applicationAssessment) {
                score += 10;
              }
              readinessScore = Math.max(0, Math.min(100, Math.round(score)));
            }
            
            return {
              ...workloadData,
              assessment: {
                complexityScore: complexityScore,
                readinessScore: readinessScore,
                riskFactors: assessmentObj.riskFactors || assessment.riskFactors || [],
                infrastructureAssessment: assessmentObj.infrastructureAssessment || assessment.infrastructureAssessment,
                applicationAssessment: assessmentObj.applicationAssessment || assessment.applicationAssessment
              }
            };
          } else {
            notFoundInMap++;
            // Log first few not found for debugging
            if (notFoundInMap <= 3) {
              console.warn(`[PDF DEBUG] Workload not found in assessment map (${notFoundInMap}):`, {
                workloadId,
                workloadIdType: typeof workloadId,
                assessmentMapSize: assessmentMap.size,
                sampleMapKeys: Array.from(assessmentMap.keys()).slice(0, 3)
              });
            }
          }
          
          return workloadData;
          });
          
          // Add batch results to mapped workloads
          for (const mapped of batchMapped) {
            mappedWorkloads.push(mapped);
          }
          
          // Log progress for large datasets
          if (workloads.length > 50000 && (i + BATCH_SIZE) % 50000 === 0) {
            const percent = ((i + BATCH_SIZE) / workloads.length * 100).toFixed(1);
            console.log(`[PDF] Merging assessments: ${Math.min(i + BATCH_SIZE, workloads.length)}/${workloads.length} (${percent}%)`);
          }
        }
        
        workloads = mappedWorkloads;
        
        console.log(`[PDF] Merged ${mergedCount} assessments with ${workloads.length} workloads`);
        console.log(`[PDF] Merged with complexity: ${mergedWithComplexity}, without: ${mergedWithoutComplexity}, not found in map: ${notFoundInMap}`);
      }
      
      // CRITICAL DEBUG: Check workloads before generating report
      console.log('[PDF] Checking workloads before report generation:', {
        workloadCount: workloads.length,
        sampleWorkloads: workloads.slice(0, 3).map(w => {
          const data = w.toJSON ? w.toJSON() : w;
          return {
            id: data.id,
            monthlyCost: data.monthlyCost,
            monthlyCostType: typeof data.monthlyCost
          };
        })
      });
      
      // Generate report data with merged workloads
      if (typeof window !== 'undefined' && window.persistentLog) {
        window.persistentLog('INFO', '[PDF] generatePDFReport: About to call ReportDataAggregator.generateReportSummary...');
        window.persistentLog('INFO', '[PDF] generatePDFReport: Workloads count for report:', workloads.length);
      }
      console.log('[PDF] About to generate report summary from', workloads.length, 'workloads...');
      
      let reportData;
      try {
        reportData = await import('../../domain/services/ReportDataAggregator.js').then(m => 
          m.ReportDataAggregator.generateReportSummary(workloads)
        );
        
        if (typeof window !== 'undefined' && window.persistentLog) {
          window.persistentLog('INFO', '[PDF] generatePDFReport: Report summary generated successfully');
          window.persistentLog('INFO', '[PDF] generatePDFReport: totalWorkloads:', reportData?.summary?.totalWorkloads);
          window.persistentLog('INFO', '[PDF] generatePDFReport: totalMonthlyCost:', reportData?.summary?.totalMonthlyCost);
        }
        
        // CRITICAL DEBUG: Verify report data has costs
        console.log('[PDF] Report data after generation:', {
          totalMonthlyCost: reportData?.summary?.totalMonthlyCost,
          totalMonthlyCostType: typeof reportData?.summary?.totalMonthlyCost,
          hasSummary: !!reportData?.summary
        });
      } catch (reportError) {
        if (typeof window !== 'undefined' && window.persistentLog) {
          window.persistentLog('CRITICAL', '[PDF] generatePDFReport: ERROR in generateReportSummary:', reportError.message);
          window.persistentLog('CRITICAL', '[PDF] generatePDFReport: Report error stack:', reportError.stack);
        }
        console.error('[PDF] ERROR generating report summary:', reportError);
        console.error('[PDF] Report error name:', reportError?.name);
        console.error('[PDF] Report error message:', reportError?.message);
        console.error('[PDF] Report error stack:', reportError?.stack);
        
        // Check for stack overflow
        if (reportError instanceof RangeError || (reportError?.message && reportError.message.includes('Maximum call stack size exceeded'))) {
          if (typeof window !== 'undefined' && window.persistentLog) {
            window.persistentLog('CRITICAL', '[PDF] generatePDFReport: STACK OVERFLOW in report summary generation!');
          }
          console.error('[PDF] STACK OVERFLOW in report summary generation!');
        }
        throw reportError;
      }
      
      // Debug: Log complexity and readiness counts
      console.log('[PDF] Report data complexity:', {
        low: reportData.complexity?.low?.count || 0,
        medium: reportData.complexity?.medium?.count || 0,
        high: reportData.complexity?.high?.count || 0,
        unassigned: reportData.complexity?.unassigned?.count || 0
      });
      console.log('[PDF] Report data readiness:', {
        ready: reportData.readiness?.ready?.count || 0,
        conditional: reportData.readiness?.conditional?.count || 0,
        notReady: reportData.readiness?.notReady?.count || 0,
        unassigned: reportData.readiness?.unassigned?.count || 0
      });

      // Generate PDF
      console.log('[PDF] Starting PDF generation...');
      console.log('[PDF] Report data summary:', {
        totalWorkloads: reportData?.summary?.totalWorkloads,
        totalMonthlyCost: reportData?.summary?.totalMonthlyCost,
        hasCostEstimates: !!(costOutput?.costEstimates?.length),
        costEstimatesCount: costOutput?.costEstimates?.length || 0
      });
      
      try {
        // Cost estimates are validated above, so we can safely pass them
        await generateComprehensiveReportPDF(
          reportData,
          costOutput.costEstimates, // Required - validated above
          strategyOutput || null,
          assessmentOutput || null,
          {
            projectName: 'AWS to GCP Migration Assessment',
            targetRegion: 'us-central1'
          }
        );
        
        console.log('[PDF] PDF generation completed successfully');
        toast.success('PDF report generated and downloaded!', { autoClose: 5000 });
      } catch (pdfError) {
        console.error('[PDF] PDF generation failed:', pdfError);
        toast.error(`PDF generation failed: ${pdfError.message}`, { autoClose: 10000 });
        throw pdfError;
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      // Log full error details for debugging
      console.error('PDF generation error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        fileUUID: fileUUID,
        hasOutputs: !!outputs
      });
      
      // SAFETY: Check for stack overflow and provide helpful error message
      if (err instanceof RangeError && (err.message.includes('Maximum call stack size exceeded') || err.message.includes('stack'))) {
        const stackOverflowMsg = 'PDF generation failed due to memory/stack overflow. This may occur with very large datasets. Please try with a smaller dataset or contact support.';
        console.error('[PDF] Stack overflow detected:', stackOverflowMsg);
        toast.error(stackOverflowMsg, { autoClose: 15000 });
        throw new Error(stackOverflowMsg);
      }
      
      // Re-throw to allow caller to handle, but ensure state is preserved
      throw err;
    }
  };

  // Show loading state while restoring
  // Crash Logs Button Component - Always visible
  const CrashLogsButton = () => {
    const crashLogsCount = JSON.parse(localStorage.getItem('crashLogs') || '[]').length;
    return (
      <div style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 9999 }}>
        <button 
          onClick={handleViewCrashLogs}
          className="btn btn-sm btn-warning"
          style={{ marginRight: '5px' }}
        >
          📋 View Crash Logs ({crashLogsCount})
        </button>
      </div>
    );
  };

  // Crash Logs Modal Component
  const CrashLogsModal = () => {
    if (!showCrashLogs) return null;
    
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 10000,
          padding: '20px',
          overflow: 'auto'
        }}
      >
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '90%',
          margin: '0 auto',
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>Crash Logs ({crashLogs.length} entries)</h3>
            <button 
              onClick={() => setShowCrashLogs(false)}
              className="btn btn-secondary"
            >
              Close
            </button>
          </div>
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '15px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            maxHeight: '70vh',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {crashLogs.length === 0 ? (
              <p>No crash logs found.</p>
            ) : (
              crashLogs.slice().reverse().map((log, index) => (
                <div key={index} style={{ marginBottom: '5px', padding: '3px' }}>
                  {log}
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => {
                const logsText = crashLogs.join('\n');
                navigator.clipboard.writeText(logsText).then(() => {
                  toast.success('Logs copied to clipboard');
                });
              }}
              className="btn btn-primary btn-sm"
            >
              📋 Copy All Logs
            </button>
            <button 
              onClick={handleClearCrashLogs}
              className="btn btn-danger btn-sm"
            >
              🗑️ Clear All Logs
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isRestoring) {
    return (
      <div className="migration-pipeline">
        <CrashLogsButton />
        <CrashLogsModal />
        <div className="pipeline-step-container">
          <div className="text-center p-5">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Restoring pipeline state...</p>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: File Upload
  // CRITICAL: Don't reset to file upload if pipeline is complete - preserve state even if files state is lost
  // This prevents UI from resetting when PDF generation fails or component remounts
  if ((!files || files.length === 0) && !pipelineComplete) {
    return (
      <div className="migration-pipeline">
        <CrashLogsButton />
        <CrashLogsModal />
        <div className="pipeline-step-container">
          <h2>Step 1: Upload CUR Files</h2>
          <p className="step-description">
            Upload your AWS Cost and Usage Report (CUR) files to begin the migration assessment.
            <br />
            <small className="text-muted">For testing, use the seed-data.zip file from the seed-data folder.</small>
          </p>
          <div className="file-upload-section">
            <CurUploadButton onUploadComplete={handleFileUpload} />
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Output Format Selection
  if (!outputFormat) {
    return (
      <div className="migration-pipeline">
        <CrashLogsButton />
        <CrashLogsModal />
        <div className="pipeline-step-container">
          <h2>Step 2: Select Output Format</h2>
          <p className="step-description">
            Choose how you want to view the migration assessment results.
          </p>
          <div className="output-format-selection">
            <button
              className={`format-button ${outputFormat === 'screen' ? 'selected' : ''}`}
              onClick={() => handleOutputFormatSelect('screen')}
            >
              <div className="format-icon">🖥️</div>
              <div className="format-label">Screen</div>
              <div className="format-description">View results in browser</div>
            </button>
            <button
              className={`format-button ${outputFormat === 'pdf' ? 'selected' : ''}`}
              onClick={() => handleOutputFormatSelect('pdf')}
            >
              <div className="format-icon">📄</div>
              <div className="format-label">PDF</div>
              <div className="format-description">Download PDF report</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Pipeline Execution (always show orchestrator, even after completion)
  return (
    <div className="migration-pipeline">
      <CrashLogsButton />
      <CrashLogsModal />
      
      {/* Only show pipeline complete message for screen format - PDF uses DOM manipulation */}
      {pipelineComplete && outputFormat !== 'pdf' && (
        <div className="alert alert-success mb-3">
          <h4>✅ Pipeline Complete!</h4>
          <p>All agents have finished. Results are displayed below. You can rerun individual agents if needed.</p>
        </div>
      )}
      
      <PipelineOrchestrator
        files={files}
        fileUUID={fileUUID}
        onComplete={handlePipelineComplete}
        onError={handlePipelineError}
      />
      {error && (
        <div className="alert alert-danger mt-3">
          <strong>Error:</strong> {error.message}
        </div>
      )}
      
      {/* Show results below pipeline if screen format and complete */}
      {pipelineComplete && outputFormat === 'screen' && pipelineOutputs && (
        <div className="mt-4">
          <div className="pipeline-results">
            <div className="results-header d-flex justify-content-between align-items-center mb-3">
              <h2>Migration Assessment Results</h2>
              <button
                className="btn btn-success btn-lg"
                onClick={async () => {
                  console.log('[PDF] Generate PDF button clicked');
                  if (!pipelineOutputs) {
                    toast.error('No pipeline outputs available. Please wait for pipeline to complete.');
                    return;
                  }
                  try {
                    await generatePDFReport(pipelineOutputs);
                  } catch (error) {
                    console.error('[PDF] Error generating PDF:', error);
                    toast.error(`Failed to generate PDF: ${error.message}`, { autoClose: 10000 });
                  }
                }}
              >
                📄 Generate PDF Report
              </button>
            </div>
            {/* SAFETY: Prevent rendering screen view with too many workloads (causes browser crash) */}
            {(() => {
              const workloadCount = pipelineOutputs.discovery?.workloads?.length || 0;
              const MAX_SCREEN_WORKLOADS = 100000; // Limit screen rendering to 100K workloads
              
              if (workloadCount > MAX_SCREEN_WORKLOADS) {
                return (
                  <div className="alert alert-warning" style={{ marginTop: '20px' }}>
                    <h4>⚠️ Too Many Workloads for Screen Display</h4>
                    <p>
                      Your dataset contains <strong>{workloadCount.toLocaleString()} workloads</strong>, which is too large to display on screen safely.
                    </p>
                    <p>
                      <strong>Please use PDF format instead</strong> - it can handle datasets of any size and provides a comprehensive report.
                    </p>
                    <p>
                      <button
                        className="btn btn-primary btn-lg"
                        onClick={async () => {
                          try {
                            await generatePDFReport(pipelineOutputs);
                          } catch (error) {
                            console.error('[PDF] Error generating PDF:', error);
                            toast.error(`Failed to generate PDF: ${error.message}`, { autoClose: 10000 });
                          }
                        }}
                      >
                        📄 Generate PDF Report Now
                      </button>
                    </p>
                    <p className="text-muted small mt-3">
                      Screen display is limited to {MAX_SCREEN_WORKLOADS.toLocaleString()} workloads to prevent browser crashes.
                      PDF generation can handle datasets of any size.
                    </p>
                  </div>
                );
              }
              
              return (
                <ReportSummaryView
                  workloads={pipelineOutputs.discovery?.workloads || []}
                  assessmentResults={pipelineOutputs.assessment || null}
                  strategyResults={pipelineOutputs.strategy || null}
                  uploadSummary={pipelineOutputs.discovery?.summary || null}
                />
              );
            })()}
          </div>
        </div>
      )}
      
      {/* PDF success message is now handled via direct DOM manipulation to avoid React re-renders */}
      {/* No React conditional rendering here - prevents crashes */}
    </div>
  );

}
