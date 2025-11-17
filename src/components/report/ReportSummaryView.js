/**
 * Report Summary View Component
 * 
 * Main component displaying comprehensive migration assessment report:
 * - Executive Summary with key metrics and charts
 * - Technology Summary
 * - Regional Breakdown
 * - Cost Comparison
 * - Migration Recommendations
 * - PDF Download
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ReportDataAggregator } from '../../domain/services/ReportDataAggregator.js';
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
import { GCPCostEstimator } from '../../domain/services/GCPCostEstimator.js';
import { generateComprehensiveReportPDF } from '../../utils/reportPdfGenerator.js';
import TechnologySummary from './TechnologySummary.js';
import RegionalBreakdown from './RegionalBreakdown.js';
import CostComparison from './CostComparison.js';
import MigrationTimelineGantt from './MigrationTimelineGantt.js';
import { 
  MAX_SCREEN_WORKLOADS, 
  safeArrayLength, 
  getSafeSubset,
  isSafeToProcess,
  checkMemoryHealth 
} from '../../utils/safeOperations.js';

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

const ReportSummaryView = ({ workloads = [], assessmentResults = null, strategyResults = null, uploadSummary = null }) => {
  const [reportData, setReportData] = useState(null);
  const [targetRegion, setTargetRegion] = useState('us-central1');
  const isMountedRef = useRef(true);
  const [memoryWarning, setMemoryWarning] = useState(false);
  
  // Check memory health on mount and periodically
  useEffect(() => {
    const checkMemory = () => {
      try {
        const health = checkMemoryHealth();
        if (health.warning) {
          setMemoryWarning(true);
          console.warn('[ReportSummaryView] Memory warning:', health);
        }
      } catch (e) {
        // Ignore memory check errors
      }
    };
    
    checkMemory();
    const interval = setInterval(checkMemory, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Merge assessment results into workloads for accurate reporting
  const workloadsWithAssessments = useMemo(() => {
    try {
      const workloadCount = safeArrayLength(workloads);
      if (workloadCount === 0) {
        return [];
      }
      
      // CRITICAL: Memory guard - limit workloads for screen rendering
      if (workloadCount > MAX_SCREEN_WORKLOADS) {
        console.warn(`[ReportSummaryView] Limiting workloads from ${workloadCount} to ${MAX_SCREEN_WORKLOADS} for safe rendering`);
        // Return empty to trigger the warning message in parent component
        return [];
      }
      
      // Get safe subset if needed
      const safeWorkloads = getSafeSubset(workloads, MAX_SCREEN_WORKLOADS);
    
      // Create a map of assessment results by workloadId for fast lookup
      const assessmentMap = new Map();
      let validAssessmentsCount = 0;
      let assessmentsWithComplexityCount = 0;
      
      if (assessmentResults?.results) {
        // SAFETY: Batch forEach to avoid stack overflow with large datasets
        const ASSESSMENT_BATCH_SIZE = 10000;
        const assessmentResultsArray = Array.isArray(assessmentResults.results) 
          ? assessmentResults.results 
          : [];
        const safeAssessmentCount = Math.min(assessmentResultsArray.length, MAX_SCREEN_WORKLOADS);
        
        for (let i = 0; i < safeAssessmentCount; i += ASSESSMENT_BATCH_SIZE) {
          try {
            const batchEnd = Math.min(i + ASSESSMENT_BATCH_SIZE, safeAssessmentCount);
            const batch = assessmentResultsArray.slice(i, batchEnd);
            
            for (const assessment of batch) {
              try {
                if (assessment && !assessment.error && assessment.workloadId) {
                  // Handle both Assessment entity and plain objects
                  const assessmentObj = assessment.toJSON ? assessment.toJSON() : assessment;
                  
                  // Extract workloadId - handle both getter and direct property
                  const workloadId = assessment.workloadId || assessmentObj.workloadId;
                  
                  if (workloadId) {
                    validAssessmentsCount++;
                    
                    // Check if assessment has complexityScore
                    const complexityScore = assessmentObj.complexityScore !== undefined ? assessmentObj.complexityScore : 
                                           (assessment.complexityScore !== undefined ? assessment.complexityScore : null);
                    
                    if (complexityScore !== null && complexityScore !== undefined) {
                      assessmentsWithComplexityCount++;
                    }
                    
                    assessmentMap.set(workloadId, assessment);
                  }
                }
              } catch (assessmentError) {
                console.warn('[ReportSummaryView] Error processing assessment:', assessmentError);
                // Continue processing other assessments
              }
            }
          } catch (batchError) {
            console.error(`[ReportSummaryView] Error processing assessment batch ${i}:`, batchError);
            // Continue with next batch
          }
        }
      
      // Debug logging
      if (validAssessmentsCount > 0) {
        console.log(`ReportSummaryView: Found ${validAssessmentsCount.toLocaleString()} valid assessments`);
        console.log(`ReportSummaryView: ${assessmentsWithComplexityCount.toLocaleString()} assessments have complexityScore`);
        
        // Sample first few assessments to verify structure
        const sampleAssessments = assessmentResults.results.slice(0, 3).filter(a => a && !a.error);
        sampleAssessments.forEach((assessment, idx) => {
          const assessmentObj = assessment.toJSON ? assessment.toJSON() : assessment;
          console.log(`Sample assessment ${idx + 1}:`, {
            workloadId: assessmentObj.workloadId || assessment.workloadId,
            complexityScore: assessmentObj.complexityScore,
            hasToJSON: typeof assessment.toJSON === 'function',
            keys: Object.keys(assessmentObj)
          });
        });
      } else {
        console.warn('⚠️ ReportSummaryView: No valid assessments found in assessmentResults.results');
        console.log('assessmentResults structure:', {
          hasResults: !!assessmentResults.results,
          resultsLength: assessmentResults.results?.length,
          resultsType: Array.isArray(assessmentResults.results) ? 'array' : typeof assessmentResults.results
        });
      }
    } else {
      console.warn('⚠️ ReportSummaryView: assessmentResults is null or has no results property');
      console.log('assessmentResults:', assessmentResults);
    }
    
    // Merge assessments into workloads
    let mergedCount = 0;
    let mergedWithComplexityCount = 0;
    let fromWorkloadAssessmentCount = 0;
    
        // SAFETY: Batch map to avoid stack overflow with large datasets
        const merged = [];
        const WORKLOAD_BATCH_SIZE = 10000;
        const safeWorkloadCount = safeWorkloads.length;
        
        for (let i = 0; i < safeWorkloadCount; i += WORKLOAD_BATCH_SIZE) {
          try {
            const batchEnd = Math.min(i + WORKLOAD_BATCH_SIZE, safeWorkloadCount);
            const batch = safeWorkloads.slice(i, batchEnd);
            
            for (const workload of batch) {
              try {
                const workloadData = workload.toJSON ? workload.toJSON() : workload;
                
                // First, try to get assessment from assessmentResults
                let assessment = assessmentMap.get(workloadData.id);
                
                // Fallback: Check if workload already has assessment stored on it
                if (!assessment && workloadData.assessment) {
                  assessment = workloadData.assessment;
                  fromWorkloadAssessmentCount++;
                }
                
                if (assessment) {
                  mergedCount++;
                  
                  // Merge assessment data into workload
                  // Handle both Assessment entity (with methods) and plain objects
                  let assessmentObj = assessment.toJSON ? assessment.toJSON() : assessment;
                  
                  // If assessment is already a plain object with complexityScore at root, use it directly
                  // This handles the case where assessments were serialized in PipelineOrchestrator
                  if (assessmentObj.complexityScore !== undefined && assessmentObj.complexityScore !== null) {
                    // Already has complexityScore at root - good!
                  } else if (assessment && typeof assessment.complexityScore === 'number') {
                    // Assessment entity with getter
                    assessmentObj = { ...assessmentObj, complexityScore: assessment.complexityScore };
                  }
                  
                  // Extract complexityScore - check multiple possible locations
                  let complexityScore = null;
                  
                  // Try in order of preference:
                  // 1. assessmentObj.complexityScore (from toJSON)
                  if (assessmentObj.complexityScore !== undefined && assessmentObj.complexityScore !== null) {
                    complexityScore = parseFloat(assessmentObj.complexityScore);
                  }
                  // 2. assessment.complexityScore (direct getter)
                  else if (assessment.complexityScore !== undefined && assessment.complexityScore !== null) {
                    complexityScore = parseFloat(assessment.complexityScore);
                  }
                  // 3. assessmentObj.infrastructureAssessment.complexityScore
                  else if (assessmentObj.infrastructureAssessment?.complexityScore !== undefined && 
                           assessmentObj.infrastructureAssessment.complexityScore !== null) {
                    complexityScore = parseFloat(assessmentObj.infrastructureAssessment.complexityScore);
                  }
                  // 4. assessment.infrastructureAssessment.complexityScore
                  else if (assessment.infrastructureAssessment?.complexityScore !== undefined && 
                           assessment.infrastructureAssessment.complexityScore !== null) {
                    complexityScore = parseFloat(assessment.infrastructureAssessment.complexityScore);
                  }
                  // 5. Fallback to complexity (if exists)
                  else if (assessmentObj.complexity !== undefined && assessmentObj.complexity !== null) {
                    complexityScore = parseFloat(assessmentObj.complexity);
                  }
                  
                  if (complexityScore !== null && complexityScore !== undefined && !isNaN(complexityScore)) {
                    mergedWithComplexityCount++;
                  } else {
                    console.warn(`⚠️ No complexity score found for workload ${workloadData.id}`, {
                      hasAssessment: !!assessment,
                      hasToJSON: typeof assessment.toJSON === 'function',
                      assessmentObjKeys: Object.keys(assessmentObj),
                      infrastructureAssessment: assessmentObj.infrastructureAssessment
                    });
                  }
                  
                  // Extract readinessScore - use Assessment entity method if available
                  let readinessScore = null;
                  
                  // 1. Try getReadinessScore method (best - uses proper calculation)
                  if (assessment && typeof assessment.getReadinessScore === 'function') {
                    readinessScore = assessment.getReadinessScore();
                  }
                  // 2. Try assessmentObj.readinessScore (from toJSON)
                  else if (assessmentObj.readinessScore !== undefined && assessmentObj.readinessScore !== null) {
                    readinessScore = parseFloat(assessmentObj.readinessScore);
                  }
                  // 3. Calculate from complexity and risk factors
                  else if (complexityScore !== null && complexityScore !== undefined && !isNaN(complexityScore)) {
                    const riskFactors = assessmentObj.riskFactors || assessment.riskFactors || [];
                    const riskCount = Array.isArray(riskFactors) ? riskFactors.length : 0;
                    
                    // Use same formula as Assessment.getReadinessScore()
                    let score = 100;
                    score -= (complexityScore - 1) * 5; // Deduct for complexity (0-45 points)
                    score -= riskCount * 10; // Deduct for risk factors (0-50 points)
                    
                    // Bonus for comprehensive assessment
                    if (assessmentObj.infrastructureAssessment && assessmentObj.applicationAssessment) {
                      score += 10;
                    }
                    
                    readinessScore = Math.max(0, Math.min(100, Math.round(score)));
                  }
                  
                  merged.push({
                    ...workloadData,
                    assessment: {
                      complexityScore: complexityScore,
                      readinessScore: readinessScore,
                      riskFactors: assessmentObj.riskFactors || assessment.riskFactors || [],
                      infrastructureAssessment: assessmentObj.infrastructureAssessment || assessment.infrastructureAssessment,
                      applicationAssessment: assessmentObj.applicationAssessment || assessment.applicationAssessment
                    }
                  });
                } else {
                  merged.push(workloadData);
                }
              } catch (workloadError) {
                console.warn('[ReportSummaryView] Error processing workload:', workloadError);
                // Continue with next workload
              }
            }
          } catch (batchError) {
            console.error(`[ReportSummaryView] Error processing workload batch ${i}:`, batchError);
            // Continue with next batch
          }
        }
        
        console.log(`ReportSummaryView: Merged ${mergedCount.toLocaleString()}/${safeWorkloadCount.toLocaleString()} workloads with assessments`);
        console.log(`ReportSummaryView: ${mergedWithComplexityCount.toLocaleString()} merged workloads have complexityScore`);
        if (fromWorkloadAssessmentCount > 0) {
          console.log(`ReportSummaryView: ${fromWorkloadAssessmentCount.toLocaleString()} assessments loaded from workload.assessment property`);
        }
        
        return merged;
      } catch (error) {
        console.error('[ReportSummaryView] Fatal error in workloadsWithAssessments:', error);
        // Return empty array on error to prevent crash
        return [];
      }
    

  // Calculate report data using ReportDataAggregator with merged assessments
  const reportDataMemo = useMemo(() => {
    try {
      if (!workloadsWithAssessments || workloadsWithAssessments.length === 0) {
        return null;
      }
      
      // Use ReportDataAggregator to calculate actual complexity and readiness
      // Use generateReportSummary which includes all aggregations
      const reportSummary = ReportDataAggregator.generateReportSummary(workloadsWithAssessments);
      
      return {
        summary: {
          ...reportSummary.summary,
          totalRegions: uploadSummary?.totalRegions || reportSummary.summary.totalRegions || 1
        },
        complexity: reportSummary.complexity,
        readiness: reportSummary.readiness,
        services: reportSummary.services,
        regions: reportSummary.regions
      };
    } catch (error) {
      console.error('[ReportSummaryView] Error generating report data:', error);
      return null;
    }
  }, [workloadsWithAssessments, uploadSummary]);

  useEffect(() => {
    if (isMountedRef.current) {
      setReportData(reportDataMemo);
    }
  }, [reportDataMemo]);

  // Handle PDF generation
  const handleGeneratePDF = async () => {
    try {
      const reportData = ReportDataAggregator.generateReportSummary(workloads);
      const serviceAggregation = ReportDataAggregator.aggregateByService(workloads);
      
      // CRITICAL FIX: Scale service aggregation costs BEFORE generating estimates
      if (uploadSummary && uploadSummary.totalMonthlyCost && serviceAggregation.length > 0) {
        // SAFETY: Batch reduce to avoid stack overflow
        let currentAggTotal = 0;
        const SCALE_BATCH_SIZE = 1000;
        for (let i = 0; i < serviceAggregation.length; i += SCALE_BATCH_SIZE) {
          const batch = serviceAggregation.slice(i, Math.min(i + SCALE_BATCH_SIZE, serviceAggregation.length));
          for (const s of batch) {
            currentAggTotal += (s.totalCost || 0);
          }
        }
        
        const targetTotal = uploadSummary.totalMonthlyCost;
        if (currentAggTotal > 0 && Math.abs(currentAggTotal - targetTotal) > 100) {
          const aggScaleFactor = targetTotal / currentAggTotal;
          console.log(`ReportSummaryView - Scaling service aggregation costs by factor ${aggScaleFactor.toFixed(4)}`);
          for (let i = 0; i < serviceAggregation.length; i += SCALE_BATCH_SIZE) {
            const batch = serviceAggregation.slice(i, Math.min(i + SCALE_BATCH_SIZE, serviceAggregation.length));
            for (const service of batch) {
              if (service.totalCost) {
                service.totalCost = service.totalCost * aggScaleFactor;
              }
            }
          }
        }
      }
      
      const estimates = await GCPCostEstimator.estimateAllServiceCosts(serviceAggregation, targetRegion);
      
      // CRITICAL FIX: Scale cost estimates to match correct total
      if (uploadSummary && uploadSummary.totalMonthlyCost && estimates.length > 0) {
        // SAFETY: Batch reduce to avoid stack overflow
        let currentAwsTotal = 0;
        const ESTIMATE_BATCH_SIZE = 1000;
        for (let i = 0; i < estimates.length; i += ESTIMATE_BATCH_SIZE) {
          const batch = estimates.slice(i, Math.min(i + ESTIMATE_BATCH_SIZE, estimates.length));
          for (const est of batch) {
            currentAwsTotal += (est.costEstimate?.awsCost || 0);
          }
        }
        
        const targetTotal = uploadSummary.totalMonthlyCost;
        if (currentAwsTotal > 0 && Math.abs(currentAwsTotal - targetTotal) > 100) {
          const scaleFactor = targetTotal / currentAwsTotal;
          console.log(`ReportSummaryView - Scaling cost estimates by factor ${scaleFactor.toFixed(4)}`);
          for (let i = 0; i < estimates.length; i += ESTIMATE_BATCH_SIZE) {
            const batch = estimates.slice(i, Math.min(i + ESTIMATE_BATCH_SIZE, estimates.length));
            for (const est of batch) {
              if (est.costEstimate) {
                est.costEstimate.awsCost = (est.costEstimate.awsCost || 0) * scaleFactor;
                est.costEstimate.gcpOnDemand = (est.costEstimate.gcpOnDemand || 0) * scaleFactor;
                est.costEstimate.gcp1YearCUD = (est.costEstimate.gcp1YearCUD || 0) * scaleFactor;
                est.costEstimate.gcp3YearCUD = (est.costEstimate.gcp3YearCUD || 0) * scaleFactor;
                est.costEstimate.savings1Year = est.costEstimate.awsCost - est.costEstimate.gcp1YearCUD;
                est.costEstimate.savings3Year = est.costEstimate.awsCost - est.costEstimate.gcp3YearCUD;
              }
            }
          }
        }
      }
      
      // CRITICAL FIX: Override totalMonthlyCost and scale service costs in reportData
      const finalReportData = { ...reportData };
      if (uploadSummary && uploadSummary.totalMonthlyCost) {
        const targetTotal = uploadSummary.totalMonthlyCost;
        finalReportData.summary = {
          ...finalReportData.summary,
          totalMonthlyCost: targetTotal
        };
        
        // Scale ALL costs to match correct total (services, complexity, readiness, regions)
        // SAFETY: Batch reduce to avoid stack overflow
        let currentServiceTotal = 0;
        if (finalReportData.services?.topServices) {
          const SERVICE_BATCH_SIZE = 1000;
          for (let i = 0; i < finalReportData.services.topServices.length; i += SERVICE_BATCH_SIZE) {
            const batch = finalReportData.services.topServices.slice(i, Math.min(i + SERVICE_BATCH_SIZE, finalReportData.services.topServices.length));
            for (const s of batch) {
              currentServiceTotal += (s.totalCost || 0);
            }
          }
        }
        
        const currentComplexityTotal = (finalReportData.complexity?.low?.totalCost || 0) + 
                                       (finalReportData.complexity?.medium?.totalCost || 0) + 
                                       (finalReportData.complexity?.high?.totalCost || 0) + 
                                       (finalReportData.complexity?.unassigned?.totalCost || 0);
        const currentReadinessTotal = (finalReportData.readiness?.ready?.totalCost || 0) + 
                                     (finalReportData.readiness?.conditional?.totalCost || 0) + 
                                     (finalReportData.readiness?.notReady?.totalCost || 0) + 
                                     (finalReportData.readiness?.unassigned?.totalCost || 0);
        const currentTotal = Math.max(currentServiceTotal, currentComplexityTotal, currentReadinessTotal);
        
        if (currentTotal > 0 && Math.abs(currentTotal - targetTotal) > 100) {
          const scaleFactor = targetTotal / currentTotal;
          console.log(`ReportSummaryView - Scaling all costs by factor ${scaleFactor.toFixed(4)}`);
          
          // Scale service costs
          if (finalReportData.services?.topServices) {
            const SERVICE_BATCH_SIZE = 1000;
            for (let i = 0; i < finalReportData.services.topServices.length; i += SERVICE_BATCH_SIZE) {
              const batch = finalReportData.services.topServices.slice(i, Math.min(i + SERVICE_BATCH_SIZE, finalReportData.services.topServices.length));
              for (const service of batch) {
                if (service.totalCost) {
                  service.totalCost = service.totalCost * scaleFactor;
                }
              }
            }
          }
          
          // Scale complexity costs
          if (finalReportData.complexity) {
            ['low', 'medium', 'high', 'unassigned'].forEach(level => {
              if (finalReportData.complexity[level]?.totalCost) {
                finalReportData.complexity[level].totalCost *= scaleFactor;
              }
            });
          }
          
          // Scale readiness costs
          if (finalReportData.readiness) {
            ['ready', 'conditional', 'notReady', 'unassigned'].forEach(level => {
              if (finalReportData.readiness[level]?.totalCost) {
                finalReportData.readiness[level].totalCost *= scaleFactor;
              }
            });
          }
          
          // Scale region costs
          if (finalReportData.regions && Array.isArray(finalReportData.regions)) {
            const REGION_BATCH_SIZE = 1000;
            for (let i = 0; i < finalReportData.regions.length; i += REGION_BATCH_SIZE) {
              const batch = finalReportData.regions.slice(i, Math.min(i + REGION_BATCH_SIZE, finalReportData.regions.length));
              for (const region of batch) {
                if (region.totalCost) {
                  region.totalCost *= scaleFactor;
                }
              }
            }
          }
        }
        
        console.log(`ReportSummaryView - Overriding totalMonthlyCost to $${targetTotal.toFixed(2)} for PDF`);
      }
      
      await generateComprehensiveReportPDF(
        finalReportData,
        estimates,
        strategyResults,
        assessmentResults,
        {
          projectName: 'AWS to GCP Migration Assessment',
          targetRegion
        }
      );
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert(`PDF generation failed: ${error.message}`);
    }
  };

  if (!reportData) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        Loading report data...
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Skip charts - they require heavy aggregation
  // Charts available in PDF report
  const complexityChartData = null;
  const readinessChartData = null;
  const serviceCostChartData = null;
  
  // Minimal data for display
  const _complexityChartData = {
    labels: ['Low (1-3)', 'Medium (4-6)', 'High (7-10)', 'Unassigned'],
    datasets: [{
      label: 'Workloads',
      data: [
        reportData?.complexity?.low?.count || 0,
        reportData?.complexity?.medium?.count || 0,
        reportData?.complexity?.high?.count || 0,
        reportData?.complexity?.unassigned?.count || 0
      ],
      backgroundColor: [
        'rgba(40, 167, 69, 0.8)',   // Green for Low
        'rgba(255, 193, 7, 0.8)',    // Yellow for Medium
        'rgba(220, 53, 69, 0.8)',    // Red for High
        'rgba(108, 117, 125, 0.8)'   // Gray for Unassigned
      ],
      borderColor: [
        'rgba(40, 167, 69, 1)',
        'rgba(255, 193, 7, 1)',
        'rgba(220, 53, 69, 1)',
        'rgba(108, 117, 125, 1)'
      ],
      borderWidth: 1
    }]
  };

  const _readinessChartData = {
    labels: ['Ready', 'Conditional', 'Not Ready', 'Unassigned'],
    datasets: [{
      label: 'Workloads',
      data: [
        reportData?.readiness?.ready?.count || 0,
        reportData?.readiness?.conditional?.count || 0,
        reportData?.readiness?.notReady?.count || 0,
        reportData?.readiness?.unassigned?.count || 0
      ],
      backgroundColor: [
        'rgba(40, 167, 69, 0.8)',   // Green for Ready
        'rgba(255, 193, 7, 0.8)',    // Yellow for Conditional
        'rgba(220, 53, 69, 0.8)',    // Red for Not Ready
        'rgba(108, 117, 125, 0.8)'   // Gray for Unassigned
      ],
      borderColor: [
        'rgba(40, 167, 69, 1)',
        'rgba(255, 193, 7, 1)',
        'rgba(220, 53, 69, 1)',
        'rgba(108, 117, 125, 1)'
      ],
      borderWidth: 1
    }]
  };

  const _serviceCostChartData = {
    labels: [],
    datasets: [{
      label: 'Monthly Cost (USD)',
      data: [],
      backgroundColor: 'rgba(0, 123, 255, 0.8)',
      borderColor: 'rgba(0, 123, 255, 1)',
      borderWidth: 1
    }]
  };

  // Skip top services/regions - not needed for UI
  const top5Services = [];
  const top5Regions = [];

  // Calculate wave distribution if strategy results available
  const waveDistribution = strategyResults?.wavePlan ? {
    wave1: strategyResults.wavePlan.wave1?.length || 0,
    wave2: strategyResults.wavePlan.wave2?.length || 0,
    wave3: strategyResults.wavePlan.wave3?.length || 0
  } : {
    wave1: 0,
    wave2: 0,
    wave3: 0
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h2 className="mb-0">
                <i className="bi bi-file-earmark-text me-2"></i>
                Migration Assessment Report
              </h2>
              <p className="mb-0 mt-2">
                Comprehensive analysis of {reportData.summary.totalWorkloads.toLocaleString()} workloads 
                across {reportData.summary.totalRegions} regions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card border-primary">
            <div className="card-body text-center">
              <h5 className="card-title text-primary">
                <i className="bi bi-server me-2"></i>
                Total Workloads
              </h5>
              <h2 className="text-primary">{reportData.summary.totalWorkloads.toLocaleString()}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-success">
            <div className="card-body text-center">
              <h5 className="card-title text-success">
                <i className="bi bi-currency-dollar me-2"></i>
                Monthly Cost
              </h5>
              <h2 className="text-success">{formatCurrency(reportData.summary.totalMonthlyCost)}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-warning">
            <div className="card-body text-center">
              <h5 className="card-title text-warning">
                <i className="bi bi-speedometer2 me-2"></i>
                Avg Complexity
              </h5>
              <h2 className="text-warning">
                {reportData.summary.averageComplexity 
                  ? reportData.summary.averageComplexity.toFixed(1) 
                  : 'N/A'}
              </h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-info">
            <div className="card-body text-center">
              <h5 className="card-title text-info">
                <i className="bi bi-globe me-2"></i>
                Regions
              </h5>
              <h2 className="text-info">{reportData.summary.totalRegions}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Readiness Distribution Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card border-success">
            <div className="card-body text-center">
              <h6 className="card-title text-success">Ready</h6>
              <h4>{reportData.readiness.ready.count.toLocaleString()}</h4>
              <small className="text-muted">
                {formatCurrency(reportData.readiness.ready.totalCost)}
              </small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-warning">
            <div className="card-body text-center">
              <h6 className="card-title text-warning">Conditional</h6>
              <h4>{reportData.readiness.conditional.count.toLocaleString()}</h4>
              <small className="text-muted">
                {formatCurrency(reportData.readiness.conditional.totalCost)}
              </small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-danger">
            <div className="card-body text-center">
              <h6 className="card-title text-danger">Not Ready</h6>
              <h4>{reportData.readiness.notReady.count.toLocaleString()}</h4>
              <small className="text-muted">
                {formatCurrency(reportData.readiness.notReady.totalCost)}
              </small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-secondary">
            <div className="card-body text-center">
              <h6 className="card-title text-secondary">Unassigned</h6>
              <h4>{reportData.readiness.unassigned.count.toLocaleString()}</h4>
              <small className="text-muted">
                {formatCurrency(reportData.readiness.unassigned.totalCost)}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row - Disabled for performance */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Complexity Distribution</h5>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                Complexity distribution chart available in PDF report.
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Migration Readiness</h5>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                Migration readiness chart available in PDF report.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Services Chart */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Top 10 AWS Services by Cost</h5>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                Top services by cost chart available in PDF report.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Services and Regions */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Top 5 AWS Services</h5>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                {top5Services.map((service, index) => (
                  <li key={service.service} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <strong>{index + 1}.</strong> {service.service}
                      <br />
                      <small className="text-muted">→ {service.gcpService}</small>
                    </span>
                    <span className="badge bg-primary rounded-pill">
                      {formatCurrency(service.totalCost)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">Top 5 Regions</h5>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                {top5Regions.map((region, index) => (
                  <li key={region.region} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <strong>{index + 1}.</strong> {region.region}
                      <br />
                      <small className="text-muted">{region.count} workloads</small>
                    </span>
                    <span className="badge bg-info rounded-pill">
                      {formatCurrency(region.totalCost)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Migration Timeline Gantt Chart */}
      {strategyResults && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">
                  <i className="bi bi-calendar-event me-2"></i>
                  Migration Timeline
                </h5>
              </div>
              <div className="card-body">
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  Detailed migration timeline with {workloads.length} workloads available in PDF report. 
                  Timeline visualization disabled for performance with large workload counts.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wave Distribution */}
      {strategyResults && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">Migration Wave Distribution</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 text-center">
                    <h3 className="text-primary">Wave 1</h3>
                    <h2>{waveDistribution.wave1 || 0}</h2>
                    <small className="text-muted">Quick Wins</small>
                  </div>
                  <div className="col-md-4 text-center">
                    <h3 className="text-warning">Wave 2</h3>
                    <h2>{waveDistribution.wave2 || 0}</h2>
                    <small className="text-muted">Standard</small>
                  </div>
                  <div className="col-md-4 text-center">
                    <h3 className="text-danger">Wave 3</h3>
                    <h2>{waveDistribution.wave3 || 0}</h2>
                    <small className="text-muted">Complex</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Mapping Section */}
      {strategyResults && strategyResults.migrationPlan && strategyResults.migrationPlan.plans && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="bi bi-diagram-3 me-2"></i>
                  AWS to GCP Service Mapping
                </h5>
              </div>
              <div className="card-body">
                <p className="text-muted mb-3">
                  Detailed service mappings showing AWS services and their corresponding GCP equivalents, migration strategies, and effort levels.
                </p>
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  Detailed workload mapping available in PDF report. {strategyResults.migrationPlan.plans.length} workloads mapped.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technology Summary */}
      <div className="row mb-4">
        <div className="col-12">
          <TechnologySummary workloads={workloads} />
        </div>
      </div>

      {/* Regional Breakdown */}
      <div className="row mb-4">
        <div className="col-12">
          <RegionalBreakdown workloads={workloads} />
        </div>
      </div>

      {/* Cost Comparison */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-body">
              <label htmlFor="targetRegion" className="form-label">
                <strong>Target GCP Region:</strong>
              </label>
              <select
                id="targetRegion"
                className="form-select"
                value={targetRegion}
                onChange={(e) => setTargetRegion(e.target.value)}
              >
                <option value="us-central1">US Central (Iowa)</option>
                <option value="us-east1">US East (South Carolina)</option>
                <option value="us-west1">US West (Oregon)</option>
                <option value="europe-west1">Europe (Belgium)</option>
                <option value="europe-west4">Europe (Netherlands)</option>
                <option value="asia-east1">Asia (Taiwan)</option>
                <option value="asia-southeast1">Asia (Singapore)</option>
              </select>
            </div>
          </div>
          <CostComparison 
            serviceAggregation={reportData.services.allServices}
            targetRegion={targetRegion}
          />
        </div>
      </div>

      {/* PDF Download Button */}
      <div className="row mb-4">
        <div className="col-12 text-center">
          <button 
            className="btn btn-primary btn-lg"
            onClick={handleGeneratePDF}
          >
            <i className="bi bi-download me-2"></i>
            Download Comprehensive PDF Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportSummaryView;
