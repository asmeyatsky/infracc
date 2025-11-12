/**
 * Unified Migration Flow Component
 * 
 * Single coherent flow through the migration process
 * Shows agents working at each step
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { getAgenticContainer } from '../../agentic/dependency_injection/AgenticContainer.js';
import { getContainer } from '../../infrastructure/dependency_injection/Container.js';
import { agentStatusManager } from '../../agentic/core/AgentStatusManager.js';
import { agentEventEmitter } from '../../agentic/core/AgentEventEmitter.js';
import AgentStatusDashboard from '../../presentation/components/AgentStatusDashboard.js';
import AgentActivityLog from '../../presentation/components/AgentActivityLog.js';
// Test data loading removed - start with 0 workloads until upload completes
import { Workload } from '../../domain/entities/Workload.js';
import ReportSummaryView from '../report/ReportSummaryView.js';
import { generateComprehensiveReportPDF } from '../../utils/reportPdfGenerator.js';
import { ReportDataAggregator } from '../../domain/services/ReportDataAggregator.js';
import { GCPCostEstimator } from '../../domain/services/GCPCostEstimator.js';
import './MigrationFlow.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const STEPS = [
  { id: 'discovery', name: 'Discovery', icon: '🔍', agent: 'DiscoveryAgent', required: true },
  { id: 'assessment', name: 'Assessment', icon: '📊', agent: 'AssessmentAgent', required: true },
  { id: 'strategy', name: 'Strategy', icon: '🎯', agent: 'PlanningAgent', required: true },
  { id: 'cost', name: 'Cost Optimization', icon: '💰', agent: 'CostAnalysisAgent', required: false },
  { id: 'report', name: 'Report', icon: '📄', agent: null, required: false },
];

function MigrationFlow({ uploadSummary, onSummaryDismiss }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState({});
  const [showAgents, setShowAgents] = useState(true);
  const [testDataLoaded, setTestDataLoaded] = useState(false);
  const [projectData, setProjectData] = useState(null);
  const [discoveredWorkloads, setDiscoveredWorkloads] = useState([]);
  const [workloadIds, setWorkloadIds] = useState([]);
  const [assessmentResults, setAssessmentResults] = useState(null);
  const [strategyResults, setStrategyResults] = useState(null);
  const [costAnalysisResults, setCostAnalysisResults] = useState(null);
  const [outputFormat, setOutputFormat] = useState('screen'); // 'screen' or 'pdf'
  const [costEstimates, setCostEstimates] = useState(null);

  // Debug: Log when uploadSummary changes
  useEffect(() => {
    if (uploadSummary) {
      console.log('MigrationFlow received uploadSummary:', uploadSummary);
    }
  }, [uploadSummary]);

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
            toast.warning('No workloads found. Please complete Discovery first.');
            return false;
          }
          console.log(`Running Assessment Agent for ${workloadIds.length} workloads...`);
          try {
            const assessmentResult = await agenticContainer.assessmentAgent.assessBatch({ 
              workloadIds, 
              parallel: true 
            });
            console.log('Assessment result received:', assessmentResult);
            setAssessmentResults(assessmentResult);
            setStepStatuses(prev => ({ ...prev, assessment: 'completed' }));
            toast.success(`Assessment complete! Processed ${assessmentResult?.results?.length || workloadIds.length} workloads.`);
            return true;
          } catch (error) {
            console.error('Assessment failed:', error);
            toast.error(`Assessment failed: ${error.message}`);
            return false;
          }

        case 'strategy':
          // Step 3: Strategy - requires workloads from discovery
          if (workloadIds.length === 0) {
            console.warn('Strategy requires workloads. Please complete Discovery first.');
            toast.warning('No workloads found. Please complete Discovery first.');
            return false;
          }
          console.log(`Running Planning Agent for ${workloadIds.length} workloads...`);
          try {
            const strategyResult = await agenticContainer.planningAgent.generateAutonomousStrategy({ 
              workloadIds 
            });
            console.log('Strategy result received:', strategyResult);
            setStrategyResults(strategyResult);
            setStepStatuses(prev => ({ ...prev, strategy: 'completed' }));
            toast.success(`Strategy planning complete! Generated plans for ${workloadIds.length} workloads.`);
            return true;
          } catch (error) {
            console.error('Strategy planning failed:', error);
            toast.error(`Strategy planning failed: ${error.message}`);
            return false;
          }

        case 'cost':
          // Step 4: Cost Optimization - Run Cost Analysis Agent
          if (workloadIds.length === 0) {
            console.warn('Cost optimization requires workloads. Please complete Discovery first.');
            toast.warning('No workloads found. Please complete Discovery first.');
            return false;
          }
          
          console.log(`Running Cost Analysis Agent...`);
          try {
            // For now, we'll skip cost analysis if no cost inputs are provided
            // In a real scenario, cost inputs would come from the workloads or user input
            // For this flow, we'll generate cost estimates instead
            const serviceAggregation = ReportDataAggregator.aggregateByService(discoveredWorkloads);
            const estimates = await GCPCostEstimator.estimateAllServiceCosts(serviceAggregation, 'us-central1');
            setCostEstimates(estimates);
            
            // If cost inputs are available, run the Cost Analysis Agent
            // For now, we'll mark this step as completed with the estimates
            setStepStatuses(prev => ({ ...prev, cost: 'completed' }));
            toast.success(`Cost optimization complete! Generated estimates for ${discoveredWorkloads.length} workloads.`);
            return true;
          } catch (error) {
            console.error('Cost optimization failed:', error);
            toast.error(`Cost optimization failed: ${error.message}`);
            return false;
          }

        case 'report':
          // Step 5: Report - Generate cost estimates and prepare report data
          if (discoveredWorkloads.length === 0) {
            console.warn('Report requires workloads. Please complete Discovery first.');
            return false;
          }

          try {
            // Generate report data
            const reportData = ReportDataAggregator.generateReportSummary(discoveredWorkloads);
            
            // Generate cost estimates if not already done
            if (!costEstimates) {
              const serviceAggregation = ReportDataAggregator.aggregateByService(discoveredWorkloads);
              const estimates = await GCPCostEstimator.estimateAllServiceCosts(serviceAggregation, 'us-central1');
              setCostEstimates(estimates);
            }

            setStepStatuses(prev => ({ ...prev, report: 'completed' }));
            
            // If PDF format selected, generate PDF immediately
            if (outputFormat === 'pdf') {
              try {
                await generateComprehensiveReportPDF(
                  reportData,
                  costEstimates,
                  strategyResults,
                  assessmentResults,
                  {
                    projectName: projectData?.name || 'AWS to GCP Migration Assessment',
                    targetRegion: 'us-central1'
                  }
                );
                toast.success('PDF report generated successfully!');
              } catch (pdfError) {
                console.error('PDF generation error:', pdfError);
                toast.error(`PDF generation failed: ${pdfError.message}. Showing screen report instead.`);
                // Continue to show screen report even if PDF fails
              }
            }
            
            return true;
          } catch (error) {
            console.error('Report generation failed:', error);
            toast.error(`Report generation failed: ${error.message}`);
            return false;
          }

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
      {/* Output Format Selection - Show at the start */}
      {currentStep === 0 && workloadIds.length === 0 && (
        <div className="card mb-4 border-primary">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">
              <i className="bi bi-gear me-2"></i>
              Report Output Format
            </h5>
          </div>
          <div className="card-body">
            <p className="mb-3">Choose how you want to view the final migration assessment report:</p>
            <div className="row">
              <div className="col-md-6 mb-3">
                <div 
                  className={`card h-100 cursor-pointer ${outputFormat === 'screen' ? 'border-primary shadow' : ''}`}
                  onClick={() => setOutputFormat('screen')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-body text-center">
                    <i className="bi bi-display fs-1 text-primary"></i>
                    <h5 className="mt-3">View on Screen</h5>
                    <p className="text-muted mb-0">Interactive report with charts and tables</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <div 
                  className={`card h-100 cursor-pointer ${outputFormat === 'pdf' ? 'border-primary shadow' : ''}`}
                  onClick={() => setOutputFormat('pdf')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-body text-center">
                    <i className="bi bi-file-earmark-pdf fs-1 text-danger"></i>
                    <h5 className="mt-3">Download PDF</h5>
                    <p className="text-muted mb-0">Comprehensive PDF report for sharing</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="alert alert-info mt-3 mb-0">
              <i className="bi bi-info-circle me-2"></i>
              You can change this selection at any time. The report will be generated after completing all steps.
            </div>
          </div>
        </div>
      )}
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
              
              {/* Show upload summary if available, even if workloads haven't loaded yet */}
              {uploadSummary && uploadSummary.totalFiles && (
                <div className="card mb-3">
                  <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">📊 Upload Summary - Unique Workloads Discovered</h5>
                    {onSummaryDismiss && (
                      <button 
                        className="btn btn-sm btn-light"
                        onClick={onSummaryDismiss}
                        aria-label="Close summary"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <strong>Total Files Processed:</strong> {uploadSummary.totalFiles}
                      </div>
                      <div className="col-md-6">
                        <strong>Total Rows Processed:</strong> {uploadSummary.totalRows.toLocaleString()}
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <strong>Unique Workloads Discovered:</strong> 
                        <span className="badge bg-success ms-2">{uploadSummary.uniqueWorkloads.toLocaleString()}</span>
                      </div>
                      <div className="col-md-6">
                        <strong>Duplicates Merged:</strong> 
                        <span className="badge bg-info ms-2">{uploadSummary.duplicatesMerged.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <strong>Workloads Saved:</strong> {uploadSummary.workloadsSaved.toLocaleString()}
                      </div>
                      <div className="col-md-6">
                        <strong>Total Monthly Cost (Sum of All Bills):</strong> 
                        <span className="badge bg-warning text-dark ms-2">
                          ${(uploadSummary.totalMonthlyCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {uploadSummary.totalAggregatedCost && uploadSummary.totalAggregatedCost !== uploadSummary.totalMonthlyCost && (
                          <small className="text-muted ms-2">
                            (Deduplicated: ${uploadSummary.totalAggregatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </small>
                        )}
                      </div>
                    </div>
                    
                    <hr />
                    
                    <h6 className="mb-3">Per-File Breakdown:</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th>File Name</th>
                            <th className="text-end">Rows</th>
                            <th className="text-end">Unique</th>
                            <th className="text-end">Duplicates</th>
                            <th className="text-end">Saved</th>
                            <th className="text-end">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadSummary.fileStats && uploadSummary.fileStats.map((stat, idx) => (
                            <tr key={idx}>
                              <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={stat.fileName}>
                                {stat.fileName}
                              </td>
                              <td className="text-end">{stat.rowsProcessed.toLocaleString()}</td>
                              <td className="text-end">
                                <span className="badge bg-success">{stat.uniqueWorkloads.toLocaleString()}</span>
                              </td>
                              <td className="text-end">
                                <span className="badge bg-info">{stat.duplicates.toLocaleString()}</span>
                              </td>
                              <td className="text-end">{stat.newWorkloadsSaved.toLocaleString()}</td>
                              <td className="text-end">
                                ${(stat.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="table-light">
                          <tr>
                            <th>Totals</th>
                            <th className="text-end">{uploadSummary.totalRows.toLocaleString()}</th>
                            <th className="text-end">
                              <span className="badge bg-success">{uploadSummary.uniqueWorkloads.toLocaleString()}</span>
                            </th>
                            <th className="text-end">
                              <span className="badge bg-info">{uploadSummary.duplicatesMerged.toLocaleString()}</span>
                            </th>
                            <th className="text-end">{uploadSummary.workloadsSaved.toLocaleString()}</th>
                            <th className="text-end">
                              <strong>${uploadSummary.totalMonthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                            </th>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    
                    <div className="alert alert-info mt-3 mb-0">
                      <small>
                        <strong>Note:</strong> Costs are aggregated across all dates for each unique workload. 
                        Duplicate entries (same resource across different dates) have been merged and their costs summed.
                      </small>
                    </div>
                  </div>
                </div>
              )}
              
              {workloadIds.length > 0 ? (
                <div>
                  <div className="alert alert-success">
                    <h4>✅ Workloads Already Discovered:</h4>
                    <p><strong>{workloadIds.length} workloads</strong> found in repository (from CUR upload or previous discovery).</p>
                    <p>Discovery step is complete. Click "Next" to run the Assessment Agent.</p>
                    <div className="mt-3">
                      <button 
                        className="btn btn-primary me-2"
                        onClick={async () => {
                          setStepStatuses(prev => ({ ...prev, discovery: 'completed' }));
                          setCurrentStep(1);
                          // Auto-run Assessment agent when moving to next step
                          setTimeout(async () => {
                            await handleNextStep();
                          }, 100);
                        }}
                      >
                        Run Assessment Agent →
                      </button>
                      <button 
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setCurrentStep(1);
                          setStepStatuses(prev => ({ ...prev, discovery: 'completed' }));
                        }}
                      >
                        View Assessment Step Only
                      </button>
                    </div>
                  </div>
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
              <h3>📊 Assessment</h3>
              {workloadIds.length === 0 ? (
                <div className="alert alert-warning">
                  ⚠️ Please complete Discovery first to get workloads
                </div>
              ) : (
                <div>
                  {stepStatuses.assessment !== 'completed' ? (
                    <div className="alert alert-info mb-3">
                      <p><strong>{workloadIds.length} workloads</strong> ready for assessment.</p>
                      <p>Click "Next" below to run the Assessment Agent, or click the button above to auto-run it.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="alert alert-success mb-3">
                        <h5>✅ Assessment Complete!</h5>
                        <p>Successfully assessed <strong>{assessmentResults?.results?.length || workloadIds.length} workloads</strong>.</p>
                      </div>
                      
                      {assessmentResults && (
                        <div className="card mb-3">
                          <div className="card-header">
                            <h5>Assessment Summary</h5>
                          </div>
                          <div className="card-body">
                            <div className="row mb-3">
                              <div className="col-md-4">
                                <div className="text-center p-3 bg-light rounded">
                                  <h3 className="text-primary">{assessmentResults.results?.filter(r => !r.error).length || 0}</h3>
                                  <small className="text-muted">Successful Assessments</small>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="text-center p-3 bg-light rounded">
                                  <h3 className="text-warning">{assessmentResults.results?.filter(r => r.error).length || 0}</h3>
                                  <small className="text-muted">Errors</small>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="text-center p-3 bg-light rounded">
                                  <h3 className="text-info">{assessmentResults.totalTime ? `${(assessmentResults.totalTime / 1000).toFixed(1)}s` : 'N/A'}</h3>
                                  <small className="text-muted">Total Time</small>
                                </div>
                              </div>
                            </div>
                            
                            {assessmentResults.results && assessmentResults.results.length > 0 && (
                              <div>
                                {/* Complexity Distribution Chart */}
                                <div className="mb-4">
                                  <h6>Workload Distribution by Complexity</h6>
                                  {(() => {
                                    // Calculate complexity distribution
                                    const complexityRanges = {
                                      'Low (1-3)': 0,
                                      'Medium (4-6)': 0,
                                      'High (7-10)': 0
                                    };
                                    
                                    assessmentResults.results.forEach(result => {
                                      if (result.error) return;
                                      let assessment = result.assessment || result;
                                      
                                      // Handle Assessment entity
                                      if (assessment && typeof assessment.toJSON === 'function') {
                                        assessment = assessment.toJSON();
                                      }
                                      
                                      const score = assessment.complexityScore || 
                                                   assessment.infrastructureAssessment?.complexityScore ||
                                                   (assessment._complexityScore !== undefined ? assessment._complexityScore : null);
                                      
                                      if (typeof score === 'number' && !isNaN(score)) {
                                        if (score <= 3) complexityRanges['Low (1-3)']++;
                                        else if (score <= 6) complexityRanges['Medium (4-6)']++;
                                        else complexityRanges['High (7-10)']++;
                                      }
                                    });
                                    
                                    const chartData = {
                                      labels: Object.keys(complexityRanges),
                                      datasets: [{
                                        label: 'Number of Workloads',
                                        data: Object.values(complexityRanges),
                                        backgroundColor: [
                                          'rgba(40, 167, 69, 0.8)',   // Green for Low
                                          'rgba(255, 193, 7, 0.8)',   // Yellow for Medium
                                          'rgba(220, 53, 69, 0.8)'    // Red for High
                                        ],
                                        borderColor: [
                                          'rgba(40, 167, 69, 1)',
                                          'rgba(255, 193, 7, 1)',
                                          'rgba(220, 53, 69, 1)'
                                        ],
                                        borderWidth: 1
                                      }]
                                    };
                                    
                                    const chartOptions = {
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: {
                                          position: 'top',
                                        },
                                        title: {
                                          display: true,
                                          text: 'Workloads by Complexity Score'
                                        },
                                        tooltip: {
                                          callbacks: {
                                            label: function(context) {
                                              const total = Object.values(complexityRanges).reduce((a, b) => a + b, 0);
                                              const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                              return `${context.label}: ${context.parsed} workloads (${percentage}%)`;
                                            }
                                          }
                                        }
                                      },
                                      scales: {
                                        y: {
                                          beginAtZero: true,
                                          ticks: {
                                            stepSize: 1
                                          }
                                        }
                                      }
                                    };
                                    
                                    return (
                                      <div style={{ height: '300px' }}>
                                        <Bar data={chartData} options={chartOptions} />
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                {/* Readiness Distribution Chart */}
                                <div className="mb-4">
                                  <h6>Workload Distribution by Migration Readiness</h6>
                                  {(() => {
                                    const readinessCounts = {
                                      'Ready': 0,
                                      'Conditional': 0,
                                      'Not Ready': 0
                                    };
                                    
                                    assessmentResults.results.forEach(result => {
                                      if (result.error) return;
                                      let assessment = result.assessment || result;
                                      
                                      // Handle Assessment entity
                                      if (assessment && typeof assessment.toJSON === 'function') {
                                        assessment = assessment.toJSON();
                                      }
                                      
                                      const score = assessment.complexityScore || 
                                                   assessment.infrastructureAssessment?.complexityScore ||
                                                   (assessment._complexityScore !== undefined ? assessment._complexityScore : null);
                                      const riskFactors = assessment.riskFactors || 
                                                         assessment.infrastructureAssessment?.riskFactors || 
                                                         (Array.isArray(assessment._riskFactors) ? assessment._riskFactors : []);
                                      
                                      if (typeof score === 'number' && !isNaN(score)) {
                                        let readinessScore = 100;
                                        readinessScore -= (score - 1) * 5;
                                        readinessScore -= riskFactors.length * 10;
                                        readinessScore = Math.max(0, Math.min(100, readinessScore));
                                        
                                        if (readinessScore >= 70) readinessCounts['Ready']++;
                                        else if (readinessScore >= 40) readinessCounts['Conditional']++;
                                        else readinessCounts['Not Ready']++;
                                      }
                                    });
                                    
                                    const chartData = {
                                      labels: Object.keys(readinessCounts),
                                      datasets: [{
                                        label: 'Number of Workloads',
                                        data: Object.values(readinessCounts),
                                        backgroundColor: [
                                          'rgba(40, 167, 69, 0.8)',   // Green for Ready
                                          'rgba(255, 193, 7, 0.8)',   // Yellow for Conditional
                                          'rgba(220, 53, 69, 0.8)'    // Red for Not Ready
                                        ],
                                        borderColor: [
                                          'rgba(40, 167, 69, 1)',
                                          'rgba(255, 193, 7, 1)',
                                          'rgba(220, 53, 69, 1)'
                                        ],
                                        borderWidth: 1
                                      }]
                                    };
                                    
                                    const chartOptions = {
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: {
                                          position: 'top',
                                        },
                                        title: {
                                          display: true,
                                          text: 'Workloads by Migration Readiness'
                                        },
                                        tooltip: {
                                          callbacks: {
                                            label: function(context) {
                                              const total = Object.values(readinessCounts).reduce((a, b) => a + b, 0);
                                              const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                              return `${context.label}: ${context.parsed} workloads (${percentage}%)`;
                                            }
                                          }
                                        }
                                      },
                                      scales: {
                                        y: {
                                          beginAtZero: true,
                                          ticks: {
                                            stepSize: 1
                                          }
                                        }
                                      }
                                    };
                                    
                                    return (
                                      <div style={{ height: '300px' }}>
                                        <Bar data={chartData} options={chartOptions} />
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                <h6>Sample Assessments:</h6>
                                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                  <table className="table table-sm table-striped">
                                    <thead>
                                      <tr>
                                        <th>Workload</th>
                                        <th>Complexity</th>
                                        <th>Readiness</th>
                                        <th>Risk Level</th>
                                        <th>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {assessmentResults.results.slice(0, 10).map((result, idx) => {
                                        if (result.error) {
                                          return (
                                            <tr key={idx} className="table-danger">
                                              <td>{result.workloadId || 'Unknown'}</td>
                                              <td colSpan="4" className="text-danger">{result.error}</td>
                                            </tr>
                                          );
                                        }
                                        // Handle both Assessment entity and plain object
                                        let assessment = result.assessment || result;
                                        
                                        // If it's an Assessment entity, convert to plain object
                                        if (assessment && typeof assessment.toJSON === 'function') {
                                          assessment = assessment.toJSON();
                                        }
                                        
                                        // Extract complexity score (number 1-10) - check multiple possible locations
                                        const complexityScore = assessment.complexityScore || 
                                                              assessment.infrastructureAssessment?.complexityScore ||
                                                              (assessment._complexityScore !== undefined ? assessment._complexityScore : null);
                                        
                                        // Convert numeric complexity to level
                                        const getComplexityLevel = (score) => {
                                          if (typeof score !== 'number' || isNaN(score)) return 'N/A';
                                          if (score <= 3) return 'Low';
                                          if (score <= 6) return 'Medium';
                                          return 'High';
                                        };
                                        
                                        // Calculate readiness from complexity and risk factors
                                        const getReadiness = (assessment) => {
                                          const score = complexityScore;
                                          const riskFactors = assessment.riskFactors || 
                                                             assessment.infrastructureAssessment?.riskFactors || 
                                                             [];
                                          
                                          if (typeof score !== 'number' || isNaN(score)) return 'N/A';
                                          
                                          // Calculate readiness score (0-100)
                                          let readinessScore = 100;
                                          readinessScore -= (score - 1) * 5; // Deduct for complexity
                                          readinessScore -= riskFactors.length * 10; // Deduct for risks
                                          readinessScore = Math.max(0, Math.min(100, readinessScore));
                                          
                                          if (readinessScore >= 70) return 'Ready';
                                          if (readinessScore >= 40) return 'Conditional';
                                          return 'Not Ready';
                                        };
                                        
                                        // Get risk level from risk factors
                                        const getRiskLevel = (assessment) => {
                                          const riskFactors = assessment.riskFactors || 
                                                             assessment.infrastructureAssessment?.riskFactors || 
                                                             [];
                                          const score = complexityScore || 5;
                                          
                                          if (riskFactors.length >= 3 || score >= 8) return 'High';
                                          if (riskFactors.length >= 1 || score >= 5) return 'Medium';
                                          return 'Low';
                                        };
                                        
                                        const complexityLevel = getComplexityLevel(complexityScore);
                                        const readiness = getReadiness(assessment);
                                        const riskLevel = getRiskLevel(assessment);
                                        
                                        return (
                                          <tr key={idx}>
                                            <td><code>{result.workloadId || 'Unknown'}</code></td>
                                            <td>
                                              <span className={`badge ${complexityLevel === 'Low' ? 'bg-success' : complexityLevel === 'Medium' ? 'bg-warning' : complexityLevel === 'High' ? 'bg-danger' : 'bg-secondary'}`}>
                                                {complexityLevel} {typeof complexityScore === 'number' ? `(${complexityScore})` : ''}
                                              </span>
                                            </td>
                                            <td>
                                              <span className={`badge ${readiness === 'Ready' ? 'bg-success' : readiness === 'Conditional' ? 'bg-warning' : readiness === 'Not Ready' ? 'bg-danger' : 'bg-secondary'}`}>
                                                {readiness}
                                              </span>
                                            </td>
                                            <td>
                                              <span className={`badge ${riskLevel === 'Low' ? 'bg-success' : riskLevel === 'Medium' ? 'bg-warning' : 'bg-danger'}`}>
                                                {riskLevel}
                                              </span>
                                            </td>
                                            <td><span className="badge bg-success">✓ Complete</span></td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                  {assessmentResults.results.length > 10 && (
                                    <div className="text-muted text-center p-2">
                                      <small>Showing first 10 of {assessmentResults.results.length} assessments</small>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="alert alert-info">
                        <p>Click "Next" to proceed to Strategy Planning.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="step-content">
              <h3>🎯 Strategy Planning</h3>
              {workloadIds.length === 0 ? (
                <div className="alert alert-warning">
                  ⚠️ Please complete Discovery and Assessment first
                </div>
              ) : (
                <div>
                  {!strategyResults && stepStatuses.strategy !== 'completed' ? (
                    <div className="alert alert-info mb-3">
                      <p><strong>{workloadIds.length} workloads</strong> ready for strategy planning.</p>
                      <p>Click "Next" below to run the Planning Agent.</p>
                    </div>
                  ) : strategyResults || stepStatuses.strategy === 'completed' ? (
                    <div>
                      <div className="alert alert-success mb-3">
                        <h5>✅ Strategy Planning Complete!</h5>
                        <p>Successfully generated migration strategy for <strong>{workloadIds.length} workloads</strong>.</p>
                      </div>
                      
                      {strategyResults && (
                        <div className="card mb-3">
                          <div className="card-header">
                            <h5>Migration Strategy Summary</h5>
                          </div>
                          <div className="card-body">
                            {strategyResults.migrationPlan && (
                              <div className="mb-4">
                                <h6>Strategy Distribution:</h6>
                                {strategyResults.migrationPlan.metrics && strategyResults.migrationPlan.metrics.strategyDistribution && (
                                  <div className="row mb-3">
                                    {Object.entries(strategyResults.migrationPlan.metrics.strategyDistribution).map(([strategy, count]) => (
                                      <div key={strategy} className="col-md-3 mb-2">
                                        <div className="text-center p-2 bg-light rounded">
                                          <h4 className="text-primary">{count}</h4>
                                          <small className="text-muted text-capitalize">{strategy}</small>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {strategyResults.migrationPlan.plans && (
                                  <div className="mb-3">
                                    <h6>Migration Plans:</h6>
                                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                      <table className="table table-sm table-striped">
                                        <thead>
                                          <tr>
                                            <th>Workload</th>
                                            <th>Strategy</th>
                                            <th>Target GCP Service</th>
                                            <th>Effort</th>
                                            <th>Wave</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {strategyResults.migrationPlan.plans.slice(0, 20).map((plan, idx) => (
                                            <tr key={idx}>
                                              <td><code>{plan.workloadId || plan.workload?.id || 'Unknown'}</code></td>
                                              <td>
                                                <span className={`badge ${
                                                  plan.strategy === 'Rehost' ? 'bg-success' :
                                                  plan.strategy === 'Replatform' ? 'bg-info' :
                                                  plan.strategy === 'Refactor' ? 'bg-warning' :
                                                  'bg-secondary'
                                                }`}>
                                                  {plan.strategy || 'N/A'}
                                                </span>
                                              </td>
                                              <td>{plan.targetGcpService || plan.gcpService || 'N/A'}</td>
                                              <td>
                                                <span className={`badge ${
                                                  plan.effort === 'Low' ? 'bg-success' :
                                                  plan.effort === 'Medium' ? 'bg-warning' :
                                                  'bg-danger'
                                                }`}>
                                                  {plan.effort || 'N/A'}
                                                </span>
                                              </td>
                                              <td>
                                                <span className="badge bg-primary">
                                                  {plan.wave || 'N/A'}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                      {strategyResults.migrationPlan.plans.length > 20 && (
                                        <div className="text-muted text-center p-2">
                                          <small>Showing first 20 of {strategyResults.migrationPlan.plans.length} plans</small>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {strategyResults.wavePlan && (
                              <div className="mb-3">
                                <h6>Migration Waves:</h6>
                                <div className="row">
                                  <div className="col-md-4">
                                    <div className="text-center p-3 bg-light rounded">
                                      <h3 className="text-success">{strategyResults.wavePlan.wave1?.length || 0}</h3>
                                      <small className="text-muted">Wave 1</small>
                                    </div>
                                  </div>
                                  <div className="col-md-4">
                                    <div className="text-center p-3 bg-light rounded">
                                      <h3 className="text-warning">{strategyResults.wavePlan.wave2?.length || 0}</h3>
                                      <small className="text-muted">Wave 2</small>
                                    </div>
                                  </div>
                                  <div className="col-md-4">
                                    <div className="text-center p-3 bg-light rounded">
                                      <h3 className="text-danger">{strategyResults.wavePlan.wave3?.length || 0}</h3>
                                      <small className="text-muted">Wave 3</small>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {strategyResults.autonomousRecommendations && (
                              <div className="mb-3">
                                <h6>Recommendations:</h6>
                                <ul className="list-group">
                                  {strategyResults.autonomousRecommendations.recommendedApproach && (
                                    <li className="list-group-item">
                                      <strong>Recommended Approach:</strong> {strategyResults.autonomousRecommendations.recommendedApproach}
                                    </li>
                                  )}
                                  {strategyResults.autonomousRecommendations.successFactors && strategyResults.autonomousRecommendations.successFactors.length > 0 && (
                                    <li className="list-group-item">
                                      <strong>Success Factors:</strong>
                                      <ul className="mb-0 mt-2">
                                        {strategyResults.autonomousRecommendations.successFactors.slice(0, 5).map((factor, idx) => (
                                          <li key={idx}>{factor}</li>
                                        ))}
                                      </ul>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="alert alert-info">
                        <p>Click "Next" to view the comprehensive Migration Assessment Report.</p>
                        <button 
                          className="btn btn-primary mt-2"
                          onClick={() => handleNextStep()}
                        >
                          View Report →
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="step-content">
              <h3>💰 Cost Optimization</h3>
              {workloadIds.length === 0 ? (
                <div className="alert alert-warning">
                  ⚠️ Please complete Discovery, Assessment, and Strategy first
                </div>
              ) : (
                <div>
                  {stepStatuses.cost !== 'completed' ? (
                    <div className="alert alert-info mb-3">
                      <p><strong>{discoveredWorkloads.length} workloads</strong> ready for cost optimization.</p>
                      <p>Click "Next" below to run the Cost Analysis Agent and generate cost estimates.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="alert alert-success mb-3">
                        <h5>✅ Cost Optimization Complete!</h5>
                        <p>Successfully generated cost estimates for <strong>{discoveredWorkloads.length} workloads</strong>.</p>
                      </div>
                      
                      {costEstimates && costEstimates.length > 0 && (
                        <div className="card mb-3">
                          <div className="card-header">
                            <h5>Cost Estimates Summary</h5>
                          </div>
                          <div className="card-body">
                            <div className="row mb-3">
                              <div className="col-md-4">
                                <div className="text-center p-3 bg-light rounded">
                                  <h3 className="text-primary">{costEstimates.length}</h3>
                                  <small className="text-muted">Services Estimated</small>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="text-center p-3 bg-light rounded">
                                  <h3 className="text-success">
                                    ${costEstimates.reduce((sum, est) => {
                                      const costs = est.costEstimate || {};
                                      return sum + (costs.gcp3YearCUD || 0);
                                    }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </h3>
                                  <small className="text-muted">Total GCP 3Y CUD (Monthly)</small>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="text-center p-3 bg-light rounded">
                                  <h3 className="text-info">
                                    ${costEstimates.reduce((sum, est) => {
                                      const costs = est.costEstimate || {};
                                      return sum + (costs.savings3Year || 0);
                                    }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </h3>
                                  <small className="text-muted">Potential Savings (3Y)</small>
                                </div>
                              </div>
                            </div>
                            
                            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                              <table className="table table-sm table-striped">
                                <thead>
                                  <tr>
                                    <th>Service</th>
                                    <th className="text-end">AWS Cost</th>
                                    <th className="text-end">GCP On-Demand</th>
                                    <th className="text-end">GCP 3Y CUD</th>
                                    <th className="text-end">Savings (3Y)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {costEstimates.slice(0, 20).map((estimate, idx) => {
                                    const costs = estimate.costEstimate || {};
                                    return (
                                      <tr key={idx}>
                                        <td><code>{estimate.service || 'N/A'}</code></td>
                                        <td className="text-end">${(costs.awsCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="text-end">${(costs.gcpOnDemand || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="text-end">${(costs.gcp3YearCUD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="text-end">
                                          <span className={`badge ${(costs.savings3Year || 0) > 0 ? 'bg-success' : 'bg-secondary'}`}>
                                            ${(costs.savings3Year || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              {costEstimates.length > 20 && (
                                <div className="text-muted text-center p-2">
                                  <small>Showing first 20 of {costEstimates.length} cost estimates</small>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="alert alert-info">
                        <p>Click "Next" to view the comprehensive Migration Assessment Report.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="step-content">
              <h3>📄 Migration Assessment Report</h3>
              {workloadIds.length === 0 ? (
                <div className="alert alert-warning">
                  ⚠️ Please complete Discovery, Assessment, Strategy, and Cost Optimization first
                </div>
              ) : (
                <ReportSummaryView 
                  workloads={discoveredWorkloads}
                  assessmentResults={assessmentResults}
                  strategyResults={strategyResults}
                />
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
