/**
 * Agent Orchestrator
 * Central system that coordinates all AI agents in the migration accelerator
 */

export const AGENT_TYPES = {
  ONBOARDING: 'onboarding',
  DISCOVERY: 'discovery',
  ASSESSMENT: 'assessment',
  STRATEGY: 'strategy',
  CODE_MOD: 'code_mod',
  ASSISTANT: 'assistant',
};

export const AGENT_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  ERROR: 'error',
  WAITING: 'waiting_approval',
};

export class AgentOrchestrator {
  constructor() {
    this.agents = new Map();
    this.taskQueue = [];
    this.listeners = new Set();
  }

  /**
   * Register a new agent
   */
  registerAgent(agentType, agentInstance) {
    this.agents.set(agentType, {
      instance: agentInstance,
      status: AGENT_STATUS.IDLE,
      lastRun: null,
      results: null,
    });
  }

  /**
   * Execute an agent task
   */
  async executeAgent(agentType, input, options = {}) {
    const agent = this.agents.get(agentType);

    if (!agent) {
      throw new Error(`Agent type ${agentType} not registered`);
    }

    this.updateAgentStatus(agentType, AGENT_STATUS.RUNNING);
    this.notifyListeners({
      type: 'agent_started',
      agentType,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await agent.instance.execute(input, options);

      agent.results = result;
      agent.lastRun = new Date().toISOString();

      this.updateAgentStatus(agentType, AGENT_STATUS.COMPLETED);
      this.notifyListeners({
        type: 'agent_completed',
        agentType,
        result,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      this.updateAgentStatus(agentType, AGENT_STATUS.ERROR);
      this.notifyListeners({
        type: 'agent_error',
        agentType,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * Execute a workflow (multiple agents in sequence)
   */
  async executeWorkflow(workflowSteps, initialInput) {
    const results = [];
    let currentInput = initialInput;

    for (const step of workflowSteps) {
      const { agentType, transform } = step;

      const result = await this.executeAgent(agentType, currentInput, step.options);
      results.push({ agentType, result });

      // Transform output for next agent if specified
      if (transform) {
        currentInput = transform(result);
      } else {
        currentInput = result;
      }
    }

    return results;
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentType) {
    const agent = this.agents.get(agentType);
    return agent ? agent.status : null;
  }

  /**
   * Get agent results
   */
  getAgentResults(agentType) {
    const agent = this.agents.get(agentType);
    return agent ? agent.results : null;
  }

  /**
   * Get all agent statuses
   */
  getAllAgentStatuses() {
    const statuses = {};
    this.agents.forEach((agent, type) => {
      statuses[type] = {
        status: agent.status,
        lastRun: agent.lastRun,
      };
    });
    return statuses;
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentType, status) {
    const agent = this.agents.get(agentType);
    if (agent) {
      agent.status = status;
    }
  }

  /**
   * Add listener for agent events
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in agent listener:', error);
      }
    });
  }

  /**
   * Reset all agents
   */
  resetAllAgents() {
    this.agents.forEach((agent) => {
      agent.status = AGENT_STATUS.IDLE;
      agent.results = null;
    });
    this.notifyListeners({
      type: 'agents_reset',
      timestamp: new Date().toISOString(),
    });
  }
}

// Singleton instance
export const agentOrchestrator = new AgentOrchestrator();

export default agentOrchestrator;
