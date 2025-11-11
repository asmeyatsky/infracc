/**
 * Base Agent Class
 * 
 * Base class for all agents with built-in event emission and status tracking
 * All agents should extend this class
 */

import { agentEventEmitter } from './AgentEventEmitter.js';
import { agentStatusManager, AgentStatus } from './AgentStatusManager.js';

export class BaseAgent {
  /**
   * @param {string} agentId - Unique agent identifier
   * @param {string} agentName - Human-readable agent name
   * @param {Object} dependencies - Agent dependencies
   */
  constructor(agentId, agentName, dependencies = {}) {
    this.agentId = agentId;
    this.agentName = agentName;
    this.dependencies = dependencies;
    this.isPaused = false;
    this.currentTask = null;
  }

  /**
   * Emit agent event
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  emit(eventType, data = {}) {
    agentEventEmitter.emit(this.agentId, eventType, {
      agentName: this.agentName,
      ...data
    });
  }

  /**
   * Update agent status
   * @param {Object} status - Status object
   */
  updateStatus(status) {
    agentStatusManager.updateAgentStatus(this.agentId, {
      agentName: this.agentName,
      ...status
    });
  }

  /**
   * Set agent to thinking state
   * @param {string} message - Thinking message
   */
  setThinking(message) {
    this.updateStatus({
      status: AgentStatus.THINKING,
      message,
      currentStep: null,
      progress: null
    });
    this.emit('thinking', { message });
  }

  /**
   * Set agent to executing state
   * @param {string} step - Current step name
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Status message
   */
  setExecuting(step, progress = null, message = null) {
    this.updateStatus({
      status: AgentStatus.EXECUTING,
      currentStep: step,
      progress,
      message: message || `Executing: ${step}`
    });
    this.emit('step-started', { step, progress, message });
  }

  /**
   * Complete a step
   * @param {string} step - Completed step name
   * @param {Object} result - Step result
   */
  completeStep(step, result = null) {
    this.emit('step-completed', { step, result });
  }

  /**
   * Set agent to waiting state
   * @param {string} waitingFor - What agent is waiting for
   */
  setWaiting(waitingFor) {
    this.updateStatus({
      status: AgentStatus.WAITING,
      message: `Waiting for: ${waitingFor}`,
      currentStep: null,
      progress: null
    });
    this.emit('waiting', { waitingFor });
  }

  /**
   * Set agent to completed state
   * @param {Object} result - Final result
   */
  setCompleted(result = null) {
    this.updateStatus({
      status: AgentStatus.COMPLETED,
      message: 'Completed',
      currentStep: null,
      progress: 100
    });
    this.emit('completed', { result });
  }

  /**
   * Set agent to error state
   * @param {Error|string} error - Error object or message
   */
  setError(error) {
    const errorMessage = error instanceof Error ? error.message : error;
    this.updateStatus({
      status: AgentStatus.ERROR,
      message: `Error: ${errorMessage}`,
      currentStep: null,
      progress: null,
      error: errorMessage
    });
    this.emit('error', { error: errorMessage });
  }

  /**
   * Set agent to idle state
   */
  setIdle() {
    this.updateStatus({
      status: AgentStatus.IDLE,
      message: 'Ready',
      currentStep: null,
      progress: 0
    });
    this.emit('idle');
  }

  /**
   * Pause agent execution
   */
  pause() {
    this.isPaused = true;
    this.updateStatus({
      status: AgentStatus.PAUSED,
      message: 'Paused by user'
    });
    this.emit('paused');
  }

  /**
   * Resume agent execution
   */
  resume() {
    this.isPaused = false;
    this.emit('resumed');
  }

  /**
   * Wait if paused
   * @returns {Promise<void>}
   */
  async waitIfPaused() {
    while (this.isPaused) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Execute a step with automatic status tracking
   * @param {string} stepName - Step name
   * @param {Function} stepFunction - Step function to execute
   * @param {number} progress - Progress percentage
   * @returns {Promise<any>} Step result
   */
  async executeStep(stepName, stepFunction, progress = null) {
    await this.waitIfPaused();
    
    this.setExecuting(stepName, progress);
    this.emit('step-started', { step: stepName, progress });

    try {
      const result = await stepFunction();
      this.completeStep(stepName, result);
      return result;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  }

  /**
   * Execute multiple steps sequentially with progress tracking
   * @param {Array<{name: string, fn: Function, progress: number}>} steps - Array of steps
   * @returns {Promise<Array>} Results array
   */
  async executeSteps(steps) {
    const results = [];
    const totalSteps = steps.length;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const progress = step.progress !== undefined 
        ? step.progress 
        : Math.round(((i + 1) / totalSteps) * 100);

      const result = await this.executeStep(step.name, step.fn, progress);
      results.push(result);
    }

    return results;
  }

  /**
   * Log agent thinking/reasoning
   * @param {string} thought - Thought/reasoning message
   */
  think(thought) {
    this.setThinking(thought);
    this.emit('thinking', { thought });
  }

  /**
   * Initialize agent (called when agent is created)
   */
  initialize() {
    this.setIdle();
    this.emit('initialized', { agentId: this.agentId, agentName: this.agentName });
  }

  /**
   * Cleanup agent (called when agent is destroyed)
   */
  cleanup() {
    this.setIdle();
    this.emit('cleanup', { agentId: this.agentId });
  }
}
