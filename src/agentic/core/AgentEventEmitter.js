/**
 * Agent Event Emitter
 * 
 * Core infrastructure for real-time agent status updates
 * Allows agents to emit events that UI can subscribe to
 */

export class AgentEventEmitter {
  constructor() {
    this.listeners = new Map();
    this.activityLog = [];
    this.maxLogSize = 1000;
  }

  /**
   * Subscribe to agent events
   * @param {string} agentId - Agent identifier
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(agentId, callback) {
    if (!this.listeners.has(agentId)) {
      this.listeners.set(agentId, new Set());
    }
    this.listeners.get(agentId).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(agentId);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Subscribe to all agent events
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribeAll(callback) {
    return this.subscribe('*', callback);
  }

  /**
   * Emit agent event
   * @param {string} agentId - Agent identifier
   * @param {string} eventType - Event type (step-started, step-completed, thinking, etc.)
   * @param {Object} data - Event data
   */
  emit(agentId, eventType, data = {}) {
    const event = {
      agentId,
      eventType,
      timestamp: Date.now(),
      ...data
    };

    // Add to activity log
    this.activityLog.push(event);
    if (this.activityLog.length > this.maxLogSize) {
      this.activityLog.shift();
    }

    // Notify specific listeners
    const callbacks = this.listeners.get(agentId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in agent event callback for ${agentId}:`, error);
        }
      });
    }

    // Notify global listeners
    const globalCallbacks = this.listeners.get('*');
    if (globalCallbacks) {
      globalCallbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in global agent event callback:', error);
        }
      });
    }
  }

  /**
   * Get activity log for an agent
   * @param {string} agentId - Agent identifier (optional, returns all if not provided)
   * @returns {Array} Activity log entries
   */
  getActivityLog(agentId = null) {
    if (agentId) {
      return this.activityLog.filter(event => event.agentId === agentId);
    }
    return [...this.activityLog];
  }

  /**
   * Get recent activity log
   * @param {number} limit - Number of recent entries
   * @returns {Array} Recent activity log entries
   */
  getRecentActivity(limit = 50) {
    return this.activityLog.slice(-limit);
  }

  /**
   * Clear activity log
   */
  clearActivityLog() {
    this.activityLog = [];
  }
}

// Singleton instance
export const agentEventEmitter = new AgentEventEmitter();
