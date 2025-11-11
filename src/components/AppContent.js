import React, { Suspense, useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import Tour from '../Tour';
import ProjectManager from '../ProjectManager';
import ThemeToggle from '../ThemeToggle';
import Navigation from './Navigation';
import LoadingFallback from './LoadingFallback';

// Lazy load all major components
import * as LazyComponents from './LazyComponents';

const AppContent = () => {
  const { state, actions } = useAppContext();
  const [runTour, setRunTour] = useState(false);

  const tourSteps = useMemo(() => [
    { target: '.nav-pills', content: 'Use these tabs to navigate through the different sections of the accelerator.' },
    { target: '.discovery-tool', content: 'Start by discovering your on-premise workloads. You can import a CSV or use our demo data.' },
    { target: '.strategy-view', content: 'Visualize your application dependencies and plan your migration strategy.' },
    { target: '.landing-zone-builder', content: 'Design your GCP landing zone by configuring projects, networking, and security.' },
    { target: '.terraform-generator', content: 'Generate Terraform code for your landing zone configuration.' },
    { target: '.finops-dashboard', content: 'Analyze your cloud costs, optimize resources, and ensure policy compliance.' },
    { target: '.tco-calculator', content: 'Compare the total cost of ownership (TCO) of your on-premise infrastructure with AWS, Azure, and GCP.' },
    { target: '.project-manager', content: 'Save and load your project data.' },
    { target: '.theme-toggle', content: 'Toggle between light and dark mode.' },
  ], []);

  const handleDiscoveryComplete = (workloads) => {
    actions.setWorkloads(workloads);
    actions.setActiveTab('strategy');
  };

  const handleLandingZoneComplete = (config) => {
    actions.setLandingZone(config);
    actions.setActiveTab('terraform');
  };

  const handleLoadProject = (projectData) => {
    actions.loadProject(projectData);
  };

  const handleNewProject = () => {
    actions.resetProject();
  };

  return (
    <div className="container-fluid mt-4 mb-5">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h1 className="mb-1">Google Cloud Infrastructure Modernization Accelerator</h1>
              <p className="text-muted mb-0">
                <strong>{state.projectName}</strong>
                {' '}• Assess, Plan, and Calculate Your Cloud Migration
              </p>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-primary" onClick={() => setRunTour(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-info-circle me-2" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.064.293.006.399.287.47l.45.083.082.38-2.29.287-.082-.38.45-.083c.294-.07.352-.176.288-.469l.738-3.468c.064-.293-.006-.399-.287-.47l-.45-.083-.082-.38zm.05-3.468a.942.942 0 0 0-.947-.947.942.942 0 0 0-.947.947.942.942 0 0 0 .947.947.942.942 0 0 0 .947-.947z"/>
                </svg>
                Start Tour
              </button>
              <div className="theme-toggle">
                <ThemeToggle />
              </div>
              <div className="project-manager">
                <ProjectManager
                  onLoadProject={handleLoadProject}
                  onNewProject={handleNewProject}
                  currentProjectName={state.projectName}
                  onProjectNameChange={actions.setProjectName}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tour run={runTour} steps={tourSteps} />

      {/* Navigation */}
      <Navigation activeTab={state.activeTab} onTabChange={actions.setActiveTab} workloadsCount={state.discoveredWorkloads.length} hasLandingZone={!!state.landingZoneConfig} />

      {/* Tab Content with Lazy Loading */}
      <Suspense fallback={<LoadingFallback message="Loading content..." />}>
        {state.activeTab === 'discovery' && (
          <div className="discovery-tool">
            <LazyComponents.DiscoveryTool onDiscoveryComplete={handleDiscoveryComplete} />
          </div>
        )}

        {state.activeTab === 'strategy' && (
          <div className="strategy-view">
            <LazyComponents.DependencyMap workloads={state.discoveredWorkloads} />
            <LazyComponents.MigrationStrategy workloads={state.discoveredWorkloads} />
            <LazyComponents.WavePlanner workloads={state.discoveredWorkloads} />
          </div>
        )}

        {state.activeTab === 'landingzone' && (
          <div className="landing-zone-builder">
            <LazyComponents.LandingZoneBuilder onConfigComplete={handleLandingZoneComplete} />
          </div>
        )}

        {state.activeTab === 'terraform' && state.landingZoneConfig && (
          <div className="terraform-generator">
            <LazyComponents.TerraformGenerator config={state.landingZoneConfig} />
          </div>
        )}

        {state.activeTab === 'finops' && (
          <div className="finops-dashboard">
            <LazyComponents.AdvancedAnalytics workloads={state.discoveredWorkloads} tco={state.tco} roi={state.roi} />
            <LazyComponents.CostDashboard workloads={state.discoveredWorkloads} />
            <LazyComponents.ResourceOptimization workloads={state.discoveredWorkloads} />
            <LazyComponents.PolicyCompliance workloads={state.discoveredWorkloads} landingZoneConfig={state.landingZoneConfig} />
          </div>
        )}

        {state.activeTab === 'tco' && (
          <div className="tco-calculator">
            <TcoCalculatorContent />
          </div>
        )}
      </Suspense>
    </div>
  );
};

// Extract TCO Calculator to separate component
const TcoCalculatorContent = React.lazy(() => import('./TcoCalculatorContent'));

export default AppContent;
