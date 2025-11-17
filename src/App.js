import React, { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { TCOProvider } from './context/TCOContext';
import Tour from './Tour';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/toast-styles.css';
import './styles/design-system.css';
import './styles/app-layout.css';
import * as bootstrap from 'bootstrap';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  ArcElement,
} from 'chart.js';

import ProjectManager from './ProjectManager';
import ThemeToggle from './ThemeToggle';
import { autoSave } from './utils/storage';
import { generateMigrationReport } from './utils/pdfExport';

const DiscoveryTool = lazy(() => import('./DiscoveryTool'));
const EnhancedDiscoveryTool = lazy(() => import('./presentation/components/EnhancedDiscoveryTool'));
const Assessment = lazy(() => import('./Assessment'));
const EnhancedAssessment = lazy(() => import('./presentation/components/EnhancedAssessment'));
const MigrationStrategy = lazy(() => import('./MigrationStrategy'));
const DependencyMap = lazy(() => import('./DependencyMap'));
const LandingZoneBuilder = lazy(() => import('./LandingZoneBuilder'));
const TerraformGenerator = lazy(() => import('./TerraformGenerator'));
const CostDashboard = lazy(() => import('./CostDashboard'));
const ResourceOptimization = lazy(() => import('./ResourceOptimization'));
const PolicyCompliance = lazy(() => import('./PolicyCompliance'));
const WavePlanner = lazy(() => import('./WavePlanner'));
const AdvancedAnalytics = lazy(() => import('./AdvancedAnalytics'));
const ArchitectureDiagramAnalyzer = lazy(() => import('./components/ArchitectureDiagramAnalyzer'));
const EnhancedTcoCalculator = lazy(() => import('./components/EnhancedTcoCalculator'));
const ExecutiveDashboard = lazy(() => import('./ExecutiveDashboard'));
const DashboardOverview = lazy(() => import('./components/DashboardOverview'));
const EnhancedMigrationStrategy = lazy(() => import('./presentation/components/EnhancedMigrationStrategy'));
const AgenticWorkflow = lazy(() => import('./presentation/components/AgenticWorkflow'));
const AgenticWorkflowView = lazy(() => import('./presentation/components/AgenticWorkflowView'));

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  ArcElement
);

