/**
 * Comprehensive PDF Report Generator
 * 
 * Generates a concise migration assessment report PDF with:
 * - Executive Summary
 * - Assessment Agent Summary (complexity & readiness distributions)
 * - Strategy Agent Summary (wave distribution & service mappings)
 * - Cost Analysis Summary (cost estimates)
 * - Migration Timeline Summary
 * 
 * Note: This report contains only summaries - no detailed workload listings
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Function to apply the autoTable plugin to a jsPDF instance
function applyPlugin(jsPDF) {
  // This is a workaround for a bug in some versions of jspdf-autotable
  // where the plugin is not automatically applied to the jsPDF prototype.
  if (typeof jsPDF.API.autoTable !== 'function') {
    // Manually apply the plugin
    const { autoTable } = require('jspdf-autotable');
    autoTable(jsPDF.API);
  }
}

/**
 * Generate comprehensive migration assessment PDF report
 * @param {Object} reportData - Report data from ReportDataAggregator.generateReportSummary
 * @param {Object} costEstimates - Cost estimates from GCPCostEstimator
 * @param {Object} strategyResults - Strategy planning results
 * @param {Object} assessmentResults - Assessment results
 * @param {Object} options - Report options
 */
export const generateComprehensiveReportPDF = async (
  reportData,
  costEstimates = null,
  strategyResults = null,
  assessmentResults = null,
  options = {}
) => {
  const {
    projectName = 'AWS to GCP Migration Assessment',
    targetRegion = 'us-central1',
    includeCharts = true
  } = options;

  // Create jsPDF instance
  const doc = new jsPDF('p', 'mm', 'a4');
  applyPlugin(doc);
  
  // Helper function to safely call autoTable
  const callAutoTable = (options) => {
    doc.autoTable(options);
  };
  
  // Helper to get lastAutoTable (set by autoTable plugin after each call)
  const getLastAutoTable = () => {
    return doc.lastAutoTable || { finalY: yPos };
  };
  
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace = 20) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper function to format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  // Helper function to add section header
  const addSectionHeader = (title, color = [0, 102, 204]) => {
    checkPageBreak(15);
    doc.setFontSize(16);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(title, margin, yPos);
    yPos += 10;
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 5;
  };

  // ==========================================
  // COVER PAGE
  // ==========================================
  doc.setFillColor(0, 102, 204); // Searce Blue
  doc.rect(0, 0, pageWidth, 60, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('AWS to GCP Migration', pageWidth / 2, 30, { align: 'center' });
  doc.setFontSize(18);
  doc.text('Assessment Report', pageWidth / 2, 40, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  yPos = 80;
  doc.text(`Project: ${projectName}`, margin, yPos);
  yPos += 7;
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, yPos);
  yPos += 7;
  doc.text(`Target GCP Region: ${targetRegion}`, margin, yPos);
  
  // Key metrics on cover
  yPos = 100;
  doc.setFontSize(14);
  doc.setTextColor(0, 102, 204);
  doc.text('Executive Summary', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const summaryData = [
    ['Total Workloads', reportData.summary.totalWorkloads.toLocaleString()],
    ['Total Monthly Cost', formatCurrency(reportData.summary.totalMonthlyCost)],
    ['Average Complexity', reportData.summary.averageComplexity ? reportData.summary.averageComplexity.toFixed(1) : 'N/A'],
    ['Regions', reportData.summary.totalRegions.toString()],
    ['AWS Services', reportData.summary.totalServices.toString()]
  ];

  callAutoTable({
    startY: yPos,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 }
  });

  yPos = getLastAutoTable().finalY + 15;

  // ==========================================
  // TABLE OF CONTENTS
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Table of Contents', [0, 102, 204]);
  
  const tocItems = [
    'Executive Summary',
    'Assessment Agent Summary',
    'Strategy Agent Summary',
    'Cost Analysis Agent Summary',
    'Migration Timeline Summary',
    'Key Recommendations',
    'Appendices'
  ];

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  tocItems.forEach((item, index) => {
    checkPageBreak(8);
    doc.text(`${index + 1}. ${item}`, margin + 5, yPos);
    const dots = '.'.repeat(50);
    const pageNum = index + 2; // Approximate page numbers
    doc.text(`${dots} ${pageNum}`, margin + 5, yPos);
    yPos += 7;
  });

  // ==========================================
  // EXECUTIVE SUMMARY
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Executive Summary', [0, 102, 204]);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  doc.text(
    `This report provides a comprehensive assessment of ${reportData.summary.totalWorkloads.toLocaleString()} workloads ` +
    `discovered across ${reportData.summary.totalRegions} AWS regions, with a total monthly cost of ` +
    `${formatCurrency(reportData.summary.totalMonthlyCost)}.`,
    margin, yPos, { maxWidth: contentWidth }
  );
  yPos += 15;

  // Complexity Distribution
  doc.setFontSize(12);
  doc.setTextColor(0, 102, 204);
  doc.text('Complexity Distribution', margin, yPos);
  yPos += 8;

  const complexityData = [
    ['Low (1-3)', reportData.complexity.low.count.toString(), formatCurrency(reportData.complexity.low.totalCost)],
    ['Medium (4-6)', reportData.complexity.medium.count.toString(), formatCurrency(reportData.complexity.medium.totalCost)],
    ['High (7-10)', reportData.complexity.high.count.toString(), formatCurrency(reportData.complexity.high.totalCost)],
    ['Unassigned', reportData.complexity.unassigned.count.toString(), formatCurrency(reportData.complexity.unassigned.totalCost)]
  ];

  callAutoTable({
    startY: yPos,
    head: [['Complexity Level', 'Workloads', 'Monthly Cost']],
    body: complexityData,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 }
  });

  yPos = getLastAutoTable().finalY + 10;

  // Readiness Distribution
  checkPageBreak(30);
  doc.setFontSize(12);
  doc.setTextColor(0, 102, 204);
  doc.text('Migration Readiness', margin, yPos);
  yPos += 8;

  const readinessData = [
    ['Ready', reportData.readiness.ready.count.toString(), formatCurrency(reportData.readiness.ready.totalCost)],
    ['Conditional', reportData.readiness.conditional.count.toString(), formatCurrency(reportData.readiness.conditional.totalCost)],
    ['Not Ready', reportData.readiness.notReady.count.toString(), formatCurrency(reportData.readiness.notReady.totalCost)],
    ['Unassigned', reportData.readiness.unassigned.count.toString(), formatCurrency(reportData.readiness.unassigned.totalCost)]
  ];

  callAutoTable({
    startY: yPos,
    head: [['Readiness Level', 'Workloads', 'Monthly Cost']],
    body: readinessData,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 }
  });

  yPos = getLastAutoTable().finalY + 15;

  // ==========================================
  // ASSESSMENT AGENT SUMMARY
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Assessment Agent Summary', [0, 102, 204]);

  doc.setFontSize(10);
  doc.text(
    `Assessment results for ${reportData.summary.totalWorkloads.toLocaleString()} workloads across ` +
    `${reportData.summary.totalServices} AWS services.`,
    margin, yPos, { maxWidth: contentWidth }
  );
  yPos += 10;

  // All Services Table - Complete list
  const allServices = reportData.services.topServices;
  const otherService = reportData.services.other;

  const serviceTableData = allServices.map(service => [
    service.service,
    service.count.toLocaleString(),
    formatCurrency(service.totalCost),
    service.averageComplexity ? service.averageComplexity.toFixed(1) : 'N/A',
    service.gcpService || 'N/A',
    service.migrationStrategy || 'N/A'
  ]);

  if (otherService) {
    serviceTableData.push([
      otherService.service,
      otherService.count.toLocaleString(),
      formatCurrency(otherService.totalCost),
      otherService.averageComplexity ? otherService.averageComplexity.toFixed(1) : 'N/A',
      otherService.gcpService || 'Multiple',
      'Mixed'
    ]);
  }

  callAutoTable({
    startY: yPos,
    head: [['AWS Service', 'Workloads', 'Monthly Cost', 'Avg Complexity', 'Target GCP Service', 'Strategy']],
    body: serviceTableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 40 },
      5: { cellWidth: 25 }
    }
  });

  yPos = getLastAutoTable().finalY + 15;

  // ==========================================
  // REGIONAL ANALYSIS SUMMARY
  // ==========================================
  checkPageBreak(30);
  addSectionHeader('Regional Analysis Summary', [0, 102, 204]);

  doc.setFontSize(10);
  doc.text(
    `Workload distribution across ${reportData.regions.length} AWS regions.`,
    margin, yPos, { maxWidth: contentWidth }
  );
  yPos += 10;

  // All regions - sorted by cost
  const sortedRegions = [...reportData.regions]
    .sort((a, b) => b.totalCost - a.totalCost);

  const regionTableData = sortedRegions.map(region => [
    region.region,
    region.count.toLocaleString(),
    formatCurrency(region.totalCost),
    region.averageComplexity ? region.averageComplexity.toFixed(1) : 'N/A'
  ]);

  callAutoTable({
    startY: yPos,
    head: [['Region', 'Workloads', 'Monthly Cost', 'Avg Complexity']],
    body: regionTableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 30, halign: 'center' }
    }
  });

  yPos = getLastAutoTable().finalY + 10;

  // ==========================================
  // COST ANALYSIS AGENT SUMMARY
  // ==========================================
  if (costEstimates && costEstimates.length > 0) {
    doc.addPage();
    yPos = margin;
    addSectionHeader('Cost Analysis Agent Summary', [40, 167, 69]);

    doc.setFontSize(10);
    doc.text(
      `Cost comparison summary between AWS and GCP with Committed Use Discounts (CUD) applied. ` +
      `Complete service cost breakdown.`,
      margin, yPos, { maxWidth: contentWidth }
    );
    yPos += 10;

    // Sort by AWS cost and show all services
    const sortedCostEstimates = [...costEstimates]
      .sort((a, b) => {
        const costA = a.costEstimate?.awsCost || 0;
        const costB = b.costEstimate?.awsCost || 0;
        return costB - costA;
      });

    const costTableData = sortedCostEstimates.map(estimate => {
      const costs = estimate.costEstimate || {};
      return [
        estimate.service,
        costs.gcpService || 'N/A',
        formatCurrency(costs.awsCost || 0),
        formatCurrency(costs.gcpOnDemand || 0),
        formatCurrency(costs.gcp1YearCUD || 0),
        formatCurrency(costs.gcp3YearCUD || 0),
        formatCurrency(costs.savings3Year || 0)
      ];
    });

    callAutoTable({
      startY: yPos,
      head: [['AWS Service', 'GCP Service', 'AWS Cost', 'GCP On-Demand', 'GCP 1Y CUD', 'GCP 3Y CUD', 'Savings (3Y)']],
      body: costTableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 167, 69] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' }
      }
    });

    yPos = getLastAutoTable().finalY + 10;

    // Total cost summary
    const totalCosts = costEstimates.reduce((acc, est) => {
      const costs = est.costEstimate || {};
      acc.aws += costs.awsCost || 0;
      acc.gcpOnDemand += costs.gcpOnDemand || 0;
      acc.gcp1Year += costs.gcp1YearCUD || 0;
      acc.gcp3Year += costs.gcp3YearCUD || 0;
      return acc;
    }, { aws: 0, gcpOnDemand: 0, gcp1Year: 0, gcp3Year: 0 });

    checkPageBreak(25);
    doc.setFontSize(12);
    doc.setTextColor(40, 167, 69);
    doc.text('Total Cost Summary', margin, yPos);
    yPos += 8;

    const totalCostData = [
      ['AWS Total', formatCurrency(totalCosts.aws)],
      ['GCP On-Demand', formatCurrency(totalCosts.gcpOnDemand)],
      ['GCP 1-Year CUD', formatCurrency(totalCosts.gcp1Year)],
      ['GCP 3-Year CUD', formatCurrency(totalCosts.gcp3Year)],
      ['Potential Savings (3Y CUD)', formatCurrency(totalCosts.aws - totalCosts.gcp3Year)]
    ];

    callAutoTable({
      startY: yPos,
      head: [['Cost Type', 'Monthly Cost']],
      body: totalCostData,
      theme: 'grid',
      headStyles: { fillColor: [40, 167, 69] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 }
    });

    yPos = getLastAutoTable().finalY + 15;
  }

  // ==========================================
  // STRATEGY AGENT SUMMARY
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Strategy Agent Summary', [255, 193, 7]);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  if (strategyResults && strategyResults.wavePlan) {
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text('Migration Wave Distribution', margin, yPos);
    yPos += 8;

    const waveData = [
      ['Wave 1 - Quick Wins', (strategyResults.wavePlan.wave1?.length || 0).toString()],
      ['Wave 2 - Standard', (strategyResults.wavePlan.wave2?.length || 0).toString()],
      ['Wave 3 - Complex', (strategyResults.wavePlan.wave3?.length || 0).toString()]
    ];

    callAutoTable({
      startY: yPos,
      head: [['Wave', 'Workloads']],
      body: waveData,
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 }
    });

    yPos = getLastAutoTable().finalY + 15;
  }

  if (strategyResults && strategyResults.migrationPlan) {
    checkPageBreak(20);
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text('Migration Strategy Distribution', margin, yPos);
    yPos += 8;

    if (strategyResults.migrationPlan.metrics && strategyResults.migrationPlan.metrics.strategyDistribution) {
      const strategyData = Object.entries(strategyResults.migrationPlan.metrics.strategyDistribution)
        .map(([strategy, count]) => [strategy, count.toLocaleString()]);

      callAutoTable({
        startY: yPos,
        head: [['Strategy', 'Workloads']],
        body: strategyData,
        theme: 'grid',
        headStyles: { fillColor: [0, 102, 204] },
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 }
      });

      yPos = getLastAutoTable().finalY + 15;
    }
    
    // Complete Service Mappings Summary
    if (strategyResults.migrationPlan.plans && strategyResults.migrationPlan.plans.length > 0) {
      checkPageBreak(30);
      doc.setFontSize(12);
      doc.setTextColor(0, 102, 204);
      doc.text('Complete Service Mappings', margin, yPos);
      yPos += 8;
      
      // Group by service and show all mappings
      const serviceMap = new Map();
      strategyResults.migrationPlan.plans.forEach(plan => {
        const service = plan.sourceService || plan.service || 'Unknown';
        if (!serviceMap.has(service)) {
          serviceMap.set(service, {
            service,
            gcpService: plan.targetGcpService || plan.gcpService || 'N/A',
            gcpApi: plan.gcpApi || 'N/A',
            strategy: plan.strategy || 'N/A',
            effort: plan.effort || 'N/A',
            count: 0
          });
        }
        serviceMap.get(service).count++;
      });
      
      const allMappings = Array.from(serviceMap.values())
        .sort((a, b) => b.count - a.count)
        .map(m => [
          m.service,
          m.gcpService,
          m.gcpApi,
          m.strategy,
          m.effort,
          m.count.toLocaleString()
        ]);
      
      callAutoTable({
        startY: yPos,
        head: [['AWS Service', 'GCP Service', 'GCP API', 'Strategy', 'Effort', 'Workloads']],
        body: allMappings,
        theme: 'grid',
        headStyles: { fillColor: [0, 102, 204] },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 40 },
          2: { cellWidth: 40 },
          3: { cellWidth: 25 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20, halign: 'center' }
        }
      });
      
      yPos = getLastAutoTable().finalY + 15;
    }
  }
  
  // Migration Timeline Summary
  if (strategyResults && strategyResults.wavePlan) {
    checkPageBreak(25);
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text('Migration Timeline Summary', margin, yPos);
    yPos += 8;
    
    const wave1Count = strategyResults.wavePlan.wave1?.length || 0;
    const wave2Count = strategyResults.wavePlan.wave2?.length || 0;
    const wave3Count = strategyResults.wavePlan.wave3?.length || 0;
    
    // Estimate durations (3 weeks landing zone + wave durations)
    const landingZoneWeeks = 3;
    const wave1Weeks = Math.max(2, Math.ceil(wave1Count * 0.5)); // ~0.5 weeks per workload, min 2
    const wave2Weeks = Math.max(4, Math.ceil(wave2Count * 0.75)); // ~0.75 weeks per workload, min 4
    const wave3Weeks = Math.max(6, Math.ceil(wave3Count * 1.0)); // ~1 week per workload, min 6
    const totalWeeks = landingZoneWeeks + wave1Weeks + wave2Weeks + wave3Weeks;
    
    const timelineData = [
      ['Phase', 'Duration', 'Workloads', 'Start Week'],
      ['Landing Zone Setup', `${landingZoneWeeks} weeks`, '-', 'Week 0'],
      ['Wave 1 - Quick Wins', `${wave1Weeks} weeks`, wave1Count.toLocaleString(), `Week ${landingZoneWeeks}`],
      ['Wave 2 - Standard', `${wave2Weeks} weeks`, wave2Count.toLocaleString(), `Week ${landingZoneWeeks + wave1Weeks}`],
      ['Wave 3 - Complex', `${wave3Weeks} weeks`, wave3Count.toLocaleString(), `Week ${landingZoneWeeks + wave1Weeks + wave2Weeks}`],
      ['Total Project Duration', `${totalWeeks} weeks`, (wave1Count + wave2Count + wave3Count).toLocaleString(), '-']
    ];
    
    callAutoTable({
      startY: yPos,
      head: [timelineData[0]],
      body: timelineData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 }
    });
    
    yPos = getLastAutoTable().finalY + 15;
  }

  // Recommendations text
  checkPageBreak(30);
  doc.setFontSize(12);
  doc.setTextColor(0, 102, 204);
  doc.text('Key Recommendations', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  const recommendations = [
    `• Prioritize Wave 1 workloads (${strategyResults?.wavePlan?.wave1?.length || 0} workloads) for quick wins and early value realization`,
    `• Consider 3-year Committed Use Discounts for predictable workloads to maximize cost savings`,
    `• Plan for ${reportData.complexity.high.count} high-complexity workloads requiring additional assessment`,
    `• ${reportData.readiness.ready.count} workloads are ready for immediate migration`,
    `• Focus on top ${Math.min(5, reportData.services.topServices.length)} services representing ` +
      `${((reportData.services.topServices.slice(0, 5).reduce((sum, s) => sum + s.totalCost, 0) / reportData.summary.totalMonthlyCost) * 100).toFixed(1)}% of total cost`
  ];

  recommendations.forEach(rec => {
    checkPageBreak(8);
    doc.text(rec, margin + 5, yPos, { maxWidth: contentWidth - 10 });
    yPos += 7;
  });

  // ==========================================
  // APPENDICES
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Appendices', [108, 117, 125]);

  doc.setFontSize(10);
  doc.text('A. Complexity Scoring Methodology', margin, yPos);
  yPos += 8;
  doc.setFontSize(9);
  doc.text(
    'Complexity scores range from 1-10, where:\n' +
    '• Low (1-3): Simple workloads with minimal dependencies\n' +
    '• Medium (4-6): Moderate complexity with some dependencies\n' +
    '• High (7-10): Complex workloads with significant dependencies or custom configurations',
    margin + 5, yPos, { maxWidth: contentWidth - 10 }
  );
  yPos += 25;

  doc.setFontSize(10);
  doc.text('B. Migration Readiness Criteria', margin, yPos);
  yPos += 8;
  doc.setFontSize(9);
  doc.text(
    'Readiness is determined by:\n' +
    '• Ready: Complexity ≤ 3, no risk factors\n' +
    '• Conditional: Complexity ≤ 6, ≤ 2 risk factors\n' +
    '• Not Ready: Complexity > 6 or > 2 risk factors',
    margin + 5, yPos, { maxWidth: contentWidth - 10 }
  );
  yPos += 20;

  doc.setFontSize(10);
  doc.text('C. Committed Use Discounts (CUD)', margin, yPos);
  yPos += 8;
  doc.setFontSize(9);
  doc.text(
    'GCP Committed Use Discounts provide:\n' +
    '• 1-Year CUD: ~25% discount on compute, ~15% on storage, ~20% on databases\n' +
    '• 3-Year CUD: ~45% discount on compute, ~30% on storage, ~40% on databases\n' +
    '• All workloads are assumed eligible for CUD pricing',
    margin + 5, yPos, { maxWidth: contentWidth - 10 }
  );

  // ==========================================
  // FOOTER ON ALL PAGES
  // ==========================================
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${totalPages} | ${projectName} | Generated ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `migration-assessment-report-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export default generateComprehensiveReportPDF;
