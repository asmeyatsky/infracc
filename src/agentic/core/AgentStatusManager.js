/**
 * Agent Status Manager
 * 
 * Manages real-time status of all agents
 * Provides centralized state management for agent status
 */

import { agentEventEmitter } from './AgentEventEmitter.js';

export const AgentStatus = {
  IDLE: 'idle',
  THINKING: 'thinking',
  EXECUTING: 'executing',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  ERROR: 'error',
  PAUSED: 'paused'
};

export const StepStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
  FAILED: 'failed'
};

export class AgentStatusManager {
  constructor() {
    this.agentStates = new Map();
    this.workflowStates = new Map();
    this.listeners = new Set();
  }

  /**
   * Subscribe to status changes
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Update agent status
   * @param {string} agentId - Agent identifier
   * @param {Object} status - Status object
   */
  updateAgentStatus(agentId, status) {
    const currentState = this.agentStates.get(agentId) || {};
    const newState = {
      ...currentState,
      ...status,
      updatedAt: Date.now()
    };

    this.agentStates.set(agentId, newState);

    // Emit event
    agentEventEmitter.emit(agentId, 'status-changed', {
      status: newState.status,
      previousStatus: currentState.status,
      ...status
    });

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Get agent status
   * @param {string} agentId - Agent identifier
   * @returns {Object} Agent status
   */
  getAgentStatus(agentId) {
    return this.agentStates.get(agentId) || {
      status: AgentStatus.IDLE,
      currentStep: null,
      progress: 0,
      message: null
    };
  }

  /**
   * Get all agent statuses
   * @returns {Map} All agent statuses
   */
  getAllAgentStatuses() {
    return new Map(this.agentStates);
  }

  /**
   * Update workflow status
   * @param {string} workflowId - Workflow identifier
   * @param {Object} status - Status object
   */
  updateWorkflowStatus(workflowId, status) {
    const currentState = this.workflowStates.get(workflowId) || {};
    const newState = {
      ...currentState,
      ...status,
      updatedAt: Date.now()
    };

    this.workflowStates.set(workflowId, newState);

    // Emit event
    agentEventEmitter.emit('workflow', 'status-changed', {
      workflowId,
      ...status
    });

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Get workflow status
   * @param {string} workflowId - Workflow identifier
   * @returns {Object} Workflow status
   */
  getWorkflowStatus(workflowId) {
    return this.workflowStates.get(workflowId) || {
      status: 'idle',
      currentStep: null,
      progress: 0,
      steps: []
    };
  }

  /**
   * Reset agent status
   * @param {string} agentId - Agent identifier
   */
  resetAgentStatus(agentId) {
    this.agentStates.delete(agentId);
    this.notifyListeners();
  }

  /**
   * Reset all agent statuses
   */
  resetAll() {
    this.agentStates.clear();
    this.workflowStates.clear();
    this.notifyListeners();
  }

  /**
   * Notify all listeners
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback({
          agents: new Map(this.agentStates),
          workflows: new Map(this.workflowStates)
        });
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }
}

// Singleton instance
export const agentStatusManager = new AgentStatusManager();