function App() {
  const [runTour, setRunTour] = useState(false);
  const tourSteps = useMemo(() => [
    {
      target: '.nav-pills',
      content: 'Use these tabs to navigate through the different sections of the accelerator.',
    },
    {
      target: '.discovery-tool',
      content: 'Start by discovering your on-premise workloads. You can import a CSV or use our demo data.',
    },
    {
      target: '.strategy-view',
      content: 'Visualize your application dependencies and plan your migration strategy.',
    },
    {
      target: '.landing-zone-builder',
      content: 'Design your GCP landing zone by configuring projects, networking, and security.',
    },
    {
      target: '.terraform-generator',
      content: 'Generate Terraform code for your landing zone configuration.',
    },
    {
      target: '.finops-dashboard',
      content: 'Analyze your cloud costs, optimize resources, and ensure policy compliance.',
    },
    {
      target: '.tco-calculator',
      content: 'Compare the total cost of ownership (TCO) of your on-premise infrastructure with AWS, Azure, and GCP.',
    },
    {
      target: '.project-manager',
      content: 'Save and load your project data.',
    },
    {
      target: '.theme-toggle',
      content: 'Toggle between light and dark mode.',
    },
  ], []);

  const [activeTab, setActiveTab] = useState('overview');
  const [sourceCloud, setSourceCloud] = useState('aws'); // 'aws' or 'azure'
  const [discoveredWorkloads, setDiscoveredWorkloads] = useState([]);
  const [assessmentResults, setAssessmentResults] = useState(null);
  const [landingZoneConfig, setLandingZoneConfig] = useState(null);
  const [projectName, setProjectName] = useState('AWS to GCP Migration Project');
  const [onPremise, setOnPremise] = useState({
    hardware: 0,
    software: 0,
    maintenance: 0,
    labor: 0,
    power: 0,
    cooling: 0,
    datacenter: 0,
  });

  const [aws, setAws] = useState({
    ec2: 0,
    s3: 0,
    rds: 0,
    vpc: 0,
    cloudwatch: 0,
  });

  const [azure, setAzure] = useState({
    virtualMachines: 0,
    blobStorage: 0,
    sqlDatabase: 0,
    networking: 0,
    monitoring: 0,
  });

  const [gcp, setGcp] = useState({
    compute: 0,
    storage: 0,
    networking: 0,
    database: 0,
    monitoring: 0,
  });

  const [migration, setMigration] = useState({
    assessment: 0,
    tools: 0,
    training: 0,
    consulting: 0,
  });

  const [timeframe, setTimeframe] = useState(36); // months

  const [roi, setRoi] = useState({
    aws: 0,
    azure: 0,
    gcp: 0,
  });

  const [tco, setTco] = useState({
    onPremise: 0,
    aws: 0,
    azure: 0,
    gcp: 0,
    migrationCost: 0,
    totalAws: 0,
    totalAzure: 0,
    totalGcp: 0,
  });

  useEffect(() => {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl)
    });
  }, []);

  const handleTcoCalculate = (results) => {
    // Update state with results from ImprovedTcoCalculator
    setTco({
      onPremise: results.onPremise,
      aws: results.aws,
      azure: results.azure,
      gcp: results.gcp,
      migrationCost: results.migrationCost,
      totalAws: results.totalAws,
      totalAzure: results.totalAzure,
      totalGcp: results.totalGcp,
    });

    // Calculate ROI
    const awsNetSavings = results.onPremise - results.totalAws;
    const azureNetSavings = results.onPremise - results.totalAzure;
    const gcpNetSavings = results.onPremise - results.totalGcp;

    setRoi({
      aws: results.totalAws > 0 ? (awsNetSavings / results.totalAws) * 100 : 0,
      azure: results.totalAzure > 0 ? (azureNetSavings / results.totalAzure) * 100 : 0,
      gcp: results.totalGcp > 0 ? (gcpNetSavings / results.totalGcp) * 100 : 0,
    });
  };


  const handleAnalysisComplete = (workloads) => {
    setDiscoveredWorkloads(workloads);
    setActiveTab('assessment');
  };

  const handleAssessmentComplete = (results) => {
    setAssessmentResults(results);
    setActiveTab('strategy');
  };

  const handleLandingZoneComplete = (config) => {
    setLandingZoneConfig(config);
    setActiveTab('terraform');
  };

  const handleLoadProject = (projectData) => {
    if (projectData.workloads) setDiscoveredWorkloads(projectData.workloads);
    if (projectData.assessmentResults) setAssessmentResults(projectData.assessmentResults);
    if (projectData.landingZoneConfig) setLandingZoneConfig(projectData.landingZoneConfig);
    if (projectData.onPremise) setOnPremise(projectData.onPremise);
    if (projectData.aws) setAws(projectData.aws);
    if (projectData.azure) setAzure(projectData.azure);
    if (projectData.gcp) setGcp(projectData.gcp);
    if (projectData.migration) setMigration(projectData.migration);
    if (projectData.timeframe) setTimeframe(projectData.timeframe);
  };

  const handleNewProject = () => {
    if (window.confirm('Clear all data and start a new project')) {
      setDiscoveredWorkloads([]);
      setAssessmentResults(null);
      setLandingZoneConfig(null);
      setOnPremise({ hardware: 0, software: 0, maintenance: 0, labor: 0, power: 0, cooling: 0, datacenter: 0 });
      setAws({ ec2: 0, s3: 0, rds: 0, vpc: 0, cloudwatch: 0 });
      setAzure({ virtualMachines: 0, blobStorage: 0, sqlDatabase: 0, networking: 0, monitoring: 0 });
      setGcp({ compute: 0, storage: 0, networking: 0, database: 0, monitoring: 0 });
      setMigration({ assessment: 0, tools: 0, training: 0, consulting: 0 });
      setTimeframe(36);
      setTco({ onPremise: 0, aws: 0, azure: 0, gcp: 0, migrationCost: 0, totalAws: 0, totalAzure: 0, totalGcp: 0 });
      setRoi({ aws: 0, azure: 0, gcp: 0 });
      setProjectName('My Cloud Migration Project');
      setActiveTab('discovery');
    }
  };

  // Auto-save functionality
  React.useEffect(() => {
    const projectData = {
      name: projectName,
      workloads: discoveredWorkloads,
      assessmentResults,
      landingZoneConfig,
      onPremise,
      aws,
      azure,
      gcp,
      migration,
      timeframe,
    };
    autoSave(projectData);
  }, [projectName, discoveredWorkloads, assessmentResults, landingZoneConfig, onPremise, aws, azure, gcp, migration, timeframe]);

  return (
    <TCOProvider>
      <div className="app-container">
        {/* Professional Header */}
        <header className="app-header">
          <div className="app-header-content">
            <div className="app-header-top">
              <div className="app-logo">
                <div className="app-logo-icon">X</div>
                <span>AWS to GCP Migration Tool</span>
              </div>
              <div className="app-header-actions">
                <button className="btn btn-outline-primary" onClick={() => setRunTour(true)} style={{background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)', color: 'white'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{marginRight: '0.5rem'}}>
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.064.293.006.399.287.47l.45.083.082.38-2.29.287-.082-.38.45-.083c.294-.07.352-.176.288-.469l.738-3.468c.064-.293-.006-.399-.287-.47l-.45-.083-.082-.38zm.05-3.468a.942.942 0 0 0-.947-.947.942.942 0 0 0-.947.947.942.942 0 0 0 .947.947.942.942 0 0 0 .947-.947z" />
                  </svg>
                  Tour
                </button>
                <div className="theme-toggle">
                  <ThemeToggle />
                </div>
                <div className="project-manager">
                  <ProjectManager
                    onLoadProject={handleLoadProject}
                    onNewProject={handleNewProject}
                    currentProjectName={projectName}
                    onProjectNameChange={setProjectName}
                  />
                </div>
              </div>
            </div>
            
            <div style={{color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem', marginBottom: '1rem'}}>
              <strong>{projectName}</strong> ? Assess, Plan, and Calculate Your Cloud Migration
            </div>

            {/* Navigation Tabs */}
            <nav className="app-nav">
              <div className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  ?? Overview
                </button>
              </div>
              <div className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'discovery' ? 'active' : ''}`}
                  onClick={() => setActiveTab('discovery')}
                >
                  ?? Discovery
                </button>
              </div>
              <div className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'assessment' ? 'active' : ''}`}
                  onClick={() => setActiveTab('assessment')}
                >
                  ?? Assessment
                </button>
              </div>
              <div className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'strategy' ? 'active' : ''}`}
                  onClick={() => setActiveTab('strategy')}
                >
                  ?? Strategy
                  {discoveredWorkloads.length > 0 && (
                    <span className="badge">{discoveredWorkloads.length}</span>
                  )}
                </button>
              </div>
              <div className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'landingzone' ? 'active' : ''}`}
                  onClick={() => setActiveTab('landingzone')}
                >
                  ??? Landing Zone
                </button>
              </div>
              <div className="nav-item">
                <span data-bs-toggle="tooltip" data-bs-placement="bottom" title="Complete the Landing Zone step first.">
                  <button
                    className={`nav-link ${activeTab === 'terraform' ? 'active' : ''}`}
                    onClick={() => setActiveTab('terraform')}
                    disabled={!landingZoneConfig}
                    style={!landingZoneConfig ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    ?? Terraform
                    {landingZoneConfig && (
                      <span className="badge">?</span>
                    )}
                  </button>
                </span>
              </div>
              <div className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'finops' ? 'active' : ''}`}
                  onClick={() => setActiveTab('finops')}
                >
                  ?? FinOps
                </button>
              </div>
              <div className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'architecture' ? 'active' : ''}`}
                  onClick={() => setActiveTab('architecture')}
                >
                  ??? Architecture
                </button>
              </div>
              <div className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'tco' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tco')}
                >
                  ?? TCO Calculator
                </button>
              </div>
              <div className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'executive' ? 'active' : ''}`}
                  onClick={() => setActiveTab('executive')}
                >
                  ?? Executive
                </button>
              </div>
              <div className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'agentic' ? 'active' : ''}`}
                  onClick={() => setActiveTab('agentic')}
                >
                  ?? Agentic
                </button>
              </div>
            </nav>
          </div>
        </header>

        <Tour run={runTour} steps={tourSteps} />

        {/* Main Content */}
        <main className="app-content">
          <div className="app-main">
            {/* Tab Content */}
        <Suspense fallback={<div>Loading...</div>}>
          {activeTab === 'discovery' && (
            <div className="discovery-tool">
              <EnhancedDiscoveryTool 
                onAnalysisComplete={handleAnalysisComplete}
                sourceCloud={sourceCloud}
                onSourceCloudChange={setSourceCloud}
              />
            </div>
          )}

          {activeTab === 'assessment' && (
            <div className="assessment-view">
              <Assessment workloads={discoveredWorkloads} onAssessmentComplete={handleAssessmentComplete} />
            </div>
          )}

          {activeTab === 'strategy' && (
            <div className="strategy-view">
              <DependencyMap workloads={discoveredWorkloads} />
              <EnhancedMigrationStrategy 
                workloads={discoveredWorkloads} 
                sourceCloud={sourceCloud} 
                assessment={assessmentResults} 
              />
              <WavePlanner workloads={discoveredWorkloads} />
            </div>
          )}

          {activeTab === 'landingzone' && (
            <div className="landing-zone-builder">
              <LandingZoneBuilder onConfigComplete={handleLandingZoneComplete} />
            </div>
          )}

          {activeTab === 'terraform' && landingZoneConfig && (
            <div className="terraform-generator">
              <TerraformGenerator config={landingZoneConfig} />
            </div>
          )}

          {activeTab === 'finops' && (
            <div className="finops-dashboard">
              <AdvancedAnalytics workloads={discoveredWorkloads} tco={tco} roi={roi} />
              <CostDashboard workloads={discoveredWorkloads} />
              <ResourceOptimization workloads={discoveredWorkloads} />
              <PolicyCompliance workloads={discoveredWorkloads} landingZoneConfig={landingZoneConfig} />
            </div>
          )}

          {activeTab === 'tco' && (
            <div className="tco-calculator">
              <EnhancedTcoCalculator onCalculate={handleTcoCalculate} workloads={discoveredWorkloads} />
            </div>
          )}

          {activeTab === 'agentic' && (
            <div className="agentic-workflow">
              <AgenticWorkflowView 
                workloadIds={discoveredWorkloads.map(w => w.id || w.name).filter(id => id)} 
                costInputs={{
                  onPremise: onPremise,
                  aws: aws,
                  azure: azure,
                  gcp: gcp,
                  migration: migration,
                  timeframe: timeframe
                }}
              />
            </div>
          )}

          {activeTab === 'executive' && (
            <div className="executive-dashboard">
              <ExecutiveDashboard />
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="dashboard-overview">
              <DashboardOverview
                tcoResults={tco}
                workloadStats={{
                  total: discoveredWorkloads.length,
                  migratable: discoveredWorkloads.filter(w => w.status !== 'retire').length
                }}
                projectStats={{
                  completion: 25, // This would be calculated based on actual project progress
                  riskLevel: 'medium',
                  costRisk: 45,
                  technicalRisk: 55,
                  businessRisk: 35
                }}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            </div>
          )}
        </Suspense>
          </div>
        </main>
      </div>
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

export default App;