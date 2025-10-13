import React, { useState, useMemo } from 'react';
import { TCOProvider } from './context/TCOContext';
import Tour from './Tour';
import TcoChart from './TcoChart';
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
import DiscoveryTool from './DiscoveryTool';
import MigrationStrategy from './MigrationStrategy';
import MigrationStrategyPlanner from './components/MigrationStrategyPlanner';
import DependencyMap from './DependencyMap';
import LandingZoneBuilder from './LandingZoneBuilder';
import TerraformGenerator from './TerraformGenerator';
import CostDashboard from './CostDashboard';
import ResourceOptimization from './ResourceOptimization';
import PolicyCompliance from './PolicyCompliance';
import WavePlanner from './WavePlanner';
import AdvancedAnalytics from './AdvancedAnalytics';
import ProjectManager from './ProjectManager';
import ThemeToggle from './ThemeToggle';
import EnhancedTcoCalculator from './components/EnhancedTcoCalculator';
import ExecutiveDashboard from './ExecutiveDashboard';
import AIInsightsPanel from './components/AIInsightsPanel';
import AdvancedProjectManager from './components/AdvancedProjectManager';
import AdvancedReportGenerator from './components/AdvancedReportGenerator';
import DashboardOverview from './components/DashboardOverview';
import { autoSave } from './utils/storage';
import { generateMigrationReport } from './utils/pdfExport';

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
  const [discoveredWorkloads, setDiscoveredWorkloads] = useState([]);
  const [landingZoneConfig, setLandingZoneConfig] = useState(null);
  const [projectName, setProjectName] = useState('My Cloud Migration Project');
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

  const handleOnPremiseChange = (e) => {
    setOnPremise({ ...onPremise, [e.target.name]: parseFloat(e.target.value) || 0 });
  };

  const handleAwsChange = (e) => {
    setAws({ ...aws, [e.target.name]: parseFloat(e.target.value) || 0 });
  };

  const handleAzureChange = (e) => {
    setAzure({ ...azure, [e.target.name]: parseFloat(e.target.value) || 0 });
  };

  const handleGcpChange = (e) => {
    setGcp({ ...gcp, [e.target.name]: parseFloat(e.target.value) || 0 });
  };

  const handleMigrationChange = (e) => {
    setMigration({ ...migration, [e.target.name]: parseFloat(e.target.value) || 0 });
  };

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

  const calculateTco = () => {
    // Calculate monthly on-premise costs
    const monthlyOnPremise =
      parseFloat(onPremise.hardware) +
      parseFloat(onPremise.software) +
      parseFloat(onPremise.maintenance) +
      parseFloat(onPremise.labor) +
      parseFloat(onPremise.power) +
      parseFloat(onPremise.cooling) +
      parseFloat(onPremise.datacenter);

    // Calculate monthly AWS costs
    const monthlyAws =
      parseFloat(aws.ec2) +
      parseFloat(aws.s3) +
      parseFloat(aws.rds) +
      parseFloat(aws.vpc) +
      parseFloat(aws.cloudwatch);

    // Calculate monthly Azure costs
    const monthlyAzure =
      parseFloat(azure.virtualMachines) +
      parseFloat(azure.blobStorage) +
      parseFloat(azure.sqlDatabase) +
      parseFloat(azure.networking) +
      parseFloat(azure.monitoring);

    // Calculate monthly GCP costs
    const monthlyGcp =
      parseFloat(gcp.compute) +
      parseFloat(gcp.storage) +
      parseFloat(gcp.networking) +
      parseFloat(gcp.database) +
      parseFloat(gcp.monitoring);

    // Calculate one-time migration costs
    const migrationCost =
      parseFloat(migration.assessment) +
      parseFloat(migration.tools) +
      parseFloat(migration.training) +
      parseFloat(migration.consulting);

    // Calculate TCO over the timeframe
    const onPremiseTco = monthlyOnPremise * timeframe;
    const awsTco = monthlyAws * timeframe;
    const azureTco = monthlyAzure * timeframe;
    const gcpTco = monthlyGcp * timeframe;

    const totalAwsTco = awsTco + migrationCost;
    const totalAzureTco = azureTco + migrationCost;
    const totalGcpTco = gcpTco + migrationCost;

    setTco({
      onPremise: onPremiseTco,
      aws: awsTco,
      azure: azureTco,
      gcp: gcpTco,
      migrationCost: migrationCost,
      totalAws: totalAwsTco,
      totalAzure: totalAzureTco,
      totalGcp: totalGcpTco,
    });

    // Calculate ROI for each cloud provider
    const awsNetSavings = onPremiseTco - totalAwsTco;
    const azureNetSavings = onPremiseTco - totalAzureTco;
    const gcpNetSavings = onPremiseTco - totalGcpTco;

    setRoi({
      aws: totalAwsTco > 0 ? (awsNetSavings / totalAwsTco) * 100 : 0,
      azure: totalAzureTco > 0 ? (azureNetSavings / totalAzureTco) * 100 : 0,
      gcp: totalGcpTco > 0 ? (gcpNetSavings / totalGcpTco) * 100 : 0,
    });
  };

  const exportToJSON = () => {
    const reportData = {
      generatedDate: new Date().toISOString(),
      analysisTimeframe: {
        months: timeframe,
        years: (timeframe / 12).toFixed(1),
      },
      onPremiseCosts: {
        monthly: {
          hardware: onPremise.hardware,
          software: onPremise.software,
          maintenance: onPremise.maintenance,
          labor: onPremise.labor,
          power: onPremise.power,
          cooling: onPremise.cooling,
          datacenter: onPremise.datacenter,
        },
        totalMonthly: Object.values(onPremise).reduce((a, b) => parseFloat(a) + parseFloat(b), 0),
        totalOverTimeframe: tco.onPremise,
      },
      awsCosts: {
        monthly: {
          ec2: aws.ec2,
          s3: aws.s3,
          rds: aws.rds,
          vpc: aws.vpc,
          cloudwatch: aws.cloudwatch,
        },
        totalMonthly: Object.values(aws).reduce((a, b) => parseFloat(a) + parseFloat(b), 0),
        totalOverTimeframe: tco.aws,
      },
      azureCosts: {
        monthly: {
          virtualMachines: azure.virtualMachines,
          blobStorage: azure.blobStorage,
          sqlDatabase: azure.sqlDatabase,
          networking: azure.networking,
          monitoring: azure.monitoring,
        },
        totalMonthly: Object.values(azure).reduce((a, b) => parseFloat(a) + parseFloat(b), 0),
        totalOverTimeframe: tco.azure,
      },
      gcpCosts: {
        monthly: {
          compute: gcp.compute,
          storage: gcp.storage,
          networking: gcp.networking,
          database: gcp.database,
          monitoring: gcp.monitoring,
        },
        totalMonthly: Object.values(gcp).reduce((a, b) => parseFloat(a) + parseFloat(b), 0),
        totalOverTimeframe: tco.gcp,
      },
      migrationCosts: {
        oneTime: {
          assessment: migration.assessment,
          tools: migration.tools,
          training: migration.training,
          consulting: migration.consulting,
        },
        total: tco.migrationCost,
      },
      summary: {
        onPremiseTCO: tco.onPremise,
        awsRecurringTCO: tco.aws,
        azureRecurringTCO: tco.azure,
        gcpRecurringTCO: tco.gcp,
        migrationCosts: tco.migrationCost,
        totalAwsTCO: tco.totalAws,
        totalAzureTCO: tco.totalAzure,
        totalGcpTCO: tco.totalGcp,
        awsNetSavings: tco.onPremise - tco.totalAws,
        azureNetSavings: tco.onPremise - tco.totalAzure,
        gcpNetSavings: tco.onPremise - tco.totalGcp,
        awsROI: roi.aws,
        azureROI: roi.azure,
        gcpROI: roi.gcp,
      },
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `multicloud-tco-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const reportData = {
      projectName,
      workloads: discoveredWorkloads,
      tco,
      roi,
      timeframe,
      landingZoneConfig,
    };
    generateMigrationReport(reportData);
  };

  const chartData = {
    labels: ['On-Premise', 'AWS', 'Azure', 'GCP'],
    datasets: [
      {
        label: `Recurring Costs (${timeframe} months)`,
        data: [tco.onPremise, tco.aws, tco.azure, tco.gcp],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 2,
      },
      {
        label: `Total with Migration`,
        data: [tco.onPremise, tco.totalAws, tco.totalAzure, tco.totalGcp],
        backgroundColor: [
          'rgba(255, 99, 132, 0.4)',
          'rgba(255, 159, 64, 0.4)',
          'rgba(54, 162, 235, 0.4)',
          'rgba(75, 192, 192, 0.4)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 2,
        borderDash: [5, 5],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: true,
        text: 'Multi-Cloud TCO Comparison',
        font: {
          size: 18,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += '$' + context.parsed.y.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString('en-US');
          }
        }
      }
    }
  };

  const handleDiscoveryComplete = (workloads) => {
    setDiscoveredWorkloads(workloads);
    setActiveTab('strategy');
  };

  const handleLandingZoneComplete = (config) => {
    setLandingZoneConfig(config);
    setActiveTab('terraform');
  };

  const handleLoadProject = (projectData) => {
    if (projectData.workloads) setDiscoveredWorkloads(projectData.workloads);
    if (projectData.landingZoneConfig) setLandingZoneConfig(projectData.landingZoneConfig);
    if (projectData.onPremise) setOnPremise(projectData.onPremise);
    if (projectData.aws) setAws(projectData.aws);
    if (projectData.azure) setAzure(projectData.azure);
    if (projectData.gcp) setGcp(projectData.gcp);
    if (projectData.migration) setMigration(projectData.migration);
    if (projectData.timeframe) setTimeframe(projectData.timeframe);
  };

  const handleNewProject = () => {
    if (window.confirm('Clear all data and start a new project?')) {
      setDiscoveredWorkloads([]);
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
      landingZoneConfig,
      onPremise,
      aws,
      azure,
      gcp,
      migration,
      timeframe,
    };
    autoSave(projectData);
  }, [projectName, discoveredWorkloads, landingZoneConfig, onPremise, aws, azure, gcp, migration, timeframe]);

  return (
    <TCOProvider>
      <div className="container-fluid mt-4 mb-5">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h1 className="mb-1">Google Cloud Infrastructure Modernization Accelerator</h1>
                <p className="text-muted mb-0">
                  <strong>{projectName}</strong>
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
                    currentProjectName={projectName}
                    onProjectNameChange={setProjectName}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tour run={runTour} steps={tourSteps} />

        {/* Navigation Tabs */}
        <div className="row mb-4">
          <div className="col-12">
            <ul className="nav nav-pills nav-fill">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'discovery' ? 'active' : ''}`}
                  onClick={() => setActiveTab('discovery')}
                >
                  🔍 Discovery
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'strategy' ? 'active' : ''}`}
                  onClick={() => setActiveTab('strategy')}
                >
                  🎯 Strategy
                  {discoveredWorkloads.length > 0 && (
                    <span className="badge bg-light text-dark ms-2">{discoveredWorkloads.length}</span>
                  )}
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'landingzone' ? 'active' : ''}`}
                  onClick={() => setActiveTab('landingzone')}
                >
                  🏗️ Landing Zone
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'terraform' ? 'active' : ''}`}
                  onClick={() => setActiveTab('terraform')}
                  disabled={!landingZoneConfig}
                >
                  📦 Terraform
                  {landingZoneConfig && (
                    <span className="badge bg-light text-dark ms-2">✓</span>
                  )}
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'finops' ? 'active' : ''}`}
                  onClick={() => setActiveTab('finops')}
                >
                  📊 FinOps
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'tco' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tco')}
                >
                  💰 TCO Calculator
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'executive' ? 'active' : ''}`}
                  onClick={() => setActiveTab('executive')}
                >
                  🎯 Executive Dashboard
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  🏠 Overview
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'discovery' && (
          <div className="discovery-tool">
            <DiscoveryTool onDiscoveryComplete={handleDiscoveryComplete} />
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="strategy-view">
            <DependencyMap workloads={discoveredWorkloads} />
            <MigrationStrategy workloads={discoveredWorkloads} />
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
            <EnhancedTcoCalculator onCalculate={handleTcoCalculate} />
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
      </div>
    </TCOProvider>
  );
}

export default App;