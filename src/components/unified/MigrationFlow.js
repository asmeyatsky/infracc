/**
 * Unified Migration Flow Component
 * 
 * Single coherent flow through the migration process
 * Shows agents working at each step
 */

import React, { useState, useEffect } from 'react';
import { getAgenticContainer } from '../../agentic/dependency_injection/AgenticContainer.js';
import { getContainer } from '../../infrastructure/dependency_injection/Container.js';
import { agentStatusManager } from '../../agentic/core/AgentStatusManager.js';
import { agentEventEmitter } from '../../agentic/core/AgentEventEmitter.js';
import AgentStatusDashboard from '../../presentation/components/AgentStatusDashboard.js';
import AgentActivityLog from '../../presentation/components/AgentActivityLog.js';
// Test data loading removed - start with 0 workloads until upload completes
import { Workload } from '../../domain/entities/Workload.js';
import { generateModularMainTf, generateTfvars, generateVariablesTf, generateOutputsTf, generateBackendTf, generateVersionsTf, generateTerraformReadme } from '../../utils/terraformEnhanced.js';
import './MigrationFlow.css';

const STEPS = [
  { id: 'discovery', name: 'Discovery', icon: '🔍', agent: 'DiscoveryAgent', required: true },
  { id: 'assessment', name: 'Assessment', icon: '📊', agent: 'AssessmentAgent', required: true },
  { id: 'strategy', name: 'Strategy', icon: '🎯', agent: 'PlanningAgent', required: true },
  { id: 'cost', name: 'Cost Analysis', icon: '💰', agent: 'CostAnalysisAgent', required: false },
  { id: 'terraform', name: 'Terraform Code', icon: '📝', agent: null, required: false, optional: true },
  { id: 'execution', name: 'Execution', icon: '🚀', agent: 'AgenticOrchestrator', required: false },
];

function MigrationFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState({});
  const [showAgents, setShowAgents] = useState(true);
  const [testDataLoaded, setTestDataLoaded] = useState(false);
  const [projectData, setProjectData] = useState(null);
  const [discoveredWorkloads, setDiscoveredWorkloads] = useState([]);
  const [workloadIds, setWorkloadIds] = useState([]);
  const [generateTerraform, setGenerateTerraform] = useState(false);
  const [terraformCode, setTerraformCode] = useState(null);

  const agenticContainer = getAgenticContainer();
  const container = getContainer();
  const workloadRepository = container.workloadRepository;

  useEffect(() => {
    // Subscribe to agent status changes
    const unsubscribe = agentStatusManager.subscribe((statuses) => {
      const newStatuses = {};
      STEPS.forEach(step => {
        const agentStatus = statuses.agents.get(step.agent);
        if (agentStatus) {
          newStatuses[step.id] = agentStatus.status;
        }
      });
      setStepStatuses(newStatuses);
    });

    // Don't load test data automatically - start with 0 workloads
    // Test data can be loaded manually via "Load Demo" button if needed
    setTestDataLoaded(false);

    return () => {
      unsubscribe();
    };
  }, []);

  // Clear workloads on startup to start fresh
  useEffect(() => {
    const clearOnStartup = async () => {
      try {
        // Clear all workloads from repository to start fresh
        await workloadRepository.clear();
        console.log('Cleared all workloads on startup - starting fresh');
      } catch (error) {
        console.error('Error clearing workloads:', error);
      }
    };
    clearOnStartup();
  }, [workloadRepository]);

  // Load workloads from repository
  useEffect(() => {
    const loadWorkloads = async () => {
      try {
        const workloads = await workloadRepository.findAll();
        setDiscoveredWorkloads(workloads);
        setWorkloadIds(workloads.map(w => w.id));
        
        // Start from Discovery step (no auto-skip)
        // Workloads will appear after CUR upload completes
      } catch (error) {
        console.error('Error loading workloads:', error);
      }
    };
    loadWorkloads();
    
    // Subscribe to workload changes
    const interval = setInterval(loadWorkloads, 1000);
    return () => clearInterval(interval);
  }, [workloadRepository, currentStep]);

  const handleStepClick = (stepIndex) => {
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const handleNextStep = async () => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = STEPS[currentStep + 1];
      const success = await executeStep(nextStep);
      if (success) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const executeStep = async (step) => {
    try {
      switch (step.id) {
        case 'discovery':
          // Step 1: Discovery - must run first
          // DiscoveryAgent already saves workloads to repository
          const discoveryResult = await agenticContainer.discoveryAgent.execute({}, { scanType: 'full' });
          
          // Reload workloads after discovery
          const workloads = await workloadRepository.findAll();
          setDiscoveredWorkloads(workloads);
          setWorkloadIds(workloads.map(w => w.id));
          
          return true;

        case 'assessment':
          // Step 2: Assessment - requires workloads from discovery
          if (workloadIds.length === 0) {
            console.warn('Assessment requires workloads. Please complete Discovery first.');
            return false;
          }
          await agenticContainer.assessmentAgent.assessBatch({ 
            workloadIds, 
            parallel: true 
          });
          return true;

        case 'strategy':
          // Step 3: Strategy - requires workloads from discovery
          if (workloadIds.length === 0) {
            console.warn('Strategy requires workloads. Please complete Discovery first.');
            return false;
          }
          await agenticContainer.planningAgent.generateAutonomousStrategy({ 
            workloadIds 
          });
          return true;

        case 'cost':
          // Step 4: Cost Analysis - optional
          // Use default cost scenario (no test data pre-loaded)
          const defaultCosts = {
            onPremise: { hardware: 5000, software: 2000, maintenance: 1500, labor: 8000, power: 1200, cooling: 800, datacenter: 2500 },
            aws: { ec2: 3500, s3: 800, rds: 2200, vpc: 400, cloudwatch: 300 },
            azure: { virtualMachines: 3200, blobStorage: 700, sqlDatabase: 2000, networking: 450, monitoring: 250 },
            gcp: { compute: 2800, storage: 600, networking: 350, database: 1800, monitoring: 200 },
            migration: { assessment: 15000, tools: 8000, training: 12000, consulting: 25000 },
            timeframe: 36
          };
          await agenticContainer.costAnalysisAgent.execute(defaultCosts);
          return true;

        case 'terraform':
          // Step 5: Terraform Generation - optional
          if (!generateTerraform) {
            return true; // Skip if not enabled
          }
          
          if (workloadIds.length === 0) {
            console.warn('Terraform generation requires workloads. Please complete Discovery first.');
            return false;
          }

          // Generate Terraform code based on workloads and strategy
          const terraformConfig = {
            organizationId: projectData?.landingZoneConfig?.organizationId || '',
            billingAccountId: projectData?.landingZoneConfig?.billingAccountId || '',
            projects: discoveredWorkloads.slice(0, 3).map((w, i) => ({
              id: `project-${i + 1}`,
              name: w.name.replace(/\s+/g, '-').toLowerCase(),
              environment: 'production'
            })),
            networkConfig: {
              vpcName: 'main-vpc',
              region: discoveredWorkloads[0]?.region || 'us-central1',
              subnets: [
                { name: 'subnet-1', cidr: '10.0.1.0/24', region: 'us-central1' },
                { name: 'subnet-2', cidr: '10.0.2.0/24', region: 'us-east1' }
              ],
              enableNat: true
            },
            securityConfig: {
              enableVpcSc: true,
              enableOrgPolicies: true,
              enableLogging: true,
              logRetentionDays: 30
            },
            computeConfig: {
              enableGKE: discoveredWorkloads.some(w => w.type === 'container'),
              gkeClusterName: 'primary-cluster',
              gkeNodeCount: 3,
              enableGCE: true
            },
            storageConfig: {
              enableCloudSQL: discoveredWorkloads.some(w => w.type === 'database'),
              sqlTier: 'db-n1-standard-1',
              enableCloudStorage: true,
              storageClass: 'STANDARD'
            },
            observabilityConfig: {
              enableMonitoring: true,
              enableLogging: true,
              logSinkDestination: 'bigquery'
            }
          };

          const terraformFiles = {
            main: generateModularMainTf(),
            variables: generateVariablesTf(),
            outputs: generateOutputsTf(),
            tfvars: generateTfvars(terraformConfig),
            backend: generateBackendTf('terraform-state-bucket'),
            versions: generateVersionsTf(),
            readme: generateTerraformReadme()
          };

          setTerraformCode(terraformFiles);
          return true;

        case 'execution':
          // Step 6: Execution - requires all previous steps
          if (workloadIds.length === 0) {
            console.warn('Execution requires Discovery, Assessment, and Strategy to be completed first.');
            return false;
          }
          const costInputs = {
            onPremise: { hardware: 5000, software: 2000, maintenance: 1500, labor: 8000, power: 1200, cooling: 800, datacenter: 2500 },
            aws: { ec2: 3500, s3: 800, rds: 2200, vpc: 400, cloudwatch: 300 },
            azure: { virtualMachines: 3200, blobStorage: 700, sqlDatabase: 2000, networking: 450, monitoring: 250 },
            gcp: { compute: 2800, storage: 600, networking: 350, database: 1800, monitoring: 200 },
            migration: { assessment: 15000, tools: 8000, training: 12000, consulting: 25000 },
            timeframe: 36
          };
          await agenticContainer.orchestrator.executeMigrationWorkflow({
            workloadIds,
            costInputs
          });
          return true;

        default:
          return false;
      }
    } catch (error) {
      console.error(`Error executing step ${step.id}:`, error);
      // Error is already logged, UI will show error state
      return false;
    }
  };

  const getStepStatus = (stepIndex) => {
    const step = STEPS[stepIndex];
    
    // Skip Terraform step if not enabled
    if (step.id === 'terraform' && !generateTerraform) {
      return 'skipped';
    }
    
    // If Discovery step and workloads exist, mark as completed
    if (step.id === 'discovery' && workloadIds.length > 0) {
      return 'completed';
    }
    
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return stepStatuses[step.id] || 'active';
    return 'pending';
  };

  return (
    <div className="migration-flow">
      {/* Progress Steps */}
      <div className="flow-steps">
        {STEPS.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <div
              key={step.id}
              className={`flow-step flow-step-${status} ${index === currentStep ? 'flow-step-current' : ''}`}
              onClick={() => handleStepClick(index)}
            >
              <div className="flow-step-icon">{step.icon}</div>
              <div className="flow-step-content">
                <div className="flow-step-name">{step.name}</div>
                <div className="flow-step-status">{status}</div>
              </div>
              {index < STEPS.length - 1 && (
                <div className="flow-step-connector" />
              )}
            </div>
          );
        })}
      </div>

      {/* Current Step Content */}
      <div className="flow-content">
        <div className="flow-step-panel">
          <h2>{STEPS[currentStep].icon} {STEPS[currentStep].name}</h2>
          
          {currentStep === 0 && (
            <div className="step-content">
              <p>Discover and inventory your cloud workloads for migration.</p>
              {workloadIds.length > 0 ? (
                <div className="alert alert-success">
                  <h4>✅ Workloads Already Discovered:</h4>
                  <p><strong>{workloadIds.length} workloads</strong> found in repository (from CUR upload or previous discovery).</p>
                  <p>Discovery step is complete. Click "Next" to proceed to Assessment.</p>
                  <button 
                    className="btn btn-primary mt-2"
                    onClick={() => {
                      setCurrentStep(1);
                      setStepStatuses(prev => ({ ...prev, discovery: 'completed' }));
                    }}
                  >
                    Continue to Assessment →
                  </button>
                </div>
              ) : (
                <div>
                  <div className="alert alert-info">
                    <h4>📤 Upload CUR Files:</h4>
                    <p>Use the "Upload CUR" button in the main menu to import AWS Cost and Usage Reports.</p>
                    <p>Or click "Next" to use the Discovery Agent to scan your infrastructure.</p>
                  </div>
                  <button className="btn btn-primary" onClick={handleNextStep}>
                    Start Discovery Agent
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="step-content">
              <p>Discovering your cloud workloads...</p>
              {discoveredWorkloads.length > 0 && (
                <div className="alert alert-success">
                  <p>{discoveredWorkloads.length} workloads discovered</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="step-content">
              <h3>📊 Assessment</h3>
              <p>Assessing workloads for migration readiness...</p>
              {workloadIds.length === 0 ? (
                <div className="alert alert-warning">
                  ⚠️ Please complete Discovery first to get workloads
                </div>
              ) : (
                <div className="step-info">
                  <p>Assessing {workloadIds.length} workloads...</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="step-content">
              <h3>🎯 Strategy</h3>
              <p>Generating migration strategy...</p>
              {workloadIds.length === 0 ? (
                <div className="alert alert-warning">
                  ⚠️ Please complete Discovery and Assessment first
                </div>
              ) : (
                <div className="step-info">
                  <p>Generating strategy for {workloadIds.length} workloads...</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="step-content">
              <h3>💰 Cost Analysis</h3>
              <p>Analyzing costs and ROI...</p>
            </div>
          )}

          {currentStep === 5 && (
            <div className="step-content">
              <h3>📝 Terraform Code</h3>
              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="generateTerraform"
                    checked={generateTerraform}
                    onChange={(e) => setGenerateTerraform(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="generateTerraform">
                    Generate Terraform Infrastructure as Code
                  </label>
                </div>
                <small className="form-text text-muted">
                  Check this box to generate production-ready Terraform code for your GCP infrastructure
                </small>
              </div>
              {generateTerraform && terraformCode && (
                <div className="terraform-preview mt-3">
                  <h5>Terraform Files Generated:</h5>
                  <ul className="list-group">
                    {Object.keys(terraformCode).map(file => (
                      <li key={file} className="list-group-item d-flex justify-content-between align-items-center">
                        <code>{file}{file === 'tfvars' ? '.tfvars' : file === 'readme' ? '.md' : '.tf'}</code>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => {
                            const blob = new Blob([terraformCode[file]], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${file}${file === 'tfvars' ? '.tfvars' : file === 'readme' ? '.md' : '.tf'}`;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          Download
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {generateTerraform && !terraformCode && (
                <div className="alert alert-info">
                  Click "Continue" to generate Terraform code
                </div>
              )}
            </div>
          )}

          {currentStep === 6 && (
            <div className="step-content">
              <h3>🚀 Execution</h3>
              <p>Ready for execution!</p>
              {workloadIds.length === 0 && (
                <div className="alert alert-warning">
                  ⚠️ Please complete all previous steps first
                </div>
              )}
            </div>
          )}

          {/* Step Actions */}
          <div className="step-actions">
            {currentStep < STEPS.length - 1 && (
              <button 
                className="btn btn-primary" 
                onClick={handleNextStep}
                disabled={
                  stepStatuses[STEPS[currentStep].id] === 'running' ||
                  (STEPS[currentStep + 1]?.required && workloadIds.length === 0 && currentStep >= 0)
                }
              >
                {stepStatuses[STEPS[currentStep].id] === 'running' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    {STEPS[currentStep].name} in Progress...
                  </>
                ) : (
                  (() => {
                    // Find next non-skipped step
                    let nextStepIndex = currentStep + 1;
                    while (nextStepIndex < STEPS.length && STEPS[nextStepIndex]?.id === 'terraform' && !generateTerraform) {
                      nextStepIndex++;
                    }
                    return nextStepIndex < STEPS.length ? `Continue to ${STEPS[nextStepIndex].name}` : 'Complete';
                  })()
                )}
              </button>
            )}
            {currentStep > 0 && (
              <button 
                className="btn btn-secondary ms-2" 
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Previous Step
              </button>
            )}
          </div>
        </div>

        {/* Agent Dashboard */}
        {showAgents && (
          <div className="flow-agents">
            <div className="agent-toggle">
              <button
                className="btn btn-sm"
                onClick={() => setShowAgents(!showAgents)}
              >
                {showAgents ? 'Hide' : 'Show'} Agents
              </button>
            </div>
            {showAgents && (
              <>
                <AgentStatusDashboard />
                <AgentActivityLog />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MigrationFlow;
