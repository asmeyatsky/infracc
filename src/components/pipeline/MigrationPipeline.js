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
import { loadDemoData } from '../../utils/demoData.js';
import { Workload } from '../../domain/entities/Workload.js';
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

  // Clear all pipeline state (for starting fresh)
  const handleClearState = async () => {
    try {
      if (fileUUID) {
        // Clear pipeline state for current UUID
        await clearPipelineState(fileUUID);
      }
      
      // Clear all state
      setFiles(null);
      setFileUUID(null);
      setOutputFormat(null);
      setPipelineComplete(false);
      
      // Clear workload repository
      const container = await import('../../infrastructure/dependency_injection/Container.js').then(m => m.getContainer());
      if (container.workloadRepository) {
        await container.workloadRepository.clear();
        console.log('[CLEAR] Cleared all workloads from repository');
      }
      
      toast.success('Pipeline state cleared. Ready to start fresh.', { autoClose: 2000 });
    } catch (error) {
      console.error('Error clearing pipeline state:', error);
      toast.error('Failed to clear pipeline state', { autoClose: 2000 });
    }
  };

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
        
        // Clear workload repository to start fresh
        try {
          const container = await import('../../infrastructure/dependency_injection/Container.js').then(m => m.getContainer());
          if (container.workloadRepository) {
            await container.workloadRepository.clear();
            console.log('[CLEAR] Cleared all workloads from repository for fresh start');
          }
        } catch (clearError) {
          console.warn('Could not clear workload repository:', clearError);
          // Continue anyway - new files will overwrite
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
        
        toast.success('Files processed successfully. Select output format to continue.');
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
      try {
        await generatePDFReport(outputs);
      } catch (err) {
        console.error('Error generating PDF:', err);
        toast.error('Failed to generate PDF report');
      }
    }
  };

  const handlePipelineError = (err, agentId) => {
    console.error(`Pipeline error in ${agentId}:`, err);
    setError(err);
    toast.error(`${agentId} failed: ${err.message}`);
  };

  const generatePDFReport = async (outputs) => {
    if (!outputs || !fileUUID) {
      throw new Error('Missing outputs or file UUID for PDF generation');
    }

    toast.info('Generating PDF report...');

    try {
      // Get all cached outputs
      const discoveryOutput = outputs.discovery || await getAgentOutput(fileUUID, 'discovery');
      const assessmentOutput = outputs.assessment || await getAgentOutput(fileUUID, 'assessment');
      const strategyOutput = outputs.strategy || await getAgentOutput(fileUUID, 'strategy');
      const costOutput = outputs.cost || await getAgentOutput(fileUUID, 'cost');

      // CRITICAL: Merge assessments with workloads before generating report
      // This ensures complexity and readiness scores are included
      let workloads = discoveryOutput?.workloads || [];
      
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
        assessmentOutput.results.forEach(assessment => {
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
        });
        
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
        
        workloads = workloads.map(workload => {
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
        
        console.log(`[PDF] Merged ${mergedCount} assessments with ${workloads.length} workloads`);
        console.log(`[PDF] Merged with complexity: ${mergedWithComplexity}, without: ${mergedWithoutComplexity}, not found in map: ${notFoundInMap}`);
      }
      
      // Generate report data with merged workloads
      const reportData = await import('../../domain/services/ReportDataAggregator.js').then(m => 
        m.ReportDataAggregator.generateReportSummary(workloads)
      );
      
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
      await generateComprehensiveReportPDF(
        reportData,
        costOutput?.costEstimates || null,
        strategyOutput || null,
        assessmentOutput || null,
        {
          projectName: 'AWS to GCP Migration Assessment',
          targetRegion: 'us-central1'
        }
      );

      toast.success('PDF report generated successfully!');
    } catch (err) {
      console.error('PDF generation error:', err);
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

  // Load demo data into repository
  const handleLoadDemoData = async () => {
    try {
      const container = await import('../../infrastructure/dependency_injection/Container.js').then(m => m.getContainer());
      const workloadRepository = container.workloadRepository;
      
      // Clear existing workloads
      await workloadRepository.clear();
      
      // Load demo data
      const demoData = loadDemoData();
      const { workloads: demoWorkloads } = demoData;
      
      // Convert demo workloads to Workload entities and save to repository
      let savedCount = 0;
      for (const demoWorkload of demoWorkloads) {
        try {
          const workload = new Workload({
            id: `demo-${demoWorkload.id}`,
            name: demoWorkload.name,
            service: demoWorkload.service || 'EC2',
            type: demoWorkload.type || 'vm',
            sourceProvider: 'aws',
            cpu: demoWorkload.cpu || 0,
            memory: demoWorkload.memory || 0,
            storage: demoWorkload.storage || 0,
            monthlyCost: demoWorkload.monthlyCost || 0,
            region: demoWorkload.region || 'us-east-1',
            os: demoWorkload.os || 'linux',
            monthlyTraffic: demoWorkload.monthlyTraffic || 0,
            dependencies: typeof demoWorkload.dependencies === 'string' 
              ? demoWorkload.dependencies.split(',').map(d => d.trim()).filter(Boolean)
              : (demoWorkload.dependencies || [])
          });
          
          await workloadRepository.save(workload);
          savedCount++;
        } catch (error) {
          console.warn(`Failed to save demo workload ${demoWorkload.name}:`, error);
        }
      }
      
      // Force persistence to ensure workloads are saved to IndexedDB
      try {
        await workloadRepository._forcePersist();
        console.log('[DEBUG] Demo Data: Forced persistence to IndexedDB');
      } catch (persistError) {
        console.warn('[DEBUG] Demo Data: Failed to force persist, trying alternative:', persistError);
        // Wait a bit for debounced persistence to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Wait a bit for persistence to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Reload from storage to ensure we have the latest data
      if (typeof workloadRepository._loadFromStorage === 'function') {
        await workloadRepository._loadFromStorage();
      }
      
      // Verify workloads were saved
      const verifyWorkloads = await workloadRepository.findAll();
      console.log(`[DEBUG] Demo Data: Saved ${savedCount} workloads, verified ${verifyWorkloads.length} workloads in repository`);
      console.log(`[DEBUG] Demo Data: Sample workload IDs:`, verifyWorkloads.slice(0, 5).map(w => w.id));
      
      if (verifyWorkloads.length === 0) {
        throw new Error('Failed to save demo workloads to repository. Please try again.');
      }
      
      if (verifyWorkloads.length !== savedCount) {
        console.warn(`[DEBUG] Demo Data: Warning - saved ${savedCount} but verified ${verifyWorkloads.length} workloads`);
      }
      
      toast.success(`✅ Loaded ${verifyWorkloads.length} demo workloads into repository. You can now run the pipeline!`, { autoClose: 3000 });
      
      // Set a placeholder file so pipeline can proceed
      // Add a small delay to ensure repository is ready
      await new Promise(resolve => setTimeout(resolve, 200));
      setFiles([{ name: 'demo-data', demo: true }]);
      
    } catch (error) {
      console.error('Error loading demo data:', error);
      toast.error('Failed to load demo data: ' + error.message, { autoClose: 3000 });
    }
  };

  // Step 1: File Upload
  if (!files || files.length === 0) {
    return (
      <div className="migration-pipeline">
        <div className="pipeline-step-container">
          <h2>Step 1: Upload CUR Files or Load Demo Data</h2>
          <p className="step-description">
            Upload your AWS Cost and Usage Report (CUR) files to begin the migration assessment, or load demo data to explore the tool.
          </p>
          <div className="file-upload-section">
            <div className="mb-4">
              <CurUploadButton onUploadComplete={handleFileUpload} />
            </div>
            <div className="text-center">
              <div className="mb-2 text-muted">OR</div>
              <button 
                className="btn btn-success btn-lg"
                onClick={handleLoadDemoData}
                style={{ minWidth: '200px' }}
              >
                🎮 Load Demo Data
              </button>
              <p className="text-muted small mt-2">
                Loads 16 pre-configured workloads (VMs, containers, databases, storage) for testing
              </p>
            </div>
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
          <p>All agents have finished. You can rerun individual agents if needed.</p>
          {outputFormat === 'screen' && pipelineOutputs && (
            <button
              className="btn btn-primary mt-2"
              onClick={() => {
                // Show results in a modal or separate view
                const discoveryOutput = pipelineOutputs.discovery;
                const assessmentOutput = pipelineOutputs.assessment;
                const strategyOutput = pipelineOutputs.strategy;
                
                // For now, just log - you can implement a modal or navigation here
                console.log('View results:', { discoveryOutput, assessmentOutput, strategyOutput });
              }}
            >
              📊 View Results
            </button>
          )}
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
            <div className="results-header">
              <h2>Migration Assessment Results</h2>
              <button
                className="btn btn-primary"
                onClick={() => generatePDFReport(pipelineOutputs)}
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
    </div>
  );

}
