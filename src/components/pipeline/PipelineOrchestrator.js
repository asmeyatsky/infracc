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
            setCurrentAgentIndex(savedState.currentAgentIndex);
            setOverallProgress(savedState.overallProgress || 0);
            
            // Check which agents need rerun
            const cachedAgents = await getCachedAgentIds(propFileUUID);
            const requiredAgents = AGENTS.filter(a => a.required).map(a => a.id);
            const needsRerunList = requiredAgents.filter(id => !cachedAgents.includes(id));
            setNeedsRerun(needsRerunList);
          }
        } catch (error) {
          console.error('Error restoring pipeline state:', error);
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
            setCurrentAgentIndex(savedState.currentAgentIndex);
            setOverallProgress(savedState.overallProgress || 0);
            
            // Check which agents need rerun
            const cachedAgents = await getCachedAgentIds(uuid);
            const requiredAgents = AGENTS.filter(a => a.required).map(a => a.id);
            const needsRerunList = requiredAgents.filter(id => !cachedAgents.includes(id));
            setNeedsRerun(needsRerunList);
          }
        }
      } catch (error) {
        console.error('Error initializing UUID:', error);
        onError?.(error);
      }
    };

    initializeUUID();
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
      // Files are already processed by CurUploadButton, so we just read from repository
      // Wait a bit for processing to complete if it's still running
      let attempts = 0;
      let workloads = [];
      
      while (attempts < 100) { // Wait up to 10 seconds
        workloads = await workloadRepository.current.findAll();
        if (workloads.length > 0) {
          break;
        }
        setAgentProgress(Math.min(attempts, 90)); // Show progress while waiting
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (workloads.length === 0) {
        throw new Error('No workloads found in repository. Please ensure files are uploaded and processed.');
      }

      const workloadIds = workloads.map(w => w.id);
      setAgentProgress(100);

      const output = {
        workloads,
        workloadIds,
        workloadCount: workloads.length,
        summary: {
          uniqueWorkloads: workloads.length,
          totalRegions: new Set(workloads.map(w => w.region)).size
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
      const { workloadIds } = discoveryOutput;
      const totalWorkloads = workloadIds.length;

      // Subscribe to agent status updates for progress tracking
      const progressUnsubscribe = agentStatusManager.subscribe(() => {
        const agentStatus = agentStatusManager.getAgentStatus('AssessmentAgent');
        if (agentStatus && agentStatus.progress !== undefined) {
          const progress = agentStatus.progress;
          setAgentProgress(progress);
          setOverallProgress(Math.round((1 / AGENTS.length) * 100 + (progress / AGENTS.length)));
        }
      });

      const assessmentResult = await agenticContainer.current.assessmentAgent.assessBatch({
        workloadIds,
        parallel: true
      });

      // Unsubscribe from progress updates
      if (progressUnsubscribe) {
        progressUnsubscribe();
      }

      // Process results - handle partial success
      const results = assessmentResult?.results || [];
      const successful = results.filter(r => !r.error);
      const failed = results.filter(r => r.error);

      setAgentProgress(100);
      setOverallProgress(Math.round((2 / AGENTS.length) * 100));

      const output = {
        results: successful,
        failed: failed,
        totalProcessed: results.length,
        successfulCount: successful.length,
        failedCount: failed.length,
        timestamp: new Date().toISOString()
      };

      // Save to cache
      await saveAgentOutput(fileUUID, 'assessment', output, {
        totalProcessed: results.length,
        successfulCount: successful.length,
        failedCount: failed.length
      });

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

      const strategyResult = await agenticContainer.current.planningAgent.execute({
        assessmentResults: assessmentOutput
      });

      clearInterval(progressInterval);
      setAgentProgress(100);
      setOverallProgress(Math.round((4 / AGENTS.length) * 100));

      const output = {
        ...strategyResult,
        timestamp: new Date().toISOString()
      };

      await saveAgentOutput(fileUUID, 'strategy', output);
      console.log(`✓ Strategy Agent: Completed`);

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
      console.log(`✓ Cost Agent: Using cached output`);
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

      const costResult = await agenticContainer.current.costAnalysisAgent.execute({
        workloads: discoveryOutput.workloads,
        assessments: assessmentOutput.results,
        strategy: strategyOutput
      });

      clearInterval(progressInterval);
      setAgentProgress(100);
      setOverallProgress(100);

      const output = {
        ...costResult,
        timestamp: new Date().toISOString()
      };

      await saveAgentOutput(fileUUID, 'cost', output);
      console.log(`✓ Cost Agent: Completed`);

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
            throw new Error('Discovery output not found');
          }
          output = await executeAssessmentAgent(discoveryOutput);
          break;
        case 'strategy':
          const assessmentOutput = await getAgentOutput(fileUUID, 'assessment');
          if (!assessmentOutput) {
            throw new Error('Assessment output not found');
          }
          output = await executeStrategyAgent(assessmentOutput);
          break;
        case 'cost':
          const strategyOutput = await getAgentOutput(fileUUID, 'strategy');
          const assessmentOutputForCost = await getAgentOutput(fileUUID, 'assessment');
          const discoveryOutputForCost = await getAgentOutput(fileUUID, 'discovery');
          if (!strategyOutput || !assessmentOutputForCost || !discoveryOutputForCost) {
            throw new Error('Required agent outputs not found');
          }
          output = await executeCostAgent(strategyOutput, assessmentOutputForCost, discoveryOutputForCost);
          break;
      }

      setAgentOutput(output);
      setAgentStatus('completed');
      setAgentProgress(100);

      // Move to next agent or complete
      if (currentAgentIndex < AGENTS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
        setCurrentAgentIndex(prev => prev + 1);
        setAgentProgress(0);
        setAgentStatus('pending');
        setAgentOutput(null);
      } else {
        // Pipeline complete
        const allOutputs = {
          discovery: await getAgentOutput(fileUUID, 'discovery'),
          assessment: await getAgentOutput(fileUUID, 'assessment'),
          strategy: await getAgentOutput(fileUUID, 'strategy'),
          cost: await getAgentOutput(fileUUID, 'cost')
        };
        onComplete?.(allOutputs);
      }
    } catch (error) {
      console.error(`✗ ${agent.name} failed:`, error.message);
      setAgentStatus('failed');
      onError?.(error, agent.id);
      
      // If assessment fails and it's required, stop pipeline
      if (agent.required && agent.id === 'assessment') {
        setNeedsRerun(prev => [...prev, agent.id]);
        return;
      }
    }
  }, [currentAgentIndex, fileUUID, executeDiscoveryAgent, executeAssessmentAgent, executeStrategyAgent, executeCostAgent, onComplete, onError]);

  // Auto-start pipeline when ready
  useEffect(() => {
    if (!fileUUID || agentStatus !== 'pending') return;

    // Check if we should use cached output
    const checkAndStart = async () => {
      const agent = AGENTS[currentAgentIndex];
      const hasCache = await hasAgentOutput(fileUUID, agent.id);
      
      if (hasCache && agent.id !== 'discovery') {
        // Skip to next agent if cached
        const cached = await getAgentOutput(fileUUID, agent.id);
        setAgentOutput(cached);
        setAgentStatus('completed');
        setAgentProgress(100);
        
        if (currentAgentIndex < AGENTS.length - 1) {
          setTimeout(() => {
            setCurrentAgentIndex(prev => prev + 1);
            setAgentProgress(0);
            setAgentStatus('pending');
            setAgentOutput(null);
          }, 500);
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

  // Handle rerun agent
  const handleRerunAgent = useCallback(async (agentId) => {
    const agentIndex = AGENTS.findIndex(a => a.id === agentId);
    if (agentIndex === -1) return;

    // Clear cache for this agent and all dependent agents
    const agentIdsToClear = [];
    for (let i = agentIndex; i < AGENTS.length; i++) {
      agentIdsToClear.push(AGENTS[i].id);
    }

    for (const id of agentIdsToClear) {
      await clearAgentOutput(fileUUID, id);
    }

    setCurrentAgentIndex(agentIndex);
    setAgentStatus('pending');
    setAgentProgress(0);
    setNeedsRerun(prev => prev.filter(id => id !== agentId));
    cancelRequestedRef.current = false;
  }, [fileUUID]);

  if (!fileUUID) {
    return (
      <div className="pipeline-orchestrator">
        <div className="alert alert-info">Initializing pipeline...</div>
      </div>
    );
  }

  const currentAgent = AGENTS[currentAgentIndex];
  const isLastAgent = currentAgentIndex === AGENTS.length - 1;

  return (
    <div className="pipeline-orchestrator">
      <div className="pipeline-header">
        <h3>Migration Pipeline</h3>
        <div className="overall-progress">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="progress-text">{overallProgress}% Complete</span>
        </div>
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
            <button 
              className="btn btn-sm btn-primary"
              onClick={() => handleRerunAgent(currentAgent.id)}
            >
              Rerun {currentAgent.name}
            </button>
          </div>
        )}

        {needsRerun.includes(currentAgent.id) && (
          <div className="alert alert-warning mt-3">
            <p><strong>Action Required:</strong> {currentAgent.name} needs to be rerun.</p>
            <button 
              className="btn btn-sm btn-primary"
              onClick={() => handleRerunAgent(currentAgent.id)}
            >
              Rerun {currentAgent.name}
            </button>
          </div>
        )}
      </div>

      <div className="pipeline-steps">
        {AGENTS.map((agent, index) => (
          <div 
            key={agent.id}
            className={`pipeline-step ${index === currentAgentIndex ? 'active' : ''} ${index < currentAgentIndex ? 'completed' : ''}`}
          >
            <span className="step-icon">
              {index < currentAgentIndex ? '✓' : agent.icon}
            </span>
            <span className="step-name">{agent.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
