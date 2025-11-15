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
  const [fileUUID, setFileUUID] = useState(null);
  const [error, setError] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);

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
    setPipelineComplete(true);
    setPipelineOutputs(outputs);
    
    // Save completion status to pipeline state
    if (fileUUID) {
      await savePipelineState(fileUUID, {
        outputFormat,
        pipelineComplete: true,
        filesCount: files?.length || 0,
        fileNames: files?.map(f => f.name) || []
      });
    }

    // If PDF format was selected, generate PDF immediately
    if (outputFormat === 'pdf') {
      console.log('[PDF] PDF format selected, auto-generating PDF...');
      try {
        await generatePDFReport(outputs);
        console.log('[PDF] Auto-generation completed');
      } catch (err) {
        console.error('[PDF] Error auto-generating PDF:', err);
        toast.error(`Failed to generate PDF report: ${err.message}`, { autoClose: 10000 });
        // Don't reset state on PDF error - keep pipeline complete so user can retry
        // The pipeline completed successfully, PDF generation is separate
      }
    }
  };

  const handlePipelineError = (err, agentId) => {
    console.error(`Pipeline error in ${agentId}:`, err);
    setError(err);
    toast.error(`${agentId} failed: ${err.message}`);
  };

  const generatePDFReport = async (outputs) => {
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
      console.error('[PDF]', errorMsg);
      throw new Error(errorMsg);
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
      const reportData = await import('../../domain/services/ReportDataAggregator.js').then(m => 
        m.ReportDataAggregator.generateReportSummary(workloads)
      );
      
      // CRITICAL DEBUG: Verify report data has costs
      console.log('[PDF] Report data after generation:', {
        totalMonthlyCost: reportData?.summary?.totalMonthlyCost,
        totalMonthlyCostType: typeof reportData?.summary?.totalMonthlyCost,
        hasSummary: !!reportData?.summary
      });
      
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
  if (isRestoring) {
    return (
      <div className="migration-pipeline">
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
      {pipelineComplete && (
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
            <ReportSummaryView
              workloads={pipelineOutputs.discovery?.workloads || []}
              assessmentResults={pipelineOutputs.assessment || null}
              strategyResults={pipelineOutputs.strategy || null}
              uploadSummary={pipelineOutputs.discovery?.summary || null}
            />
          </div>
        </div>
      )}
      
      {/* Show PDF button if PDF format was selected and pipeline is complete */}
      {pipelineComplete && outputFormat === 'pdf' && pipelineOutputs && (
        <div className="mt-3 mb-3 text-center">
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
      )}
    </div>
  );

}
