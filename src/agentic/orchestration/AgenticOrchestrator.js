/**
 * Agentic Orchestrator
 * 
 * Architectural Intent:
 * - Orchestrates multiple agents for complex workflows
 * - Coordinates agents with Clean Architecture use cases
 * - Manages agent state and communication
 * - Enables autonomous multi-agent collaboration
 */

import AssessmentAgent from '../agents/AssessmentAgent.js';
import PlanningAgent from '../agents/PlanningAgent.js';
import CostAnalysisAgent from '../agents/CostAnalysisAgent.js';
import { agentEventEmitter } from '../core/AgentEventEmitter.js';
import { agentStatusManager } from '../core/AgentStatusManager.js';

/**
 * Agent Status
 */
export const AgentStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  ERROR: 'error',
  WAITING: 'waiting'
};

/**
 * Agentic Orchestrator
 * 
 * Coordinates multiple agents to execute complex migration workflows
 * Uses Clean Architecture use cases internally
 */
export class AgenticOrchestrator {
  /**
   * @param {Object} dependencies - Container with all use cases
   */
  constructor(dependencies) {
    // Create agents with use cases from container
    this.assessmentAgent = new AssessmentAgent({
      assessWorkloadUseCase: dependencies.assessWorkloadUseCase,
      assessmentService: dependencies.workloadAssessmentService,
      aiConfig: dependencies.aiConfig
    });

    this.planningAgent = new PlanningAgent({
      generateMigrationPlanUseCase: dependencies.generateMigrationPlanUseCase,
      planMigrationWavesUseCase: dependencies.planMigrationWavesUseCase,
      aiConfig: dependencies.aiConfig
    });

    this.costAnalysisAgent = new CostAnalysisAgent({
      calculateTCOUseCase: dependencies.calculateTCOUseCase,
      aiConfig: dependencies.aiConfig
    });

    // Agent state tracking
    this.agentStates = new Map();
    this.workflowHistory = [];
  }

