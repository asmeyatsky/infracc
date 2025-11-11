/**
 * Agent Status Dashboard
 * 
 * Real-time dashboard showing status of all agents
 * Users can see what agents are doing at all times
 */

import React, { useState, useEffect } from 'react';
import { agentStatusManager, AgentStatus } from '../../agentic/core/AgentStatusManager.js';
import { agentEventEmitter } from '../../agentic/core/AgentEventEmitter.js';

function AgentStatusDashboard() {
  const [agentStates, setAgentStates] = useState(new Map());
  const [activityLog, setActivityLog] = useState([]);
  const [expandedAgent, setExpandedAgent] = useState(null);

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = agentStatusManager.subscribe((statuses) => {
      setAgentStates(statuses.agents);
    });

    // Subscribe to activity log
    const unsubscribeEvents = agentEventEmitter.subscribeAll((event) => {
      setActivityLog(prev => [...prev.slice(-49), event]); // Keep last 50 events
    });

    // Initial load
    const allStatuses = agentStatusManager.getAllAgentStatuses();
    setAgentStates(allStatuses);
    setActivityLog(agentEventEmitter.getRecentActivity(50));

    return () => {
      unsubscribe();
      unsubscribeEvents();
    };
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case AgentStatus.IDLE:
        return 'secondary';
      case AgentStatus.THINKING:
        return 'info';
      case AgentStatus.EXECUTING:
        return 'primary';
      case AgentStatus.WAITING:
        return 'warning';
      case AgentStatus.COMPLETED:
        return 'success';
      case AgentStatus.ERROR:
        return 'danger';
      case AgentStatus.PAUSED:
        return 'dark';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case AgentStatus.IDLE:
        return '⏸️';
      case AgentStatus.THINKING:
        return '🤔';
      case AgentStatus.EXECUTING:
        return '⚙️';
      case AgentStatus.WAITING:
        return '⏳';
      case AgentStatus.COMPLETED:
        return '✅';
      case AgentStatus.ERROR:
        return '❌';
      case AgentStatus.PAUSED:
        return '⏸️';
      default:
        return '⏸️';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Sort agents so DiscoveryAgent appears first, then by name
  const agentEntries = Array.from(agentStates.entries()).sort(([idA, statusA], [idB, statusB]) => {
    // DiscoveryAgent always first
    if (idA === 'DiscoveryAgent') return -1;
    if (idB === 'DiscoveryAgent') return 1;
    
    // Then sort by agent name
    const nameA = statusA.agentName || idA;
    const nameB = statusB.agentName || idB;
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="agent-status-dashboard">
      <div className="card mb-3">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">🤖 Agent Status Dashboard</h5>
          <small>Real-time status of all agents</small>
        </div>
        <div className="card-body">
          {agentEntries.length === 0 ? (
            <div className="text-center text-muted py-4">
              <p>No agents active</p>
              <small>Agents will appear here when they start working</small>
            </div>
          ) : (
            <div className="row">
              {agentEntries.map(([agentId, status]) => {
                const isExpanded = expandedAgent === agentId;
                const agentActivity = activityLog.filter(e => e.agentId === agentId);

                return (
                  <div key={agentId} className="col-md-6 mb-3">
                    <div className={`card ${isExpanded ? 'border-primary' : ''}`}>
                      <div 
                        className="card-header bg-light cursor-pointer"
                        onClick={() => setExpandedAgent(isExpanded ? null : agentId)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className="me-2">{getStatusIcon(status.status)}</span>
                            <strong>{status.agentName || agentId}</strong>
                          </div>
                          <span className={`badge bg-${getStatusColor(status.status)}`}>
                            {status.status}
                          </span>
                        </div>
                      </div>
                      <div className="card-body">
                        {status.message && (
                          <div className="mb-2">
                            <small className="text-muted">{status.message}</small>
                          </div>
                        )}
                        
                        {status.currentStep && (
                          <div className="mb-2">
                            <strong>Current Step:</strong> {status.currentStep}
                          </div>
                        )}

                        {status.progress !== null && status.progress !== undefined && (
                          <div className="mb-2">
                            <div className="d-flex justify-content-between mb-1">
                              <small>Progress</small>
                              <small>{status.progress}%</small>
                            </div>
                            <div className="progress" style={{ height: '8px' }}>
                              <div
                                className={`progress-bar bg-${getStatusColor(status.status)}`}
                                role="progressbar"
                                style={{ width: `${status.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {isExpanded && (
                          <div className="mt-3 border-top pt-3">
                            <h6>Recent Activity</h6>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                              {agentActivity.length === 0 ? (
                                <small className="text-muted">No recent activity</small>
                              ) : (
                                <ul className="list-unstyled mb-0">
                                  {agentActivity.slice(-10).reverse().map((event, idx) => (
                                    <li key={idx} className="mb-1">
                                      <small>
                                        <span className="text-muted">{formatTime(event.timestamp)}</span>
                                        {' '}
                                        <strong>{event.eventType}:</strong> {event.message || event.step || event.thought || JSON.stringify(event)}
                                      </small>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgentStatusDashboard;
