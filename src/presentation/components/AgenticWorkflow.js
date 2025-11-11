/**
 * Agentic Workflow Component
 * 
 * Demonstrates agentic capabilities - agents execute autonomously
 */

import React, { useState } from 'react';
import { getAgenticContainer } from '../../agentic/dependency_injection/AgenticContainer.js';

/**
 * Agentic Workflow Component
 * 
 * Shows how agents can execute complete workflows autonomously
 */
function AgenticWorkflow({ workloadIds, costInputs }) {
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const agenticContainer = getAgenticContainer();
  const orchestrator = agenticContainer.orchestrator;

  /**
   * Execute complete migration workflow autonomously
   */
  const handleExecuteWorkflow = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await orchestrator.executeMigrationWorkflow({
        workloadIds,
        costInputs
      });

      setWorkflow(result);
    } catch (error) {
      console.error('Agentic workflow failed:', error);
      setError(`Workflow failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Execute individual agent
   */
  const handleExecuteAgent = async (agentType) => {
    setLoading(true);
    setError(null);

    try {
      let result;
      const container = agenticContainer;

      switch (agentType) {
        case 'assessment':
          result = await container.assessmentAgent.assessBatch({
            workloadIds,
            parallel: true
          });
          break;
        case 'planning':
          result = await container.planningAgent.generateAutonomousStrategy({
            workloadIds
          });
          break;
        case 'cost':
          result = await container.costAnalysisAgent.execute(costInputs);
          break;
        default:
          throw new Error(`Unknown agent: ${agentType}`);
      }

      setWorkflow({ agent: agentType, result });
    } catch (error) {
      console.error('Agent execution failed:', error);
      setError(`Agent failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header bg-primary text-white">
        <h3 className="mb-0">🤖 Agentic Migration Workflow</h3>
        <small>Autonomous agents execute complete migration workflows</small>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger">{error}</div>
        )}

        <div className="mb-4">
          <h5>Agentic Capabilities</h5>
          <div className="row">
            <div className="col-md-4 mb-2">
              <button
                className="btn btn-outline-primary w-100"
                onClick={() => handleExecuteAgent('assessment')}
                disabled={loading || !workloadIds?.length}
              >
                🔍 Assessment Agent
              </button>
            </div>
            <div className="col-md-4 mb-2">
              <button
                className="btn btn-outline-primary w-100"
                onClick={() => handleExecuteAgent('planning')}
                disabled={loading || !workloadIds?.length}
              >
                📋 Planning Agent
              </button>
            </div>
            <div className="col-md-4 mb-2">
              <button
                className="btn btn-outline-primary w-100"
                onClick={() => handleExecuteAgent('cost')}
                disabled={loading || !costInputs}
              >
                💰 Cost Analysis Agent
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <button
            className="btn btn-primary btn-lg w-100"
            onClick={handleExecuteWorkflow}
            disabled={loading || !workloadIds?.length}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Agents Working...
              </>
            ) : (
              '🚀 Execute Complete Workflow (Autonomous)'
            )}
          </button>
        </div>

        {workflow && (
          <div className="card bg-light">
            <div className="card-header">
              <h5>Agentic Workflow Results</h5>
            </div>
            <div className="card-body">
              <pre style={{ fontSize: '12px', maxHeight: '400px', overflow: 'auto' }}>
                {JSON.stringify(workflow, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgenticWorkflow;
