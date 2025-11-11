/**
 * Agentic Workflow View
 * 
 * Main component showing the complete agentic workflow
 * Users see agents processing in real-time as they work through the flow
 */

import React, { useState, useEffect } from 'react';
import { getAgenticContainer } from '../../agentic/dependency_injection/AgenticContainer.js';
import { agentStatusManager } from '../../agentic/core/AgentStatusManager.js';
import { agentEventEmitter } from '../../agentic/core/AgentEventEmitter.js';
import AgentStatusDashboard from './AgentStatusDashboard.js';
import AgentActivityLog from './AgentActivityLog.js';

function AgenticWorkflowView({ workloadIds = [], costInputs = null }) {
  const [workflowState, setWorkflowState] = useState('idle'); // idle, running, completed, error
  const [currentStep, setCurrentStep] = useState(null);
  const [workflowProgress, setWorkflowProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const [showActivityLog, setShowActivityLog] = useState(true);

  const agenticContainer = getAgenticContainer();

  useEffect(() => {
    // Subscribe to workflow events
    const unsubscribe = agentEventEmitter.subscribe('workflow', (event) => {
      if (event.eventType === 'step-started') {
        setCurrentStep(event.step);
        setWorkflowProgress(event.progress || 0);
      } else if (event.eventType === 'completed') {
        setWorkflowState('completed');
        setWorkflowProgress(100);
        setResults(event.result);
      } else if (event.eventType === 'error') {
        setWorkflowState('error');
        setError(event.error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const executeCompleteWorkflow = async () => {
    if (!workloadIds || workloadIds.length === 0) {
      setError('No workloads available. Please discover workloads first.');
      return;
    }

    setWorkflowState('running');
    setError(null);
    setResults(null);
    setCurrentStep('Initializing workflow...');
    setWorkflowProgress(0);

    try {
      // Emit workflow start event
      agentEventEmitter.emit('workflow', 'workflow-started', {
        workflowId: 'migration-workflow',
        workloadIds,
        startedAt: Date.now()
      });

      // Execute complete workflow through orchestrator
      const orchestrator = agenticContainer.orchestrator;
      const result = await orchestrator.executeMigrationWorkflow({
        workloadIds,
        costInputs
      });

      setResults(result);
      setWorkflowState('completed');
      setWorkflowProgress(100);
      setCurrentStep('Workflow completed successfully');

      // Emit workflow completion event
      agentEventEmitter.emit('workflow', 'workflow-completed', {
        workflowId: 'migration-workflow',
        result,
        completedAt: Date.now()
      });
    } catch (err) {
      setError(err.message || 'Workflow execution failed');
      setWorkflowState('error');
      setCurrentStep('Workflow failed');

      // Emit workflow error event
      agentEventEmitter.emit('workflow', 'workflow-error', {
        workflowId: 'migration-workflow',
        error: err.message,
        failedAt: Date.now()
      });
    }
  };

  const executeStep = async (stepName, agentMethod) => {
    setCurrentStep(stepName);
    try {
      const result = await agentMethod();
      return result;
    } catch (error) {
      throw error;
    }
  };

  const executeAssessment = async () => {
    setWorkflowState('running');
    setError(null);
    setCurrentStep('Running Assessment Agent...');
    
    try {
      const result = await executeStep(
        'Assessment Agent',
        () => agenticContainer.assessmentAgent.assessBatch({
          workloadIds,
          parallel: true
        })
      );
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const executePlanning = async () => {
    setWorkflowState('running');
    setError(null);
    setCurrentStep('Running Planning Agent...');
    
    try {
      const result = await executeStep(
        'Planning Agent',
        () => agenticContainer.planningAgent.generateAutonomousStrategy({
          workloadIds
        })
      );
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const executeCostAnalysis = async () => {
    if (!costInputs) {
      throw new Error('Cost inputs required for cost analysis');
    }

    setWorkflowState('running');
    setError(null);
    setCurrentStep('Running Cost Analysis Agent...');
    
    try {
      const result = await executeStep(
        'Cost Analysis Agent',
        () => agenticContainer.costAnalysisAgent.execute(costInputs)
      );
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return (
    <div className="agentic-workflow-view">
      <div className="card mb-3">
        <div className="card-header bg-gradient bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-0">🤖 Agentic Migration Workflow</h4>
              <small>Watch agents work autonomously through the complete migration process</small>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-light"
                onClick={() => setShowDashboard(!showDashboard)}
              >
                {showDashboard ? 'Hide' : 'Show'} Dashboard
              </button>
              <button
                className="btn btn-sm btn-light"
                onClick={() => setShowActivityLog(!showActivityLog)}
              >
                {showActivityLog ? 'Hide' : 'Show'} Activity Log
              </button>
            </div>
          </div>
        </div>
        <div className="card-body">
          {/* Workflow Status */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5>Workflow Status</h5>
              <span className={`badge bg-${
                workflowState === 'completed' ? 'success' :
                workflowState === 'running' ? 'primary' :
                workflowState === 'error' ? 'danger' :
                'secondary'
              }`}>
                {workflowState.toUpperCase()}
              </span>
            </div>

            {currentStep && (
              <div className="mb-2">
                <strong>Current Step:</strong> {currentStep}
              </div>
            )}

            {workflowProgress > 0 && (
              <div className="mb-2">
                <div className="d-flex justify-content-between mb-1">
                  <small>Overall Progress</small>
                  <small>{workflowProgress}%</small>
                </div>
                <div className="progress" style={{ height: '20px' }}>
                  <div
                    className={`progress-bar ${
                      workflowState === 'completed' ? 'bg-success' :
                      workflowState === 'error' ? 'bg-danger' :
                      'bg-primary progress-bar-striped progress-bar-animated'
                    }`}
                    role="progressbar"
                    style={{ width: `${workflowProgress}%` }}
                  >
                    {workflowProgress}%
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-danger mt-3">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          {/* Agent Actions */}
          <div className="mb-4">
            <h5>Agent Actions</h5>
            <div className="row">
              <div className="col-md-4 mb-2">
                <button
                  className="btn btn-outline-primary w-100"
                  onClick={executeAssessment}
                  disabled={workflowState === 'running' || !workloadIds?.length}
                >
                  🔍 Run Assessment Agent
                </button>
              </div>
              <div className="col-md-4 mb-2">
                <button
                  className="btn btn-outline-primary w-100"
                  onClick={executePlanning}
                  disabled={workflowState === 'running' || !workloadIds?.length}
                >
                  📋 Run Planning Agent
                </button>
              </div>
              <div className="col-md-4 mb-2">
                <button
                  className="btn btn-outline-primary w-100"
                  onClick={executeCostAnalysis}
                  disabled={workflowState === 'running' || !costInputs}
                >
                  💰 Run Cost Analysis Agent
                </button>
              </div>
            </div>
            <div className="mt-3">
              <button
                className="btn btn-primary btn-lg w-100"
                onClick={executeCompleteWorkflow}
                disabled={workflowState === 'running' || !workloadIds?.length}
              >
                {workflowState === 'running' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Agents Working... ({currentStep})
                  </>
                ) : (
                  '🚀 Execute Complete Workflow (All Agents)'
                )}
              </button>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className="mt-4">
              <h5>Workflow Results</h5>
              <div className="card bg-light">
                <div className="card-body">
                  <pre style={{ fontSize: '12px', maxHeight: '400px', overflow: 'auto' }}>
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agent Status Dashboard */}
      {showDashboard && (
        <div className="mb-3">
          <AgentStatusDashboard />
        </div>
      )}

      {/* Activity Log */}
      {showActivityLog && (
        <div>
          <AgentActivityLog />
        </div>
      )}
    </div>
  );
}

export default AgenticWorkflowView;
