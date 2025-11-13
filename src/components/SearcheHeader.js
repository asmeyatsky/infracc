/**
 * Searce Professional Header
 * Brand-consistent navigation header
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/searce-header.css';

export const SearcheHeader = ({ projectName, onProjectNameChange }) => {
  const { user, isAuthenticated, logout, role, getRoleDisplayName } = useAuth();

  return (
    <header className="searce-header">
      <div className="header-container">
        {/* Logo and Brand */}
        <div className="header-brand">
          <div className="brand-logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="8" fill="url(#logo-gradient)"/>
              <path d="M10 20L15 15L20 20L25 10L30 15" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 25L15 28L20 25L25 30L30 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="40" y2="40">
                  <stop offset="0%" stopColor="#0066CC"/>
                  <stop offset="100%" stopColor="#004C99"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="brand-text">
            <h1 className="brand-name">Searce</h1>
            <span className="brand-tagline">AWS to GCP Migration Tool</span>
          </div>
        </div>

        {/* Project Name */}
        {projectName && (
          <div className="header-project">
            <span className="project-label">Project:</span>
            <input
              type="text"
              className="project-name-input"
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              placeholder="Enter project name"
            />
          </div>
        )}

        {/* User Menu */}
        {isAuthenticated && (
          <div className="header-user">
            <div className="user-info">
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <div className="user-name">{user?.name || 'User'}</div>
                <div className="user-role">{getRoleDisplayName(role)}</div>
              </div>
            </div>
            <button className="btn-logout" onClick={logout} title="Logout">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v4a1 1 0 11-2 0V4H5v12h10v-3a1 1 0 112 0v4a1 1 0 01-1 1H4a1 1 0 01-1-1V3z"/>
                <path d="M14 10a1 1 0 00-1-1H7a1 1 0 100 2h6a1 1 0 001-1z"/>
                <path d="M11.293 7.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L12.586 11H7a1 1 0 110-2h5.586l-1.293-1.293a1 1 0 010-1.414z"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="header-status-bar">
        <div className="status-container">
          <StatusIndicator icon="🔍" label="Discovery" status="completed" />
          <StatusIndicator icon="📊" label="Assessment" status="in-progress" />
          <StatusIndicator icon="🎯" label="Strategy" status="pending" />
          <StatusIndicator icon="🚀" label="Migration" status="pending" />
        </div>
      </div>
    </header>
  );
};

const StatusIndicator = ({ icon, label, status }) => {
  const statusClasses = {
    completed: 'status-completed',
    'in-progress': 'status-in-progress',
    pending: 'status-pending',
  };

  return (
    <div className={`status-item ${statusClasses[status]}`}>
      <span className="status-icon">{icon}</span>
      <span className="status-label">{label}</span>
      {status === 'completed' && <span className="status-check">✓</span>}
      {status === 'in-progress' && (
        <span className="status-spinner">
          <div className="spinner-small"></div>
        </span>
      )}
    </div>
  );
};

export default SearcheHeader;