  /**
   * Execute complete migration workflow autonomously with visible processing
   * @param {Object} input
   * @param {string[]} input.workloadIds - Workload IDs to migrate
   * @param {Object} input.costInputs - Cost inputs for TCO
   * @returns {Promise<Object>} Complete migration plan
   */
  async executeMigrationWorkflow(input) {
    const { workloadIds, costInputs } = input;
    const workflowId = this._generateWorkflowId();

    const workflow = {
      workflowId,
      startedAt: new Date().toISOString(),
      steps: [],
      results: {}
    };

    // Emit workflow start
    agentEventEmitter.emit('workflow', 'workflow-started', {
      workflowId,
      workloadIds,
      startedAt: Date.now()
    });

    agentStatusManager.updateWorkflowStatus(workflowId, {
      status: 'running',
      currentStep: 'Initializing workflow',
      progress: 0,
      steps: []
    });

    try {
      const totalSteps = costInputs ? 3 : 2;
      let currentStep = 0;

      // Step 1: Assess all workloads (Assessment Agent)
      currentStep = 1;
      agentEventEmitter.emit('workflow', 'step-started', {
        workflowId,
        step: 1,
        stepName: 'Assessment',
        agent: 'AssessmentAgent',
        progress: Math.round((currentStep / totalSteps) * 100)
      });
      agentStatusManager.updateWorkflowStatus(workflowId, {
        currentStep: 'Assessment',
        progress: Math.round((currentStep / totalSteps) * 100)
      });

      workflow.steps.push({
        step: 1,
        agent: 'assessment',
        action: 'Assessing workloads',
        startedAt: new Date().toISOString()
      });

      const assessmentResults = await this.assessmentAgent.assessBatch({
        workloadIds,
        parallel: true
      });

      workflow.steps[0].completedAt = new Date().toISOString();
      workflow.results.assessments = assessmentResults;

      agentEventEmitter.emit('workflow', 'step-completed', {
        workflowId,
        step: 1,
        stepName: 'Assessment',
        result: assessmentResults
      });

      // Step 2: Generate migration plan (Planning Agent)
      currentStep = 2;
      agentEventEmitter.emit('workflow', 'step-started', {
        workflowId,
        step: 2,
        stepName: 'Planning',
        agent: 'PlanningAgent',
        progress: Math.round((currentStep / totalSteps) * 100)
      });
      agentStatusManager.updateWorkflowStatus(workflowId, {
        currentStep: 'Planning',
        progress: Math.round((currentStep / totalSteps) * 100)
      });

      workflow.steps.push({
        step: 2,
        agent: 'planning',
        action: 'Generating migration plan',
        startedAt: new Date().toISOString()
      });

      const migrationPlan = await this.planningAgent.generateAutonomousStrategy({
        workloadIds,
        useCodeMod: true,
        useAI: true
      });

      workflow.steps[1].completedAt = new Date().toISOString();
      workflow.results.migrationPlan = migrationPlan;

      agentEventEmitter.emit('workflow', 'step-completed', {
        workflowId,
        step: 2,
        stepName: 'Planning',
        result: migrationPlan
      });

      // Step 3: Cost analysis (Cost Analysis Agent)
      if (costInputs) {
        currentStep = 3;
        agentEventEmitter.emit('workflow', 'step-started', {
          workflowId,
          step: 3,
          stepName: 'Cost Analysis',
          agent: 'CostAnalysisAgent',
          progress: Math.round((currentStep / totalSteps) * 100)
        });
        agentStatusManager.updateWorkflowStatus(workflowId, {
          currentStep: 'Cost Analysis',
          progress: Math.round((currentStep / totalSteps) * 100)
        });

        workflow.steps.push({
          step: 3,
          agent: 'cost',
          action: 'Analyzing costs',
          startedAt: new Date().toISOString()
        });

        const costAnalysis = await this.costAnalysisAgent.execute(costInputs);

        workflow.steps[2].completedAt = new Date().toISOString();
        workflow.results.costAnalysis = costAnalysis;

        agentEventEmitter.emit('workflow', 'step-completed', {
          workflowId,
          step: 3,
          stepName: 'Cost Analysis',
          result: costAnalysis
        });
      }

      workflow.completedAt = new Date().toISOString();
      workflow.status = 'completed';

      // Save workflow history
      this.workflowHistory.push(workflow);

      // Emit workflow completion
      agentEventEmitter.emit('workflow', 'workflow-completed', {
        workflowId,
        result: workflow,
        completedAt: Date.now()
      });
      agentStatusManager.updateWorkflowStatus(workflowId, {
        status: 'completed',
        progress: 100
      });

      return workflow;
    } catch (error) {
      workflow.status = 'error';
      workflow.error = error.message;
      workflow.completedAt = new Date().toISOString();

      // Emit workflow error
      agentEventEmitter.emit('workflow', 'workflow-error', {
        workflowId,
        error: error.message,
        failedAt: Date.now()
      });
      agentStatusManager.updateWorkflowStatus(workflowId, {
        status: 'error',
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Execute agent independently
   * @param {string} agentType - Agent type
   * @param {Object} input - Agent input
   * @returns {Promise<Object>} Agent result
   */
  async executeAgent(agentType, input) {
    this._updateAgentState(agentType, AgentStatus.RUNNING);

    try {
      let result;
      
      switch (agentType) {
        case 'assessment':
          result = await this.assessmentAgent.execute(input);
          break;
        case 'planning':
          result = await this.planningAgent.execute(input);
          break;
        case 'cost':
          result = await this.costAnalysisAgent.execute(input);
          break;
        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }

      this._updateAgentState(agentType, AgentStatus.COMPLETED);
      return result;
    } catch (error) {
      this._updateAgentState(agentType, AgentStatus.ERROR);
      throw error;
    }
  }

  /**
   * Get agent status
   * @param {string} agentType 
   * @returns {string} Agent status
   */
  getAgentStatus(agentType) {
    return this.agentStates.get(agentType) || AgentStatus.IDLE;
  }

  /**
   * Get workflow history
   * @returns {Array} Workflow history
   */
  getWorkflowHistory() {
    return [...this.workflowHistory];
  }

  /**
   * Update agent state
   * @private
   */
  _updateAgentState(agentType, status) {
    this.agentStates.set(agentType, {
      status,
      lastUpdate: new Date().toISOString()
    });
  }

  /**
   * Generate workflow ID
   * @private
   */
  _generateWorkflowId() {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default AgenticOrchestrator;
