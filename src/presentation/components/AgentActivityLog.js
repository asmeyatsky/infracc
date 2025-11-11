/**
 * Agent Activity Log
 * 
 * Real-time activity log showing all agent actions
 * Users can see the complete history of agent processing
 */

import React, { useState, useEffect } from 'react';
import { agentEventEmitter } from '../../agentic/core/AgentEventEmitter.js';

function AgentActivityLog() {
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'thinking', 'steps', 'errors'
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    // Subscribe to all agent events
    const unsubscribe = agentEventEmitter.subscribeAll((event) => {
      setActivities(prev => [...prev.slice(-199), event]); // Keep last 200 events
    });

    // Load initial activity
    const initialActivities = agentEventEmitter.getRecentActivity(200);
    setActivities(initialActivities);

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new activities arrive
    if (autoScroll) {
      const logContainer = document.getElementById('activity-log-container');
      if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }
  }, [activities, autoScroll]);

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'thinking':
        return '🤔';
      case 'step-started':
        return '▶️';
      case 'step-completed':
        return '✅';
      case 'completed':
        return '🎉';
      case 'error':
        return '❌';
      case 'waiting':
        return '⏳';
      case 'idle':
        return '⏸️';
      default:
        return '📝';
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'thinking':
        return 'text-info';
      case 'step-started':
        return 'text-primary';
      case 'step-completed':
        return 'text-success';
      case 'completed':
        return 'text-success';
      case 'error':
        return 'text-danger';
      case 'waiting':
        return 'text-warning';
      default:
        return 'text-muted';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatMessage = (event) => {
    if (event.message) return event.message;
    if (event.step) return `Step: ${event.step}`;
    if (event.thought) return `Thinking: ${event.thought}`;
    if (event.error) return `Error: ${event.error}`;
    return event.eventType;
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'thinking') return activity.eventType === 'thinking';
    if (filter === 'steps') return activity.eventType.includes('step');
    if (filter === 'errors') return activity.eventType === 'error';
    return true;
  });

  return (
    <div className="agent-activity-log">
      <div className="card">
        <div className="card-header bg-dark text-white">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">📋 Agent Activity Log</h5>
              <small>Real-time log of all agent actions</small>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <select
                className="form-select form-select-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="all">All Events</option>
                <option value="thinking">Thinking</option>
                <option value="steps">Steps</option>
                <option value="errors">Errors</option>
              </select>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="autoScroll"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                <label className="form-check-label text-white" htmlFor="autoScroll">
                  Auto-scroll
                </label>
              </div>
            </div>
          </div>
        </div>
        <div
          id="activity-log-container"
          className="card-body p-0"
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: '#f8f9fa',
            fontFamily: 'monospace',
            fontSize: '0.875rem'
          }}
        >
          {filteredActivities.length === 0 ? (
            <div className="p-4 text-center text-muted">
              <p>No activities yet</p>
              <small>Agent activities will appear here as they work</small>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {filteredActivities.map((activity, index) => (
                <div
                  key={index}
                  className={`list-group-item border-0 py-2 px-3 ${getEventColor(activity.eventType)}`}
                  style={{
                    borderLeft: `3px solid ${
                      activity.eventType === 'error' ? '#dc3545' :
                      activity.eventType === 'completed' ? '#28a745' :
                      activity.eventType === 'thinking' ? '#17a2b8' :
                      '#007bff'
                    }`
                  }}
                >
                  <div className="d-flex align-items-start">
                    <span className="me-2" style={{ fontSize: '1.2rem' }}>
                      {getEventIcon(activity.eventType)}
                    </span>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between">
                        <div>
                          <strong>{activity.agentName || activity.agentId}</strong>
                          {' '}
                          <span className="text-muted">({activity.eventType})</span>
                        </div>
                        <small className="text-muted">{formatTime(activity.timestamp)}</small>
                      </div>
                      <div className="mt-1">
                        {formatMessage(activity)}
                        {activity.progress !== null && activity.progress !== undefined && (
                          <span className="ms-2">
                            <small className="text-muted">({activity.progress}%)</small>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card-footer bg-light">
          <small className="text-muted">
            Showing {filteredActivities.length} of {activities.length} activities
          </small>
        </div>
      </div>
    </div>
  );
}

export default AgentActivityLog;
