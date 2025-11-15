/**
 * Pipeline Orchestrator Component
 * 
 * Manages the sequential execution of agents in the migration pipeline
 * - Shows one agent at a time with progress bar (0-100%)
 * - Minimal console logging (only summaries/errors)
 * - Uses cached outputs when available
 * - Supports cancel/resume functionality
 * - Persists state for recovery on refresh
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getAgenticContainer } from '../../agentic/dependency_injection/AgenticContainer.js';
import { getContainer } from '../../infrastructure/dependency_injection/Container.js';
import { agentStatusManager } from '../../agentic/core/AgentStatusManager.js';
import {
  saveAgentOutput,
  getAgentOutput,
  hasAgentOutput,
  savePipelineState,
  getPipelineState,
  getCachedAgentIds,
  clearAgentOutput
} from '../../utils/agentCacheService.js';
import { generateFileUUID, generateFilesUUID } from '../../utils/uuidGenerator.js';
import { GCPCostEstimator } from '../../domain/services/GCPCostEstimator.js';
import { ReportDataAggregator } from '../../domain/services/ReportDataAggregator.js';
import './PipelineOrchestrator.css';

const AGENTS = [
  { 
    id: 'discovery', 
    name: 'Discovery Agent', 
    icon: '🔍',
    description: 'Discovering workloads from CUR files',
    required: true
  },
  { 
    id: 'assessment', 
    name: 'Assessment Agent', 
    icon: '📊',
    description: 'Assessing workload complexity and readiness',
    required: true,
    dependsOn: 'discovery'
  },
  { 
    id: 'strategy', 
    name: 'Strategy Agent', 
    icon: '🎯',
    description: 'Planning migration strategy and waves',
    required: true,
    dependsOn: 'assessment'
  },
  { 
    id: 'cost', 
    name: 'Cost Optimization Agent', 
    icon: '💰',
    description: 'Analyzing costs and estimating GCP pricing',
    required: false,
    dependsOn: 'strategy'
  }
];

export default function PipelineOrchestrator({ files, fileUUID: propFileUUID, onComplete, onError }) {
  const [fileUUID, setFileUUID] = useState(propFileUUID || null);
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const [agentProgress, setAgentProgress] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [agentStatus, setAgentStatus] = useState('pending'); // pending, running, completed, failed, cancelled
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
  const [agentOutput, setAgentOutput] = useState(null);
  const [needsRerun, setNeedsRerun] = useState([]);
  const [isRestoringState, setIsRestoringState] = useState(true); // Track if we're still restoring state
  const [completedAgents, setCompletedAgents] = useState([]); // Track which agents have completed
  
  const cancelRequestedRef = useRef(false);
  const startTimeRef = useRef(null);
  const agenticContainer = useRef(null);
  const container = useRef(null);
  const workloadRepository = useRef(null);

  // Initialize containers
  useEffect(() => {
    agenticContainer.current = getAgenticContainer();
    container.current = getContainer();
    workloadRepository.current = container.current.workloadRepository;
    
    // Pre-load workloads from IndexedDB on mount
    if (workloadRepository.current && typeof workloadRepository.current._loadFromStorage === 'function') {
      workloadRepository.current._loadFromStorage().catch(err => {
        console.warn('[PipelineOrchestrator] Failed to pre-load workloads:', err);
      });
    }
  }, []);

  // Generate or retrieve file UUID (if not provided as prop)
  useEffect(() => {
    if (propFileUUID) {
      setFileUUID(propFileUUID);
      
      // Restore pipeline state for provided UUID
      const restoreState = async () => {
        try {
          const savedState = await getPipelineState(propFileUUID);
          if (savedState && savedState.currentAgentIndex !== undefined) {
            // CRITICAL: Verify all previous agents have completed before restoring to a later agent
            const requestedIndex = savedState.currentAgentIndex;
            const cachedAgents = await getCachedAgentIds(propFileUUID);
            
            // Only restore to an agent if all previous required agents are completed
            let validIndex = 0;
            for (let i = 0; i <= requestedIndex && i < AGENTS.length; i++) {
              const agent = AGENTS[i];
              if (agent.required && !cachedAgents.includes(agent.id)) {
                // Previous required agent not completed, stop here
                validIndex = i;
                break;
              }
              validIndex = i;
            }
            
            console.log(`[PIPELINE] State restoration (propFileUUID): requested index ${requestedIndex}, validated to ${validIndex}, cached agents: ${cachedAgents.join(', ')}`);
            setCurrentAgentIndex(validIndex);
            setOverallProgress(savedState.overallProgress || 0);
            setAgentProgress(savedState.agentProgress || 0);
            setAgentStatus(savedState.agentStatus || 'pending');
            
            // Check which agents need rerun and which are completed (cachedAgents already declared above)
            setCompletedAgents(cachedAgents);
            const requiredAgents = AGENTS.filter(a => a.required).map(a => a.id);
            const needsRerunList = requiredAgents.filter(id => !cachedAgents.includes(id));
            setNeedsRerun(needsRerunList);
            
            // Restore agent output if available
            if (validIndex > 0) {
              const previousAgentId = AGENTS[validIndex - 1]?.id;
              if (previousAgentId) {
                const cachedOutput = await getAgentOutput(propFileUUID, previousAgentId);
                if (cachedOutput) {
                  setAgentOutput(cachedOutput);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error restoring pipeline state:', error);
        } finally {
          setIsRestoringState(false);
        }
      };
      
      restoreState();
      return;
    }

    if (!files || files.length === 0) return;

    const initializeUUID = async () => {
      try {
        // Only generate UUID if files are actual File objects
        if (files[0] instanceof File) {
          const uuid = files.length === 1 
            ? await generateFileUUID(files[0])
            : await generateFilesUUID(files);
          
          setFileUUID(uuid);
          
            // Try to restore pipeline state
          const savedState = await getPipelineState(uuid);
          if (savedState && savedState.currentAgentIndex !== undefined) {
            // CRITICAL: Verify all previous agents have completed before restoring to a later agent
            const requestedIndex = savedState.currentAgentIndex;
            const cachedAgents = await getCachedAgentIds(uuid);
            
            // Only restore to an agent if all previous required agents are completed
            let validIndex = 0;
            for (let i = 0; i <= requestedIndex && i < AGENTS.length; i++) {
              const agent = AGENTS[i];
              if (agent.required && !cachedAgents.includes(agent.id)) {
                // Previous required agent not completed, stop here
                validIndex = i;
                break;
              }
              validIndex = i;
            }
            
            console.log(`[PIPELINE] State restoration: requested index ${requestedIndex}, validated to ${validIndex}, cached agents: ${cachedAgents.join(', ')}`);
            setCurrentAgentIndex(validIndex);
            setOverallProgress(savedState.overallProgress || 0);
            setAgentProgress(savedState.agentProgress || 0);
            setAgentStatus(savedState.agentStatus || 'pending');
            
            // Check which agents need rerun and which are completed (cachedAgents already declared above)
            setCompletedAgents(cachedAgents);
            const requiredAgents = AGENTS.filter(a => a.required).map(a => a.id);
            const needsRerunList = requiredAgents.filter(id => !cachedAgents.includes(id));
            setNeedsRerun(needsRerunList);
            
            // Restore agent output if available
            if (validIndex > 0) {
              const previousAgentId = AGENTS[validIndex - 1]?.id;
              if (previousAgentId) {
                const cachedOutput = await getAgentOutput(uuid, previousAgentId);
                if (cachedOutput) {
                  setAgentOutput(cachedOutput);
                }
              }
            }
          }
          setIsRestoringState(false);
        } else {
          setIsRestoringState(false);
        }
      } catch (error) {
        console.error('Error initializing UUID:', error);
        setIsRestoringState(false);
        onError?.(error);
      }
    };

    if (files && files.length > 0) {
      initializeUUID();
    } else {
      setIsRestoringState(false);
    }
  }, [files, propFileUUID, onError]);

  // Calculate estimated time remaining
  const calculateEstimatedTime = useCallback((currentProgress, elapsedTime) => {
    if (currentProgress <= 0 || elapsedTime <= 0) return null;
    
    const totalEstimatedTime = (elapsedTime / currentProgress) * 100;
    const remaining = totalEstimatedTime - elapsedTime;
    
    if (remaining <= 0) return null;
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, []);

  // Update progress tracking
  useEffect(() => {
    if (agentStatus === 'running' && startTimeRef.current) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const estimated = calculateEstimatedTime(agentProgress, elapsed);
        setEstimatedTimeRemaining(estimated);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [agentStatus, agentProgress, calculateEstimatedTime]);

  // Save pipeline state periodically
  useEffect(() => {
    if (!fileUUID) return;

    const saveState = async () => {
      await savePipelineState(fileUUID, {
        currentAgentIndex,
        overallProgress,
        agentProgress,
        agentStatus
      });
    };

    const interval = setInterval(saveState, 5000); // Save every 5 seconds
    return () => clearInterval(interval);
  }, [fileUUID, currentAgentIndex, overallProgress, agentProgress, agentStatus]);

  // Execute Discovery Agent
  // Note: Files are already processed by CurUploadButton, so we just read from repository
  const executeDiscoveryAgent = useCallback(async () => {
    // Check cache first
    const cached = await getAgentOutput(fileUUID, 'discovery');
    if (cached) {
      console.log(`✓ Discovery Agent: Using cached output (${cached.workloadCount || 'unknown'} workloads)`);
      return cached;
    }

    setAgentStatus('running');
    startTimeRef.current = Date.now();
    setAgentProgress(0);

    try {
      // CRITICAL FIX: Check if files were actually uploaded (not just restored placeholders)
      const hasActualFiles = files && files.length > 0 && !files[0]?.restored;
      
      if (!hasActualFiles) {
        throw new Error('No files uploaded. Please upload CUR files to start the pipeline.');
      }

      // Files are already processed by CurUploadButton, so we just read from repository
      // For demo data, workloads should already be in repository
      // Wait a bit for processing to complete if it's still running
      let attempts = 0;
      let workloads = [];
      
      // CRITICAL: Force reload from IndexedDB first (workloads should already be saved by CurUploadButton)
      console.log('[DEBUG] Discovery Agent: Starting workload discovery...');
      console.log('[DEBUG] Discovery Agent: Repository instance:', workloadRepository.current ? 'exists' : 'missing');
      
      if (workloadRepository.current && typeof workloadRepository.current._loadFromStorage === 'function') {
        console.log('[DEBUG] Discovery Agent: Reloading workloads from IndexedDB...');
        try {
          await workloadRepository.current._loadFromStorage();
          workloads = await workloadRepository.current.findAll();
          console.log(`[DEBUG] Discovery Agent: After initial reload, found ${workloads.length} workloads`);
          console.log(`[DEBUG] Discovery Agent: Cache size: ${workloadRepository.current._cache?.size || 'unknown'}`);
          
          if (workloads.length > 0) {
            console.log(`[DEBUG] Discovery Agent: Sample workload IDs:`, workloads.slice(0, 5).map(w => w.id));
          }
        } catch (reloadError) {
          console.error('[DEBUG] Discovery Agent: Failed to reload from storage:', reloadError);
          console.error('[DEBUG] Discovery Agent: Error stack:', reloadError.stack);
        }
      } else {
        console.warn('[DEBUG] Discovery Agent: Repository or _loadFromStorage method not available');
      }
      
      // Give Discovery Agent time to find workloads (increased timeout for large files)
      while (attempts < 200 && workloads.length === 0) { // Wait up to 20 seconds for large files
        workloads = await workloadRepository.current.findAll();
        if (workloads.length > 0) {
          console.log(`[DEBUG] Discovery Agent: Found ${workloads.length} workloads after ${attempts} attempts`);
          break;
        }
        setAgentProgress(Math.min(attempts * 0.5, 90)); // Show progress while waiting
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      // If still no workloads, try reloading from storage
      if (workloads.length === 0) {
        console.warn('[DEBUG] Discovery Agent: No workloads found in cache. Attempting to reload from IndexedDB storage...');
        
        // Try to reload from storage if the repository supports it
        if (workloadRepository.current && typeof workloadRepository.current._loadFromStorage === 'function') {
          try {
            await workloadRepository.current._loadFromStorage();
            workloads = await workloadRepository.current.findAll();
            console.log(`[DEBUG] Discovery Agent: After reload, found ${workloads.length} workloads in repository`);
            console.log(`[DEBUG] Discovery Agent: Sample workload IDs:`, workloads.slice(0, 3).map(w => w.id));
          } catch (reloadError) {
            console.warn('[DEBUG] Discovery Agent: Failed to reload from storage:', reloadError);
          }
        }
        
        // Try with a fresh container instance
        if (workloads.length === 0) {
          console.warn('[DEBUG] Discovery Agent: Trying fresh container instance...');
          const freshContainer = getContainer();
          const freshWorkloads = await freshContainer.workloadRepository.findAll();
          console.log(`[DEBUG] Discovery Agent: Fresh container found ${freshWorkloads.length} workloads`);
          if (freshWorkloads.length > 0) {
            workloads = freshWorkloads;
            // Update the ref to use the fresh container
            workloadRepository.current = freshContainer.workloadRepository;
          }
        }
      }

      if (workloads.length === 0) {
        // Final attempt: Check IndexedDB directly
        console.error('[DEBUG] Discovery Agent: No workloads found after all attempts');
        console.error('[DEBUG] Discovery Agent: Repository cache size:', workloadRepository.current?._cache?.size || 'unknown');
        console.error('[DEBUG] Discovery Agent: Repository storage key:', workloadRepository.current?.storageKey || 'unknown');
        
        // Try to check IndexedDB directly via localforage
        try {
          const localforage = await import('localforage');
          const storage = localforage.default.createInstance({
            name: 'WorkloadRepository',
            storeName: 'workloads'
          });
          const keys = await storage.keys();
          console.error('[DEBUG] Discovery Agent: IndexedDB keys count:', keys.length);
          if (keys.length > 0) {
            console.error('[DEBUG] Discovery Agent: Sample IndexedDB keys:', keys.slice(0, 5));
          }
        } catch (dbError) {
          console.error('[DEBUG] Discovery Agent: Failed to check IndexedDB directly:', dbError);
        }
        
        const errorMessage = 'No workloads found in repository. Please:\n' +
          '1. Upload CUR files using the "Upload CUR Files" button\n' +
          '2. Wait for files to be processed (check console for upload logs)\n' +
          '3. Ensure files are valid AWS CUR CSV files\n' +
          '4. Check browser console for [UPLOAD] and [FileUploadManager] logs\n' +
          '5. Try refreshing the page and uploading again';
        throw new Error(errorMessage);
      }

      // SAFETY: Batch workload ID extraction to avoid stack overflow with large datasets
      const workloadIds = [];
      const BATCH_SIZE = 10000;
      for (let i = 0; i < workloads.length; i += BATCH_SIZE) {
        const batch = workloads.slice(i, Math.min(i + BATCH_SIZE, workloads.length));
        for (const w of batch) {
          if (w && w.id) {
            workloadIds.push(w.id);
          }
        }
      }
      
      // SAFETY: Batch region extraction to avoid stack overflow
      const regions = new Set();
      for (let i = 0; i < workloads.length; i += BATCH_SIZE) {
        const batch = workloads.slice(i, Math.min(i + BATCH_SIZE, workloads.length));
        for (const w of batch) {
          if (w && w.region) {
            regions.add(w.region);
          }
        }
      }
      
      setAgentProgress(100);

      const output = {
        workloads,
        workloadIds,
        workloadCount: workloads.length,
        summary: {
          uniqueWorkloads: workloads.length,
          totalRegions: regions.size
        },
        timestamp: new Date().toISOString()
      };

      // Save to cache
      await saveAgentOutput(fileUUID, 'discovery', output, {
        workloadCount: workloads.length
      });

      console.log(`✓ Discovery Agent: Completed (${workloads.length.toLocaleString()} workloads)`);
      return output;
    } catch (error) {
      console.error('✗ Discovery Agent failed:', error.message);
      throw error;
    }
  }, [fileUUID]);

  // Execute Assessment Agent
  const executeAssessmentAgent = useCallback(async (discoveryOutput) => {
    if (!discoveryOutput || !discoveryOutput.workloadIds) {
      throw new Error('Discovery output required for assessment');
    }

    // Check cache first
    const cached = await getAgentOutput(fileUUID, 'assessment');
    if (cached) {
      console.log(`✓ Assessment Agent: Using cached output (${cached.results?.length || 0} assessments)`);
      return cached;
    }

    setAgentStatus('running');
    startTimeRef.current = Date.now();
    setAgentProgress(0);

    try {
      // CRITICAL FIX: Only assess workloads that are actually in the repository
      // The repository may have quota limits (localStorage), so we need to check what's actually available
      const container = getContainer();
      const allWorkloads = await container.workloadRepository.findAll();
      const availableWorkloadIds = allWorkloads.map(w => w.id);
      
      // Use available workloads from repository instead of all discovery workloadIds
      // This ensures we only assess workloads that can actually be found
      const { workloadIds: discoveryWorkloadIds } = discoveryOutput;
      const workloadIds = availableWorkloadIds.length > 0 ? availableWorkloadIds : discoveryWorkloadIds;
      const totalWorkloads = workloadIds.length;
      
      console.log(`[DEBUG] Assessment Agent: Using ${workloadIds.length.toLocaleString()} workload IDs from repository (${allWorkloads.length.toLocaleString()} workloads available)`);
      if (availableWorkloadIds.length < discoveryWorkloadIds.length) {
        console.warn(`⚠️ WARNING: Only ${availableWorkloadIds.length.toLocaleString()} workloads available in repository, but discovery found ${discoveryWorkloadIds.length.toLocaleString()}. This may indicate that some workloads were not successfully saved to IndexedDB.`);
      }

      // Subscribe to agent status updates for progress tracking
      const progressUnsubscribe = agentStatusManager.subscribe(() => {
        const agentStatus = agentStatusManager.getAgentStatus('AssessmentAgent');
        if (agentStatus && agentStatus.progress !== undefined) {
          const progress = agentStatus.progress;
          setAgentProgress(progress);
          setOverallProgress(Math.round((1 / AGENTS.length) * 100 + (progress / AGENTS.length)));
        }
      });

      console.log(`Assessment Agent: Starting assessment of ${workloadIds.length.toLocaleString()} workloads`);
      
      let assessmentResult;
      try {
        assessmentResult = await agenticContainer.current.assessmentAgent.assessBatch({
          workloadIds,
          parallel: true
        });
      } catch (error) {
        console.error('Assessment Agent assessBatch failed:', error);
        // Unsubscribe before throwing
        if (progressUnsubscribe) {
          progressUnsubscribe();
        }
        throw error;
      }

      // Unsubscribe from progress updates
      if (progressUnsubscribe) {
        progressUnsubscribe();
      }

      // Validate assessment result structure
      if (!assessmentResult) {
        console.error('Assessment Agent returned null/undefined result');
        console.error('fileUUID at this point:', fileUUID);
        throw new Error('Assessment Agent returned no result');
      }

      if (!assessmentResult.results || !Array.isArray(assessmentResult.results)) {
        console.error('Assessment Agent returned invalid result structure:', assessmentResult);
        console.error('Result type:', typeof assessmentResult);
        console.error('Result keys:', Object.keys(assessmentResult || {}));
        console.error('fileUUID at this point:', fileUUID);
        throw new Error('Assessment Agent returned invalid result structure');
      }
      
      // CRITICAL: Log fileUUID and result structure for debugging
      console.log(`[DEBUG] Assessment Agent completed. fileUUID: ${fileUUID}, results count: ${assessmentResult.results.length}`);

      // Process results - handle partial success
      // SAFETY: Batch filtering to avoid stack overflow with large datasets
      const results = assessmentResult.results;
      const successful = [];
      const failed = [];
      const FILTER_BATCH_SIZE = 10000;
      
      for (let i = 0; i < results.length; i += FILTER_BATCH_SIZE) {
        const batch = results.slice(i, Math.min(i + FILTER_BATCH_SIZE, results.length));
        for (const r of batch) {
          if (r && !r.error) {
            successful.push(r);
          } else {
            failed.push(r);
          }
        }
      }
      
      console.log(`Assessment Agent: Processed ${results.length.toLocaleString()} results (${successful.length.toLocaleString()} successful, ${failed.length.toLocaleString()} failed)`);
      
      // CRITICAL: Always log failure reasons - this is the key diagnostic
      if (failed.length > 0) {
        console.error(`❌ ASSESSMENT FAILURES: ${failed.length.toLocaleString()} assessments failed!`);
        
        // Get first failed assessment to see the error - use try-catch to ensure logging never fails
        try {
          const firstFailed = failed[0];
          
          if (firstFailed) {
            console.error('═══════════════════════════════════════════════════════════');
            console.error('❌ FIRST FAILED ASSESSMENT ERROR:');
            console.error('═══════════════════════════════════════════════════════════');
            
            // Extract error message in multiple ways
            let errorMsg = 'Unknown error';
            if (typeof firstFailed.error === 'string') {
              errorMsg = firstFailed.error;
            } else if (firstFailed.error && firstFailed.error.message) {
              errorMsg = firstFailed.error.message;
            } else if (firstFailed.error) {
              errorMsg = String(firstFailed.error);
            }
            
            console.error('ERROR MESSAGE:', errorMsg);
            console.error('Error Type:', typeof firstFailed.error);
            console.error('Workload ID:', firstFailed.workloadId);
            console.error('Full Failed Object:', JSON.stringify(firstFailed, null, 2));
            console.error('Failed Object Keys:', Object.keys(firstFailed));
            console.error('═══════════════════════════════════════════════════════════');
          } else {
            console.error('⚠️ WARNING: failed array has items but firstFailed is null/undefined');
            console.error('Failed array length:', failed.length);
            console.error('Failed array sample:', JSON.stringify(failed.slice(0, 3), null, 2));
          }
        } catch (logError) {
          console.error('Error while logging failure details:', logError);
          console.error('Failed array length:', failed.length);
          console.error('First failed (raw):', failed[0]);
        }
        
        // Debug: Log sample of failed assessments to understand why they're failing
        const sampleFailed = failed.slice(0, 5);
        console.warn('[DEBUG] Sample failed assessments (first 5):', sampleFailed.map(f => ({
          workloadId: f.workloadId,
          error: f.error,
          errorMessage: typeof f.error === 'string' ? f.error : f.error?.message || String(f.error),
          errorType: typeof f.error,
          hasSuccess: f.success !== undefined,
          success: f.success,
          keys: Object.keys(f || {})
        })));
        
        // Count error types
        const errorCounts = {};
        failed.forEach(f => {
          const errorMsg = typeof f.error === 'string' ? f.error : f.error?.message || String(f.error) || 'unknown';
          const errorKey = errorMsg.substring(0, 100); // First 100 chars
          errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
        });
        
        console.warn('[DEBUG] Error distribution (top 10):', Object.entries(errorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([error, count]) => ({ error, count, percentage: ((count / failed.length) * 100).toFixed(2) + '%' }))
        );
      }

      // CRITICAL: Ensure all assessments are properly serialized with complexity scores
      // Convert Assessment entities to plain objects with all properties accessible
      // SAFETY: Batch serialization to avoid stack overflow with large datasets
      const serializedSuccessful = [];
      const SERIALIZE_BATCH_SIZE = 10000;
      
      for (let i = 0; i < successful.length; i += SERIALIZE_BATCH_SIZE) {
        const batch = successful.slice(i, Math.min(i + SERIALIZE_BATCH_SIZE, successful.length));
        const batchSerialized = batch.map(assessment => {
        // If it's an Assessment entity, convert to JSON
        if (assessment && typeof assessment.toJSON === 'function') {
          const json = assessment.toJSON();
          
          // CRITICAL: Ensure workloadId matches the actual workload.id format
          // The assessment.workloadId should be the workload.id, not an ARN
          // But if it's an ARN, we need to find the matching workload ID
          let assessmentWorkloadId = json.workloadId || assessment.workloadId;
          
          // If workloadId looks like an ARN but we have workloads with simple IDs, try to match
          // For now, just use the assessment's workloadId as-is - it should match workload.id
          
          // Ensure complexityScore and readinessScore are directly accessible
          return {
            ...json,
            workloadId: assessmentWorkloadId, // Use the assessment's workloadId (should match workload.id)
            complexityScore: json.complexityScore !== undefined ? json.complexityScore : 
                           (assessment.complexityScore !== undefined ? assessment.complexityScore : null),
            readinessScore: json.readinessScore !== undefined ? json.readinessScore : 
                          (typeof assessment.getReadinessScore === 'function' ? assessment.getReadinessScore() : null),
            riskFactors: json.riskFactors || assessment.riskFactors || [],
            infrastructureAssessment: json.infrastructureAssessment || assessment.infrastructureAssessment,
            applicationAssessment: json.applicationAssessment || assessment.applicationAssessment
          };
        }
        // If it's already a plain object, ensure it has complexityScore
        const assessmentObj = assessment || {};
        if (assessmentObj.complexityScore === undefined || assessmentObj.complexityScore === null) {
          // Try to extract from infrastructureAssessment
          if (assessmentObj.infrastructureAssessment?.complexityScore !== undefined) {
            assessmentObj.complexityScore = assessmentObj.infrastructureAssessment.complexityScore;
          }
          // Also try to calculate readiness if we have complexity
          if (assessmentObj.complexityScore !== undefined && assessmentObj.complexityScore !== null) {
            const riskFactors = assessmentObj.riskFactors || assessmentObj.infrastructureAssessment?.riskFactors || [];
            const riskCount = Array.isArray(riskFactors) ? riskFactors.length : 0;
            let score = 100;
            score -= (assessmentObj.complexityScore - 1) * 5;
            score -= riskCount * 10;
            if (assessmentObj.infrastructureAssessment && assessmentObj.applicationAssessment) {
              score += 10;
            }
            assessmentObj.readinessScore = Math.max(0, Math.min(100, Math.round(score)));
          }
        }
        return assessmentObj;
        });
        
        // Add batch results
        for (const serialized of batchSerialized) {
          serializedSuccessful.push(serialized);
        }
      }
      
      // Debug: Log sample of serialized assessments
      if (serializedSuccessful.length > 0) {
        const sample = serializedSuccessful[0];
        console.log('[DEBUG] Sample serialized assessment:', {
          workloadId: sample.workloadId,
          hasComplexityScore: sample.complexityScore !== undefined && sample.complexityScore !== null,
          complexityScore: sample.complexityScore,
          hasReadinessScore: sample.readinessScore !== undefined && sample.readinessScore !== null,
          readinessScore: sample.readinessScore,
          hasInfrastructureAssessment: !!sample.infrastructureAssessment,
          keys: Object.keys(sample)
        });
      }

      setAgentProgress(100);
      setOverallProgress(Math.round((2 / AGENTS.length) * 100));

      const output = {
        results: serializedSuccessful,
        failed: failed,
        totalProcessed: results.length,
        successfulCount: serializedSuccessful.length,
        failedCount: failed.length,
        timestamp: new Date().toISOString()
      };

      // CRITICAL: Log before saving
      console.log(`[DEBUG] About to save assessment output. fileUUID: ${fileUUID}, output keys:`, Object.keys(output));
      console.log(`[DEBUG] Output structure:`, {
        hasResults: !!output.results,
        resultsLength: output.results?.length,
        totalProcessed: output.totalProcessed,
        successfulCount: output.successfulCount
      });
      
      // Save to cache with retry logic
      let saveSuccess = false;
      let retries = 3;
      let lastError = null;
      
      while (!saveSuccess && retries > 0) {
        try {
          saveSuccess = await saveAgentOutput(fileUUID, 'assessment', output, {
            totalProcessed: results.length,
            successfulCount: successful.length,
            failedCount: failed.length
          });
          
          if (!saveSuccess) {
            retries--;
            console.warn(`[DEBUG] Failed to save assessment output (attempt ${4-retries}/3), retries remaining: ${retries}, fileUUID: ${fileUUID}`);
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            console.log(`[DEBUG] Assessment output saved successfully. fileUUID: ${fileUUID}`);
          }
        } catch (saveError) {
          lastError = saveError;
          retries--;
          console.error(`[DEBUG] Exception saving assessment output:`, saveError);
          console.error(`[DEBUG] fileUUID: ${fileUUID}, retries remaining: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      if (!saveSuccess) {
        console.error('[DEBUG] Failed to save assessment output to cache after retries');
        console.error('[DEBUG] Last error:', lastError);
        console.error('[DEBUG] fileUUID used:', fileUUID);
        console.error('[DEBUG] Output attempted:', output);
        throw new Error(`Failed to save assessment output to cache. fileUUID: ${fileUUID}, error: ${lastError?.message || 'unknown'}`);
      }
      
      // Verify it was saved - wait a moment for async storage to complete
      await new Promise(resolve => requestAnimationFrame(resolve));
      let verifyCache = await getAgentOutput(fileUUID, 'assessment');
      
      console.log(`[DEBUG] First verification attempt. fileUUID: ${fileUUID}, found: ${!!verifyCache}`);
      
      // Retry verification if needed
      if (!verifyCache) {
        console.warn(`[DEBUG] First verification failed, retrying... fileUUID: ${fileUUID}`);
        await new Promise(resolve => setTimeout(resolve, 200));
        verifyCache = await getAgentOutput(fileUUID, 'assessment');
        console.log(`[DEBUG] Second verification attempt. fileUUID: ${fileUUID}, found: ${!!verifyCache}`);
      }
      
      if (!verifyCache) {
        console.error('[DEBUG] Assessment output was not saved correctly to cache');
        console.error('[DEBUG] fileUUID used for save:', fileUUID);
        console.error('[DEBUG] fileUUID used for retrieve:', fileUUID);
        console.error('[DEBUG] Output that failed to save:', output);
        
        // Try to get all cached agents to see what's actually there
        const { getCachedAgentIds } = await import('../../utils/agentCacheService.js');
        const cachedAgents = await getCachedAgentIds(fileUUID);
        console.error('[DEBUG] Cached agents for this fileUUID:', cachedAgents);
        
        throw new Error(`Assessment output was not saved correctly to cache. fileUUID: ${fileUUID}, cached agents: ${cachedAgents.join(', ')}`);
      }
      
      console.log(`[DEBUG] Assessment output verified successfully. fileUUID: ${fileUUID}, results count: ${verifyCache.results?.length}`);

      if (failed.length > 0) {
        console.warn(`⚠ Assessment Agent: ${successful.length.toLocaleString()} succeeded, ${failed.length.toLocaleString()} failed`);
      } else {
        console.log(`✓ Assessment Agent: Completed (${successful.length.toLocaleString()} assessments)`);
      }

      return output;
    } catch (error) {
      console.error('✗ Assessment Agent failed:', error.message);
      throw error;
    }
  }, [fileUUID]);

  // Execute Strategy Agent
  const executeStrategyAgent = useCallback(async (assessmentOutput) => {
    if (!assessmentOutput || !assessmentOutput.results) {
      throw new Error('Assessment output required for strategy');
    }

    // Check cache first
    const cached = await getAgentOutput(fileUUID, 'strategy');
    if (cached) {
      console.log(`✓ Strategy Agent: Using cached output`);
      return cached;
    }

    setAgentStatus('running');
    startTimeRef.current = Date.now();
    setAgentProgress(0);

    try {
      // Simulate progress for strategy agent
      const progressInterval = setInterval(() => {
        setAgentProgress(prev => Math.min(prev + 2, 100));
        setOverallProgress(Math.round((3 / AGENTS.length) * 100));
      }, 200);

      // Extract workloadIds from assessment results
      // Handle both Assessment entities (with getters) and plain objects
      // SAFETY: Batch workload ID extraction to avoid stack overflow with large datasets
      const workloadIds = [];
      if (assessmentOutput.results && Array.isArray(assessmentOutput.results)) {
        const ID_BATCH_SIZE = 10000;
        for (let i = 0; i < assessmentOutput.results.length; i += ID_BATCH_SIZE) {
          const batch = assessmentOutput.results.slice(i, Math.min(i + ID_BATCH_SIZE, assessmentOutput.results.length));
          for (const r of batch) {
            if (r && typeof r === 'object') {
              const workloadId = r.workloadId || r._workloadId || (r.toJSON && r.toJSON().workloadId) || null;
              if (workloadId) {
                workloadIds.push(workloadId);
              }
            }
          }
        }
      }
      
      if (workloadIds.length === 0) {
        console.error('[DEBUG] Strategy Agent: Assessment results structure:', assessmentOutput);
        console.error('[DEBUG] Strategy Agent: Results array:', assessmentOutput.results);
        if (assessmentOutput.results && assessmentOutput.results.length > 0) {
          console.error('[DEBUG] Strategy Agent: First result structure:', assessmentOutput.results[0]);
          console.error('[DEBUG] Strategy Agent: First result keys:', Object.keys(assessmentOutput.results[0] || {}));
        }
        throw new Error('No workload IDs found in assessment results. Cannot generate migration plan.');
      }
      
      console.log(`[DEBUG] Strategy Agent: Extracted ${workloadIds.length} workload IDs from ${assessmentOutput.results.length} assessment results`);
      
      let strategyResult;
      try {
        strategyResult = await agenticContainer.current.planningAgent.execute({
          workloadIds,
          useCodeMod: false,
          useAI: true
        });
      } catch (error) {
        // If error is about no valid workloads, try fallback: load all workloads from repository
        if (error.message && error.message.includes('No valid workloads found')) {
          console.warn('[DEBUG] Strategy Agent: No workloads found by ID. Attempting fallback: load all workloads from repository.');
          
          if (!workloadRepository.current) {
            const container = getContainer();
            workloadRepository.current = container.workloadRepository;
          }
          
          // Try to reload from storage first
          if (typeof workloadRepository.current._loadFromStorage === 'function') {
            console.log('[DEBUG] Strategy Agent: Reloading repository from IndexedDB storage...');
            try {
              await workloadRepository.current._loadFromStorage();
            } catch (reloadError) {
              console.warn('[DEBUG] Strategy Agent: Failed to reload from storage:', reloadError);
            }
          }
          
          const allWorkloads = await workloadRepository.current.findAll();
          console.log(`[DEBUG] Strategy Agent: Found ${allWorkloads.length} workloads in repository after reload`);
          console.log(`[DEBUG] Strategy Agent: Workload IDs:`, allWorkloads.slice(0, 5).map(w => w.id));
          
          if (allWorkloads.length === 0) {
            // Try one more time with a fresh container instance
            console.warn('[DEBUG] Strategy Agent: Repository still empty. Trying fresh container instance...');
            const freshContainer = getContainer();
            const freshWorkloads = await freshContainer.workloadRepository.findAll();
            console.log(`[DEBUG] Strategy Agent: Fresh container found ${freshWorkloads.length} workloads`);
            
            if (freshWorkloads.length === 0) {
              const errorMessage = 'No workloads found in repository. The migration planning pipeline requires workloads to be discovered first.\n\n' +
                'Please ensure:\n' +
                '1. You have uploaded CUR files using the "Upload CUR Files" button, OR\n' +
                '2. You have clicked "Load Demo Data" button, AND\n' +
                '3. The Discovery Agent has completed successfully\n\n' +
                'If you loaded demo data, make sure you clicked the button and saw a success message. ' +
                'Then try refreshing the page and running the pipeline again.';
              throw new Error(errorMessage);
            }
            
            // Use fresh container's workloads
            const freshWorkloadIds = freshWorkloads.map(w => w.id);
            console.log(`[DEBUG] Strategy Agent: Using ${freshWorkloadIds.length} workloads from fresh container`);
            
            strategyResult = await agenticContainer.current.planningAgent.execute({
              workloadIds: freshWorkloadIds,
              useCodeMod: false,
              useAI: true
            });
          } else {
            // Use all workload IDs from repository
            const allWorkloadIds = allWorkloads.map(w => w.id);
            console.log(`[DEBUG] Strategy Agent: Using ${allWorkloadIds.length} workloads from repository as fallback`);
            
            strategyResult = await agenticContainer.current.planningAgent.execute({
              workloadIds: allWorkloadIds,
              useCodeMod: false,
              useAI: true
            });
          }
        } else {
          // Re-throw if it's a different error
          throw error;
        }
      }

      clearInterval(progressInterval);
      setAgentProgress(100);
      setOverallProgress(Math.round((4 / AGENTS.length) * 100));

      const output = {
        ...strategyResult,
        timestamp: new Date().toISOString()
      };

      await saveAgentOutput(fileUUID, 'strategy', output);
      
      // Verify strategy output was saved correctly
      const verifyStrategyCache = await getAgentOutput(fileUUID, 'strategy');
      if (!verifyStrategyCache) {
        console.error('[DEBUG] Strategy output was not saved correctly to cache');
        console.error('[DEBUG] fileUUID:', fileUUID);
        console.error('[DEBUG] Output that failed to save:', output);
        
        // Try to get all cached agents to see what's actually there
        const cachedAgents = await getCachedAgentIds(fileUUID);
        console.error('[DEBUG] Cached agents for this fileUUID:', cachedAgents);
        
        throw new Error(`Strategy output was not saved correctly to cache. fileUUID: ${fileUUID}, cached agents: ${cachedAgents.join(', ')}`);
      }
      
      console.log(`✓ Strategy Agent: Completed and verified`);

      return output;
    } catch (error) {
      console.error('✗ Strategy Agent failed:', error.message);
      throw error;
    }
  }, [fileUUID]);

  // Execute Cost Agent
  const executeCostAgent = useCallback(async (strategyOutput, assessmentOutput, discoveryOutput) => {
    // Check cache first
    const cached = await getAgentOutput(fileUUID, 'cost');
    if (cached) {
      // CRITICAL: Check if cached output has costEstimates (required for PDF)
      // If missing, regenerate them (for backward compatibility with old cached outputs)
      if (!cached.costEstimates || !Array.isArray(cached.costEstimates) || cached.costEstimates.length === 0) {
        console.log(`✓ Cost Agent: Using cached output, but regenerating costEstimates (missing from cache)`);
        
        // CRITICAL: Load actual Workload entities from repository (not plain objects from discovery output)
        const container = getContainer();
        if (typeof container.workloadRepository._loadFromStorage === 'function') {
          await container.workloadRepository._loadFromStorage();
        }
        
        // Get actual Workload entities from repository
        let workloads = await container.workloadRepository.findAll();
        
        // Fallback to discovery output if repository is empty
        if (workloads.length === 0) {
          workloads = discoveryOutput.workloads || [];
        }
        
        if (workloads.length === 0) {
          console.warn('No workloads found for cost estimation');
          return cached; // Return cached output even without costEstimates
        }
        
        // Regenerate costEstimates
        // aggregateByService returns an array directly, not an object with topServices
        const serviceAggregation = ReportDataAggregator.aggregateByService(workloads);
        
        if (!serviceAggregation || serviceAggregation.length === 0) {
          console.warn('No services found after aggregation');
          return cached; // Return cached output even without costEstimates
        }
        
        const costEstimates = await GCPCostEstimator.estimateAllServiceCosts(
          serviceAggregation, // Pass array directly
          'us-central1'
        );
        
        // Update cached output with costEstimates
        const updatedOutput = {
          ...cached,
          costEstimates,
          timestamp: new Date().toISOString()
        };
        
        // Save updated output back to cache
        await saveAgentOutput(fileUUID, 'cost', updatedOutput);
        console.log(`✓ Cost Agent: Regenerated ${costEstimates.length} cost estimates`);
        
        return updatedOutput;
      }
      
      console.log(`✓ Cost Agent: Using cached output with ${cached.costEstimates.length} cost estimates`);
      return cached;
    }

    setAgentStatus('running');
    startTimeRef.current = Date.now();
    setAgentProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setAgentProgress(prev => {
          const newProgress = Math.min(prev + 5, 100);
          setOverallProgress(Math.round((4 / AGENTS.length) * 100 + (newProgress / AGENTS.length)));
          return newProgress;
        });
      }, 300);

      // Execute Cost Analysis Agent (for TCO, insights, optimizations)
      const costResult = await agenticContainer.current.costAnalysisAgent.execute({
        workloads: discoveryOutput.workloads,
        assessments: assessmentOutput.results,
        strategy: strategyOutput
      });

      // CRITICAL: Generate costEstimates using GCPCostEstimator for PDF generation
      // Load actual Workload entities from repository (not plain objects from discovery output)
      const container = getContainer();
      if (typeof container.workloadRepository._loadFromStorage === 'function') {
        await container.workloadRepository._loadFromStorage();
      }
      
      // Get actual Workload entities from repository
      let workloads = await container.workloadRepository.findAll();
      
      // Fallback to discovery output if repository is empty
      if (workloads.length === 0) {
        workloads = discoveryOutput.workloads || [];
      }
      
      // Aggregate services from workloads
      // aggregateByService returns an array directly, not an object with topServices
      const serviceAggregation = ReportDataAggregator.aggregateByService(workloads);
      
      console.log(`[Cost Agent] Service aggregation result:`, {
        workloadCount: workloads.length,
        serviceCount: serviceAggregation?.length || 0,
        sampleServices: serviceAggregation?.slice(0, 3).map(s => ({
          service: s.service,
          totalCost: s.totalCost,
          count: s.count
        })) || []
      });
      
      if (!serviceAggregation || serviceAggregation.length === 0) {
        const errorMsg = 'No services found after aggregation. Cannot generate cost estimates without services.';
        console.error(`[Cost Agent] ${errorMsg}`, {
          workloadCount: workloads.length,
          workloadsHaveService: workloads.slice(0, 5).map(w => {
            const wData = w.toJSON ? w.toJSON() : w;
            return { hasService: !!wData.service, service: wData.service };
          })
        });
        throw new Error(errorMsg);
      }
      
      // Generate cost estimates for each service
      const costEstimates = await GCPCostEstimator.estimateAllServiceCosts(
        serviceAggregation, // Pass array directly
        'us-central1' // target region
      );
      
      console.log(`[Cost Agent] Generated ${costEstimates.length} cost estimates`);
      
      if (!costEstimates || costEstimates.length === 0) {
        const errorMsg = 'Cost estimation returned empty array. This may indicate an issue with the GCP pricing API or service mapping.';
        console.error(`[Cost Agent] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      clearInterval(progressInterval);
      setAgentProgress(100);
      setOverallProgress(100);

      // Combine both outputs: costResult (TCO, insights) + costEstimates (for PDF)
      const output = {
        ...costResult, // tco, insights, optimizations
        costEstimates, // Array of cost estimates per service (REQUIRED for PDF)
        timestamp: new Date().toISOString()
      };

      await saveAgentOutput(fileUUID, 'cost', output);
      console.log(`✓ Cost Agent: Completed with ${costEstimates.length} cost estimates`);

      return output;
    } catch (error) {
      console.error('✗ Cost Agent failed:', error.message);
      throw error;
    }
  }, [fileUUID]);

  // Execute current agent
  const executeCurrentAgent = useCallback(async () => {
    if (cancelRequestedRef.current) {
      setAgentStatus('cancelled');
      return;
    }

    const agent = AGENTS[currentAgentIndex];
    if (!agent) return;

    try {
      setAgentStatus('running');
      setAgentProgress(0);

      let output = null;

      switch (agent.id) {
        case 'discovery':
          output = await executeDiscoveryAgent();
          break;
        case 'assessment':
          const discoveryOutput = await getAgentOutput(fileUUID, 'discovery');
          if (!discoveryOutput) {
            const availableAgents = await getCachedAgentIds(fileUUID);
            console.error('Discovery output not found in cache. Available agents:', availableAgents);
            throw new Error('Discovery output not found. Please ensure the Discovery Agent completed successfully.');
          }
          if (!discoveryOutput.workloadIds || discoveryOutput.workloadIds.length === 0) {
            console.warn('Discovery output found but has no workloadIds:', discoveryOutput);
            throw new Error('Discovery output is empty. Please rerun the Discovery Agent.');
          }
          
          try {
            output = await executeAssessmentAgent(discoveryOutput);
            
            // Verify assessment output was saved and matches what was returned
            const verifyAssessment = await getAgentOutput(fileUUID, 'assessment');
            if (!verifyAssessment) {
              console.error('Assessment output was not saved after execution');
              console.error('Available agents after assessment:', await getCachedAgentIds(fileUUID));
              throw new Error('Assessment output was not saved. Please rerun the Assessment Agent.');
            }
            if (!output || !output.results || output.results.length === 0) {
              console.error('Assessment agent returned empty output:', output);
              throw new Error('Assessment agent returned empty output. Please rerun the Assessment Agent.');
            }
            // Use the cached version to ensure consistency
            output = verifyAssessment;
          } catch (assessmentError) {
            console.error('Assessment Agent execution failed:', assessmentError);
            // Re-throw to prevent Strategy Agent from running
            throw assessmentError;
          }
          break;
        case 'strategy':
          // Wait a moment to ensure Assessment Agent has finished saving
          await new Promise(resolve => requestAnimationFrame(resolve));
          
          console.log(`[DEBUG] Strategy Agent: Looking for assessment output. fileUUID: ${fileUUID}`);
          const assessmentOutput = await getAgentOutput(fileUUID, 'assessment');
          
          if (!assessmentOutput) {
            const availableAgents = await getCachedAgentIds(fileUUID);
            console.error('[DEBUG] Assessment output not found in cache.');
            console.error('[DEBUG] fileUUID used:', fileUUID);
            console.error('[DEBUG] Available agents:', availableAgents);
            console.error('[DEBUG] This usually means the Assessment Agent failed or did not complete.');
            
            // Try to get raw cache to see what's actually stored
            const { default: localforage } = await import('localforage');
            const cacheKey = `agent_cache_v1_${fileUUID}_assessment`;
            const rawCache = await localforage.getItem(cacheKey);
            console.error('[DEBUG] Raw cache data:', rawCache ? 'exists' : 'null');
            if (rawCache) {
              console.error('[DEBUG] Raw cache fileUUID:', rawCache.fileUUID);
              console.error('[DEBUG] Raw cache version:', rawCache.version);
            }
            
            throw new Error(`Assessment output not found. fileUUID: ${fileUUID}, available agents: ${availableAgents.join(', ')}`);
          }
          
          console.log(`[DEBUG] Strategy Agent: Found assessment output. fileUUID: ${fileUUID}, results count: ${assessmentOutput.results?.length}`);
          if (!assessmentOutput.results || assessmentOutput.results.length === 0) {
            console.warn('Assessment output found but has no results:', assessmentOutput);
            throw new Error('Assessment output is empty. Please rerun the Assessment Agent.');
          }
          
          try {
            output = await executeStrategyAgent(assessmentOutput);
          } catch (strategyError) {
            console.error('Strategy Agent execution failed:', strategyError);
            throw strategyError;
          }
          break;
        case 'cost':
          const strategyOutput = await getAgentOutput(fileUUID, 'strategy');
          const assessmentOutputForCost = await getAgentOutput(fileUUID, 'assessment');
          const discoveryOutputForCost = await getAgentOutput(fileUUID, 'discovery');
          
          // Check which outputs are missing and provide detailed error
          const missingOutputs = [];
          if (!strategyOutput) missingOutputs.push('strategy');
          if (!assessmentOutputForCost) missingOutputs.push('assessment');
          if (!discoveryOutputForCost) missingOutputs.push('discovery');
          
          if (missingOutputs.length > 0) {
            // Get list of available cached agents for debugging
            const availableAgents = await getCachedAgentIds(fileUUID);
            console.error(`[DEBUG] Cost Agent: Missing required outputs: ${missingOutputs.join(', ')}`);
            console.error(`[DEBUG] Cost Agent: Available cached agents: ${availableAgents.join(', ')}`);
            console.error(`[DEBUG] Cost Agent: fileUUID: ${fileUUID}`);
            
            throw new Error(`Required agent outputs not found. Missing: ${missingOutputs.join(', ')}. Available: ${availableAgents.join(', ') || 'none'}. Please ensure all previous agents (Discovery, Assessment, Strategy) have completed successfully.`);
          }
          
          output = await executeCostAgent(strategyOutput, assessmentOutputForCost, discoveryOutputForCost);
          break;
      }

      setAgentOutput(output);
      setAgentStatus('completed');
      setAgentProgress(100);
      
      // Update completed agents list
      setCompletedAgents(prev => {
        if (!prev.includes(agent.id)) {
          return [...prev, agent.id];
        }
        return prev;
      });

      // Move to next agent or complete
      if (currentAgentIndex < AGENTS.length - 1) {
        const nextAgentIndex = currentAgentIndex + 1;
        const nextAgent = AGENTS[nextAgentIndex];
        console.log(`[PIPELINE] ${agent.name} completed. Moving to next agent: ${nextAgent.name} (index ${nextAgentIndex})`);
        
        // Allow UI to update before moving to next agent
        await new Promise(resolve => requestAnimationFrame(resolve));
        setCurrentAgentIndex(nextAgentIndex);
        setAgentProgress(0);
        setAgentStatus('pending');
        setAgentOutput(null);
      } else {
        // Pipeline complete - last agent finished executing
        console.log('[PIPELINE] Last agent finished executing, pipeline complete!');
        setOverallProgress(100);
        
        const allOutputs = {
          discovery: await getAgentOutput(fileUUID, 'discovery'),
          assessment: await getAgentOutput(fileUUID, 'assessment'),
          strategy: await getAgentOutput(fileUUID, 'strategy'),
          cost: await getAgentOutput(fileUUID, 'cost')
        };
        
        console.log('[PIPELINE] Calling onComplete with all outputs:', {
          hasDiscovery: !!allOutputs.discovery,
          hasAssessment: !!allOutputs.assessment,
          hasStrategy: !!allOutputs.strategy,
          hasCost: !!allOutputs.cost
        });
        
        onComplete?.(allOutputs);
      }
    } catch (error) {
      // SAFETY: Check for stack overflow and provide recovery guidance
      if (error instanceof RangeError && (error.message.includes('Maximum call stack size exceeded') || error.message.includes('stack'))) {
        console.error(`[PIPELINE] Stack overflow detected in ${agent.name}. This indicates a memory issue with large datasets.`);
        console.error(`[PIPELINE] The operation needs to be batched. Error:`, error);
        
        // Provide helpful error message
        const stackOverflowError = new Error(
          `${agent.name} failed due to stack overflow. This may occur with very large datasets (500K+ workloads). ` +
          `The operation needs to be batched. Please check the console for details.`
        );
        stackOverflowError.originalError = error;
        error = stackOverflowError;
      }
      
      console.error(`✗ ${agent.name} failed:`, error.message);
      console.error('Full error:', error);
      console.error('Stack trace:', error.stack);
      setAgentStatus('failed');
      setAgentProgress(0);
      onError?.(error, agent.id);
      
      // Save failed state so user can resume
      await savePipelineState(fileUUID, {
        currentAgentIndex,
        overallProgress: Math.round((currentAgentIndex / AGENTS.length) * 100),
        agentProgress: 0,
        agentStatus: 'failed'
      });
      
      // Mark agent as needing rerun
      setNeedsRerun(prev => {
        if (!prev.includes(agent.id)) {
          return [...prev, agent.id];
        }
        return prev;
      });
      
      // Don't auto-advance on failure - let user decide what to do
      toast.error(`${agent.name} failed. Previous steps completed successfully. You can restart from any point.`);
    }
  }, [currentAgentIndex, fileUUID, executeDiscoveryAgent, executeAssessmentAgent, executeStrategyAgent, executeCostAgent, onComplete, onError]);

  // Auto-start pipeline when ready
  useEffect(() => {
    if (!fileUUID || agentStatus !== 'pending') {
      if (fileUUID && agentStatus !== 'pending') {
        console.log(`[PIPELINE] Skipping checkAndStart: fileUUID=${!!fileUUID}, agentStatus=${agentStatus}`);
      }
      return;
    }

    // Check if we should use cached output
    const checkAndStart = async () => {
      const agent = AGENTS[currentAgentIndex];
      if (!agent) {
        console.warn(`[PIPELINE] No agent found at index ${currentAgentIndex}`);
        return;
      }
      
      console.log(`[PIPELINE] checkAndStart: Current agent is ${agent.name} (index ${currentAgentIndex}), status: ${agentStatus}`);
      
      // CRITICAL: Ensure we're not skipping agents - verify all previous required agents completed
      for (let i = 0; i < currentAgentIndex; i++) {
        const prevAgent = AGENTS[i];
        if (prevAgent.required) {
          const prevOutput = await getAgentOutput(fileUUID, prevAgent.id);
          if (!prevOutput) {
            console.error(`[PIPELINE] ERROR: Required agent ${prevAgent.name} (index ${i}) has no output, but we're at ${agent.name} (index ${currentAgentIndex})`);
            console.error(`[PIPELINE] Resetting to missing agent: ${prevAgent.name}`);
            setCurrentAgentIndex(i);
            setAgentStatus('pending');
            setAgentProgress(0);
            return;
          }
        }
      }
      
      // For cost agent, check if all dependencies are available (with retry for race conditions)
      if (agent.id === 'cost') {
        let strategyOutput = await getAgentOutput(fileUUID, 'strategy');
        let assessmentOutput = await getAgentOutput(fileUUID, 'assessment');
        let discoveryOutput = await getAgentOutput(fileUUID, 'discovery');
        
        // Retry once after a short delay if any are missing (handles race condition)
        if (!strategyOutput || !assessmentOutput || !discoveryOutput) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
          strategyOutput = strategyOutput || await getAgentOutput(fileUUID, 'strategy');
          assessmentOutput = assessmentOutput || await getAgentOutput(fileUUID, 'assessment');
          discoveryOutput = discoveryOutput || await getAgentOutput(fileUUID, 'discovery');
        }
        
        if (!strategyOutput || !assessmentOutput || !discoveryOutput) {
          const missing = [];
          if (!strategyOutput) missing.push('strategy');
          if (!assessmentOutput) missing.push('assessment');
          if (!discoveryOutput) missing.push('discovery');
          
          const availableAgents = await getCachedAgentIds(fileUUID);
          console.warn(`Cost Agent dependencies not ready. Missing: ${missing.join(', ')}. Available: ${availableAgents.join(', ') || 'none'}. Waiting...`);
          // Don't execute yet - wait for dependencies (will retry on next render cycle)
          return;
        }
      }
      
      // For strategy agent, check if assessment is available (with retry)
      if (agent.id === 'strategy') {
        let assessmentOutput = await getAgentOutput(fileUUID, 'assessment');
        if (!assessmentOutput) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
          assessmentOutput = await getAgentOutput(fileUUID, 'assessment');
        }
        if (!assessmentOutput) {
          const availableAgents = await getCachedAgentIds(fileUUID);
          console.warn(`Strategy Agent: Assessment output not ready. Available: ${availableAgents.join(', ') || 'none'}. Waiting...`);
          return;
        }
      }
      
      // For assessment agent, check if discovery is available (with retry)
      if (agent.id === 'assessment') {
        let discoveryOutput = await getAgentOutput(fileUUID, 'discovery');
        if (!discoveryOutput) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
          discoveryOutput = await getAgentOutput(fileUUID, 'discovery');
        }
        if (!discoveryOutput) {
          const availableAgents = await getCachedAgentIds(fileUUID);
          console.warn(`Assessment Agent: Discovery output not ready. Available: ${availableAgents.join(', ') || 'none'}. Waiting...`);
          return;
        }
      }
      
      const hasCache = await hasAgentOutput(fileUUID, agent.id);
      
      if (hasCache && agent.id !== 'discovery') {
        // Skip to next agent if cached
        const cached = await getAgentOutput(fileUUID, agent.id);
        setAgentOutput(cached);
        setAgentStatus('completed');
        setAgentProgress(100);
        
        // Update completed agents list
        setCompletedAgents(prev => {
          const updated = prev.includes(agent.id) ? prev : [...prev, agent.id];
          
          // CRITICAL: Check if all agents are complete (especially when using cached outputs)
          if (updated.length === AGENTS.length) {
            console.log('[PIPELINE] All agents completed via cache! Triggering onComplete...');
            setOverallProgress(100);
            
            // Small delay to ensure state is updated, then trigger completion
            setTimeout(async () => {
              const allOutputs = {
                discovery: await getAgentOutput(fileUUID, 'discovery'),
                assessment: await getAgentOutput(fileUUID, 'assessment'),
                strategy: await getAgentOutput(fileUUID, 'strategy'),
                cost: await getAgentOutput(fileUUID, 'cost')
              };
              console.log('[PIPELINE] All cached agents complete: Calling onComplete with all outputs:', {
                hasDiscovery: !!allOutputs.discovery,
                hasAssessment: !!allOutputs.assessment,
                hasStrategy: !!allOutputs.strategy,
                hasCost: !!allOutputs.cost
              });
              onComplete?.(allOutputs);
            }, 100);
          }
          
          return updated;
        });
        
        if (currentAgentIndex < AGENTS.length - 1) {
          setTimeout(() => {
            setCurrentAgentIndex(prev => Math.min(prev + 1, AGENTS.length - 1));
            setAgentProgress(0);
            setAgentStatus('pending');
            setAgentOutput(null);
          }, 500);
        } else {
          // Last agent completed via cache - ensure progress is 100% and trigger completion
          console.log('[PIPELINE] Last agent completed via cache, setting progress to 100%');
          setOverallProgress(100);
          
          // Trigger completion after a short delay
          setTimeout(async () => {
            const allOutputs = {
              discovery: await getAgentOutput(fileUUID, 'discovery'),
              assessment: await getAgentOutput(fileUUID, 'assessment'),
              strategy: await getAgentOutput(fileUUID, 'strategy'),
              cost: await getAgentOutput(fileUUID, 'cost')
            };
            console.log('[PIPELINE] Last cached agent: Calling onComplete with all outputs');
            onComplete?.(allOutputs);
          }, 200);
        }
      } else {
        // Execute agent
        executeCurrentAgent();
      }
    };

    checkAndStart();
  }, [fileUUID, currentAgentIndex, agentStatus, executeCurrentAgent]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    cancelRequestedRef.current = true;
    setAgentStatus('cancelled');
    toast.info('Pipeline cancelled. You can resume from the last completed agent.');
  }, []);

  // Handle rerun agent - restart from a specific agent
  const handleRerunAgent = useCallback(async (agentId, clearDependents = true) => {
    const agentIndex = AGENTS.findIndex(a => a.id === agentId);
    if (agentIndex === -1) return;

    // Clear cache for this agent
    await clearAgentOutput(fileUUID, agentId);
    
    // Optionally clear dependent agents (agents that come after this one)
    if (clearDependents) {
      const agentIdsToClear = [];
      for (let i = agentIndex + 1; i < AGENTS.length; i++) {
        agentIdsToClear.push(AGENTS[i].id);
      }
      for (const id of agentIdsToClear) {
        await clearAgentOutput(fileUUID, id);
      }
    }

    // Navigate to this agent and reset its state
    setCurrentAgentIndex(agentIndex);
    setAgentStatus('pending');
    setAgentProgress(0);
    setAgentOutput(null);
    setNeedsRerun(prev => prev.filter(id => id !== agentId));
    cancelRequestedRef.current = false;
    
    // Update completed agents list (remove this agent and all subsequent ones)
    setCompletedAgents(prev => {
      const agentIndexToRemove = AGENTS.findIndex(a => a.id === agentId);
      return prev.filter(id => {
        const idIndex = AGENTS.findIndex(a => a.id === id);
        return idIndex < agentIndexToRemove; // Keep only agents before this one
      });
    });
    
    // Update pipeline state
    await savePipelineState(fileUUID, {
      currentAgentIndex: agentIndex,
      overallProgress: Math.round((agentIndex / AGENTS.length) * 100),
      agentProgress: 0,
      agentStatus: 'pending'
    });
    
    toast.info(`Restarting from ${AGENTS[agentIndex].name}...`);
  }, [fileUUID]);

  // Removed unused handleRestartPipeline and handleResumePipeline functions
  // Pipeline auto-resumes and users can restart by clicking agent steps below

  // Show loading state while restoring
  if (isRestoringState) {
    return (
      <div className="pipeline-orchestrator">
        <div className="alert alert-info">Restoring pipeline state...</div>
      </div>
    );
  }

  if (!fileUUID) {
    return (
      <div className="pipeline-orchestrator">
        <div className="alert alert-info">Initializing pipeline...</div>
      </div>
    );
  }

  const currentAgent = AGENTS[currentAgentIndex];
  const isLastAgent = currentAgentIndex === AGENTS.length - 1;

  // Safety check: if currentAgent is undefined, try to recover from saved state first
  if (!currentAgent) {
    console.warn(`PipelineOrchestrator: Invalid currentAgentIndex ${currentAgentIndex}, attempting recovery`);
    
    // Try to recover by checking saved state
    const recoverState = async () => {
      try {
        const savedState = await getPipelineState(fileUUID);
        if (savedState && savedState.currentAgentIndex !== undefined) {
          const validIndex = Math.max(0, Math.min(savedState.currentAgentIndex, AGENTS.length - 1));
          setCurrentAgentIndex(validIndex);
          setOverallProgress(savedState.overallProgress || 0);
          setAgentProgress(savedState.agentProgress || 0);
          setAgentStatus(savedState.agentStatus || 'pending');
          return;
        }
      } catch (error) {
        console.error('Error recovering state:', error);
      }
      
      // If recovery fails, reset to first agent
      if (currentAgentIndex !== 0) {
        setCurrentAgentIndex(0);
        setOverallProgress(0);
        setAgentProgress(0);
        setAgentStatus('pending');
      }
    };
    
    recoverState();
    
    return (
      <div className="pipeline-orchestrator">
        <div className="alert alert-warning">Recovering pipeline state...</div>
      </div>
    );
  }

  return (
    <div className="pipeline-orchestrator">
      <div className="pipeline-header">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3 className="mb-0">Migration Pipeline</h3>
          {completedAgents.length > 0 && (
            <div className="text-muted small">
              {completedAgents.length} of {AGENTS.length} agents completed
            </div>
          )}
        </div>
        <div className="overall-progress">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="progress-text">{overallProgress}% Complete</span>
        </div>
        {completedAgents.length > 0 && agentStatus !== 'running' && (
          <div className="mt-2">
            <small className="text-muted">
              Completed: {completedAgents.map(id => AGENTS.find(a => a.id === id)?.name).filter(Boolean).join(', ')}
            </small>
          </div>
        )}
      </div>

      <div className="agent-display">
        <div className="agent-info">
          <span className="agent-icon">{currentAgent.icon}</span>
          <div className="agent-details">
            <h4>{currentAgent.name}</h4>
            <p>{currentAgent.description}</p>
          </div>
        </div>

        <div className="agent-progress">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${agentProgress}%` }}
            />
          </div>
          <div className="progress-details">
            <span>{agentProgress}%</span>
            {estimatedTimeRemaining && (
              <span className="time-remaining">Est. {estimatedTimeRemaining} remaining</span>
            )}
          </div>
        </div>

        {agentStatus === 'running' && (
          <button 
            className="btn btn-sm btn-outline-danger mt-2"
            onClick={handleCancel}
          >
            Cancel
          </button>
        )}

        {agentStatus === 'failed' && (
          <div className="alert alert-danger mt-3">
            <p><strong>{currentAgent.name} failed.</strong></p>
            <p className="mb-2">Click the agent step below to restart from that point, or click "Rerun" to retry this agent.</p>
            <div className="d-flex gap-2 flex-wrap">
              <button 
                className="btn btn-sm btn-primary"
                onClick={() => handleRerunAgent(currentAgent.id)}
              >
                ↻ Rerun {currentAgent.name}
              </button>
            </div>
          </div>
        )}

        {needsRerun.includes(currentAgent.id) && (
          <div className="alert alert-warning mt-3">
            <p><strong>Action Required:</strong> {currentAgent.name} needs to be rerun.</p>
            <div className="d-flex gap-2 flex-wrap">
              <button 
                className="btn btn-sm btn-primary"
                onClick={() => handleRerunAgent(currentAgent.id)}
              >
                ↻ Rerun {currentAgent.name}
              </button>
            </div>
          </div>
        )}

        {/* Removed pause/resume buttons - pipeline auto-resumes when ready */}
      </div>

      <div className="pipeline-steps">
        {AGENTS.map((agent, index) => {
          const isCompleted = completedAgents.includes(agent.id) || index < currentAgentIndex;
          const isActive = index === currentAgentIndex;
          const hasCachedOutput = completedAgents.includes(agent.id);
          
          return (
            <div 
              key={agent.id}
              className={`pipeline-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${hasCachedOutput ? 'has-cache' : ''}`}
              style={{ 
                cursor: hasCachedOutput ? 'pointer' : 'default',
                opacity: hasCachedOutput ? 1 : (isActive ? 1 : 0.6)
              }}
              onClick={async () => {
                if (hasCachedOutput && !isActive) {
                  // Restart from this agent (clears this and all subsequent agents)
                  await handleRerunAgent(agent.id, true);
                }
              }}
              title={hasCachedOutput && !isActive ? `Click to restart from ${agent.name}` : (isActive ? `Currently running: ${agent.name}` : '')}
            >
              <span className="step-icon">
                {hasCachedOutput ? '✓' : agent.icon}
              </span>
              <span className="step-name">{agent.name}</span>
              {hasCachedOutput && (
                <span className="step-status" style={{ fontSize: '0.75rem', color: '#28a745', marginLeft: '0.5rem' }}>
                  ✓ Cached
                </span>
              )}
              {isActive && agentStatus === 'failed' && (
                <span className="step-status" style={{ fontSize: '0.75rem', color: '#dc3545', marginLeft: '0.5rem' }}>
                  ✗ Failed
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
