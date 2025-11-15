/**
 * Unified App Component
 * 
 * Single coherent solution consolidating all versions
 * Modern UX/UI with agent-first design
 */

import React from 'react';
import { TCOProvider } from './context/TCOContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from './components/unified/Layout';
import MigrationPipeline from './components/pipeline/MigrationPipeline';
// Removed unused imports: AgentStatusDashboard, AgentActivityLog, getAgenticContainer
import './styles/unified.css';

function AppUnified() {
  // Removed unused view switcher - only 'flow' view is used
  // Removed unused testDataLoaded state
  // Removed unused projectData and uploadSummary states

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
        {/* View switcher removed - only Migration Flow view is used */}
      </div>
    </div>
  );

  // Removed unused view switcher - always show MigrationPipeline
  const renderContent = () => {
    return <MigrationPipeline />;
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
