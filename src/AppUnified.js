/**
 * Unified App Component
 * 
 * Single coherent solution consolidating all versions
 * Modern UX/UI with agent-first design
 */

import React, { useState, useEffect } from 'react';
import { TCOProvider } from './context/TCOContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from './components/unified/Layout';
import MigrationPipeline from './components/pipeline/MigrationPipeline';
import AgentStatusDashboard from './presentation/components/AgentStatusDashboard';
import AgentActivityLog from './presentation/components/AgentActivityLog';
import { getAgenticContainer } from './agentic/dependency_injection/AgenticContainer.js';
// Test data loading removed - start with 0 workloads until upload completes
import './styles/unified.css';

function AppUnified() {
  const [view, setView] = useState('flow'); // 'flow' | 'dashboard' | 'agents'
  const [testDataLoaded, setTestDataLoaded] = useState(false);
  const [projectData, setProjectData] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);

  useEffect(() => {
    // Don't load test data automatically - start with 0 workloads
    // Test data can be loaded manually via "Load Demo" button if needed
    setTestDataLoaded(false);
  }, []);

  // MigrationPipeline handles file upload internally, so this is no longer needed
  // Keeping for backward compatibility if needed elsewhere

  const header = (
    <div className="unified-header-content">
      <div className="header-left">
        <div className="app-logo">
          <div className="app-logo-icon">I</div>
          <span className="app-logo-text">AWS to GCP Migration Tool</span>
        </div>
        <div className="app-subtitle">Comprehensive Cloud Migration Assessment & Planning</div>
      </div>
      <div className="header-right">
        <div className="view-switcher">
          <button
            className={`view-btn ${view === 'flow' ? 'active' : ''}`}
            onClick={() => setView('flow')}
          >
            Migration Flow
          </button>
          <button
            className={`view-btn ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`view-btn ${view === 'agents' ? 'active' : ''}`}
            onClick={() => setView('agents')}
          >
            Agents
          </button>
        </div>
        {testDataLoaded && (
          <div className="test-data-badge">
            <span className="badge-icon">✓</span>
            Test Data Loaded
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    console.log('AppUnified renderContent - view:', view, 'uploadSummary:', uploadSummary);
    switch (view) {
      case 'flow':
        return <MigrationPipeline />;
      case 'dashboard':
        return (
          <div className="dashboard-view">
            <h1>Migration Dashboard</h1>
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-value">0</div>
                <div className="stat-label">Workloads</div>
                <small className="text-muted">Upload CUR files to discover workloads</small>
              </div>
              <div className="stat-card">
                <div className="stat-value">0</div>
                <div className="stat-label">Assessments</div>
                <small className="text-muted">Assessments will appear after discovery</small>
              </div>
              <div className="stat-card">
                <div className="stat-value">0</div>
                <div className="stat-label">Strategies</div>
                <small className="text-muted">Strategies will appear after assessment</small>
              </div>
              <div className="stat-card">
                <div className="stat-value">0</div>
                <div className="stat-label">Migration Waves</div>
                <small className="text-muted">Waves will appear after planning</small>
              </div>
            </div>
          </div>
        );
      case 'agents':
        return (
          <div className="agents-view">
            <h1>Agent Dashboard</h1>
            <AgentStatusDashboard />
            <AgentActivityLog />
          </div>
        );
      default:
        return <MigrationPipeline />;
    }
  };

  return (
    <TCOProvider>
      <Layout header={header}>
        {renderContent()}
      </Layout>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </TCOProvider>
  );
}

export default AppUnified;
