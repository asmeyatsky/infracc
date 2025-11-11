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
import MigrationFlow from './components/unified/MigrationFlow';
import AgentStatusDashboard from './presentation/components/AgentStatusDashboard';
import AgentActivityLog from './presentation/components/AgentActivityLog';
import CurUploadButton from './components/CurUploadButton';
import { getAgenticContainer } from './agentic/dependency_injection/AgenticContainer.js';
import { loadTestProject } from './test-data/index.js';
import './styles/unified.css';

function AppUnified() {
  const [view, setView] = useState('flow'); // 'flow' | 'dashboard' | 'agents'
  const [testDataLoaded, setTestDataLoaded] = useState(false);
  const [projectData, setProjectData] = useState(null);

  useEffect(() => {
    // Load test data on mount
    const testProject = loadTestProject();
    setProjectData(testProject);
    setTestDataLoaded(true);
  }, []);

  const handleCurUploadComplete = (workloads) => {
    // Workloads are automatically saved to repository
    // MigrationFlow component polls repository every second, so new workloads will appear automatically
    console.log(`CUR upload complete: ${workloads.length} workloads imported`);
    
    // Switch to Migration Flow view to show the imported workloads
    setView('flow');
    
    // Show success message
    if (workloads && workloads.length > 0) {
      setTimeout(() => {
        // Small delay to ensure view has switched
        toast.success(`✅ ${workloads.length} workloads imported! Migration flow will start from Assessment step.`);
      }, 500);
    }
  };

  const header = (
    <div className="unified-header-content">
      <div className="header-left">
        <div className="app-logo">
          <div className="app-logo-icon">I</div>
          <span className="app-logo-text">InfraCC</span>
        </div>
        <div className="app-subtitle">AWS & Azure to GCP Migration Accelerator</div>
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
        <CurUploadButton onUploadComplete={handleCurUploadComplete} />
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
    switch (view) {
      case 'flow':
        return <MigrationFlow />;
      case 'dashboard':
        return (
          <div className="dashboard-view">
            <h1>Migration Dashboard</h1>
            {projectData && (
              <div className="dashboard-stats">
                <div className="stat-card">
                  <div className="stat-value">{projectData.workloads.length}</div>
                  <div className="stat-label">Workloads</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{projectData.assessments.length}</div>
                  <div className="stat-label">Assessments</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{projectData.strategies.length}</div>
                  <div className="stat-label">Strategies</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{projectData.wavePlan.totalWaves}</div>
                  <div className="stat-label">Migration Waves</div>
                </div>
              </div>
            )}
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
        return <MigrationFlow />;
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
