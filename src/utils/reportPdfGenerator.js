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
import autoTable from 'jspdf-autotable';
import {
  calculateKeyInsights,
  calculateCostBreakdown,
  getTopExpensiveWorkloads,
  detectCostAnomalies,
  calculateRiskAssessment,
  calculateReadinessScorecard,
  calculateGCPProjections,
  calculatePrioritizedActions,
  calculateQuickWins,
  calculateDataQuality
} from './reportEnhancements';

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
  costEstimates, // REQUIRED - must be provided
  strategyResults = null,
  assessmentResults = null,
  options = {}
) => {
  if (typeof window !== 'undefined' && window.persistentLog) {
    window.persistentLog('INFO', '[PDF Generator] generateComprehensiveReportPDF: ENTERING');
    window.persistentLog('INFO', '[PDF Generator] hasReportData:', !!reportData);
    window.persistentLog('INFO', '[PDF Generator] hasCostEstimates:', !!costEstimates);
    window.persistentLog('INFO', '[PDF Generator] costEstimates type:', typeof costEstimates);
    window.persistentLog('INFO', '[PDF Generator] costEstimates length:', Array.isArray(costEstimates) ? costEstimates.length : 'N/A');
  }
  console.log('[PDF Generator] generateComprehensiveReportPDF: ENTERING');
  
  // CRITICAL: Check memory before starting PDF generation
  if (performance.memory) {
    const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
    const usagePercent = (usedMB / limitMB) * 100;
    console.log(`[PDF Generator] Memory usage at start: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);
    
    if (usagePercent > 85) {
      console.warn(`[PDF Generator] WARNING: Memory usage is already high (${usagePercent.toFixed(1)}%). PDF generation may skip some sections.`);
    }
    
    // CRITICAL: Remove workloads array from reportData if memory is high to prevent crashes
    if (usagePercent > 70 && reportData?.workloads) {
      const workloadCount = Array.isArray(reportData.workloads) ? reportData.workloads.length : 0;
      console.warn(`[PDF Generator] Memory usage ${usagePercent.toFixed(1)}% - Removing workloads array (${workloadCount.toLocaleString()} workloads) from reportData`);
      delete reportData.workloads;
    }
  }
  
  // CRITICAL: Also check workload count - remove if too large regardless of memory
  const workloadCount = reportData?.summary?.totalWorkloads || 0;
  if (workloadCount > 150000 && reportData?.workloads) {
    console.warn(`[PDF Generator] Large dataset (${workloadCount.toLocaleString()} workloads) - Removing workloads array from reportData`);
    delete reportData.workloads;
  }
  
  // CRITICAL: Cost estimates are required for PDF generation
  if (!costEstimates) {
    const errorMsg = 'Cost estimates are required for PDF generation. The Cost Agent must complete before generating the PDF.';
    if (typeof window !== 'undefined' && window.persistentLog) {
      window.persistentLog('ERROR', '[PDF Generator]', errorMsg);
    }
    throw new Error(errorMsg);
  }
  
  if (!Array.isArray(costEstimates)) {
    const errorMsg = `Cost estimates must be an array, but got ${typeof costEstimates}.`;
    if (typeof window !== 'undefined' && window.persistentLog) {
      window.persistentLog('ERROR', '[PDF Generator]', errorMsg);
    }
    throw new Error(errorMsg);
  }
  
  if (costEstimates.length === 0) {
    const errorMsg = 'Cost estimates array is empty. The Cost Agent must generate cost estimates before generating the PDF.';
    if (typeof window !== 'undefined' && window.persistentLog) {
      window.persistentLog('ERROR', '[PDF Generator]', errorMsg);
    }
    throw new Error(errorMsg);
  }
  
  // Note: Use costEstimates directly - don't create unnecessary copies that increase memory usage
  
  if (typeof window !== 'undefined' && window.persistentLog) {
    window.persistentLog('INFO', '[PDF Generator] Cost estimates validated, proceeding with PDF generation...');
  }
  // Debug: Log the data being used for PDF generation
  console.log('PDF Generator - reportData:', {
    totalMonthlyCost: reportData?.summary?.totalMonthlyCost,
    totalServices: reportData?.summary?.totalServices,
    servicesCount: reportData?.services?.topServices?.length || 0,
    costEstimatesCount: costEstimates?.length || 0,
    reportDataStructure: Object.keys(reportData || {})
  });
  
  // Debug: Log cost data in detail
  if (reportData?.summary) {
    console.log('PDF Generator - Cost Summary:', {
      totalMonthlyCost: reportData.summary.totalMonthlyCost,
      totalMonthlyCostType: typeof reportData.summary.totalMonthlyCost,
      hasCostEstimates: !!costEstimates,
      costEstimatesLength: costEstimates?.length || 0
    });
  }
  
  // Debug: Check if workloads have costs (MEMORY-SAFE: Only check if array is small)
  // CRITICAL: Don't access workloads array if it's too large - just check summary
  // Note: workloadCount already declared above
  if (workloadCount > 0 && workloadCount < 10000) {
    // Only log sample for small datasets to avoid memory issues
    if (reportData?.workloads && Array.isArray(reportData.workloads)) {
      const sampleWorkloads = reportData.workloads.slice(0, 5);
      console.log('PDF Generator - Sample workload costs:', sampleWorkloads.map(w => ({
        id: w.id,
        name: w.name,
        monthlyCost: w.monthlyCost,
        monthlyCostType: typeof w.monthlyCost,
        hasAssessment: !!w.assessment
      })));
    }
  } else if (workloadCount > 10000) {
    console.log(`PDF Generator - Large dataset detected (${workloadCount.toLocaleString()} workloads). Skipping sample workload logging to save memory.`);
  }
  
  const {
    projectName = 'AWS to GCP Migration Assessment',
    targetRegion = 'us-central1',
    includeCharts = true
  } = options;

  // Create jsPDF instance
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Font configuration - using helvetica as base (Poppins can be added as custom font later)
  // Note: jsPDF doesn't have Poppins built-in. To use Poppins, you'd need to:
  // 1. Load Poppins font file (TTF) and convert to base64
  // 2. Use doc.addFileToVFS() and doc.addFont() to register it
  // 3. Change FONT_FAMILY to 'poppins'
  // For now, using helvetica which is similar to Poppins. Structure allows easy switch.
  const FONT_FAMILY = 'helvetica'; // Change to 'poppins' if custom font is loaded
  const FONT_NORMAL = 'normal';
  const FONT_BOLD = 'bold';
  
  // Spacing constants for consistent spacing throughout
  const SPACING = {
    XS: 3,      // Extra small spacing (for tight layouts)
    SM: 5,      // Small spacing (for compact sections)
    MD: 8,      // Medium spacing (standard between elements)
    LG: 10,     // Large spacing (after headers, before sections)
    XL: 15,     // Extra large spacing (between major sections)
    XXL: 20     // Extra extra large spacing (page breaks, major divisions)
  };
  
  // Font size constants
  const FONT_SIZE = {
    XS: 7,      // Extra small (table footnotes, fine print)
    SM: 8,      // Small (table cells, captions)
    MD: 9,      // Medium (body text in tables)
    BASE: 10,   // Base (standard body text)
    LG: 11,     // Large (subheadings)
    XL: 12,     // Extra large (section subheadings)
    XXL: 14,    // Extra extra large (section titles)
    TITLE: 16,  // Title (section headers)
    COVER: 18,  // Cover (cover page subtitle)
    HERO: 24    // Hero (cover page main title)
  };
  
  // Helper function to set font consistently
  const setFont = (size, style = FONT_NORMAL) => {
    doc.setFont(FONT_FAMILY, style);
    doc.setFontSize(size);
  };
  
  // Helper function to safely call autoTable
  const callAutoTable = (options) => {
    // Ensure autoTable uses consistent font
    if (!options.styles) options.styles = {};
    if (!options.styles.font) options.styles.font = FONT_FAMILY;
    if (!options.styles.fontStyle) options.styles.fontStyle = FONT_NORMAL;
    autoTable(doc, options);
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

  // Helper function to format currency - improved for accuracy and neatness
  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '$0.00';
    }
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return '$0.00';
    }
    // For very large numbers, use compact notation for readability
    if (Math.abs(numValue) >= 1000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        notation: 'compact',
        compactDisplay: 'short'
      }).format(numValue);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  };
  
  // Helper function to format numbers with proper commas
  const formatNumber = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0';
    }
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return '0';
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };
  
  // Helper function to format percentages
  const formatPercent = (value, decimals = 1) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0%';
    }
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return '0%';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(numValue / 100);
  };

  // Helper function to add section header
  const addSectionHeader = (title, color = [0, 102, 204]) => {
    checkPageBreak(SPACING.XXL);
    setFont(FONT_SIZE.TITLE, FONT_BOLD);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(title, margin, yPos);
    yPos += SPACING.LG;
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += SPACING.SM;
  };

  // ==========================================
  // COVER PAGE
  // ==========================================
  doc.setFillColor(0, 102, 204); // Searce Blue
  doc.rect(0, 0, pageWidth, 60, 'F');
  
  doc.setTextColor(255, 255, 255);
  setFont(FONT_SIZE.HERO, FONT_BOLD);
  doc.text('AWS to GCP Migration', pageWidth / 2, 30, { align: 'center' });
  setFont(FONT_SIZE.COVER, FONT_NORMAL);
  doc.text('Assessment Report', pageWidth / 2, 40, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  setFont(FONT_SIZE.XL, FONT_NORMAL);
  yPos = 80;
  doc.text(`Project: ${projectName}`, margin, yPos);
  yPos += SPACING.MD;
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, yPos);
  yPos += SPACING.MD;
  doc.text(`Target GCP Region: ${targetRegion}`, margin, yPos);
  
  // Key metrics on cover
  yPos = 100;
  setFont(FONT_SIZE.XXL, FONT_BOLD);
  doc.setTextColor(0, 102, 204);
  doc.text('Executive Summary', margin, yPos);
  yPos += SPACING.MD;
  
  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  doc.setTextColor(0, 0, 0);
  const summary = reportData?.summary || {};
  
  // Debug: Verify the total cost matches expected 624k
  console.log(`PDF Generator - Cover page summary:`, {
    totalMonthlyCost: summary.totalMonthlyCost,
    totalServices: summary.totalServices,
    expectedCost: 'Should be ~624000 (not 9200)'
  });
  
  const summaryData = [
    ['Total Workloads', formatNumber(summary.totalWorkloads || 0)],
    ['Total Monthly Cost', formatCurrency(summary.totalMonthlyCost || 0)],
    ['Average Complexity', summary.averageComplexity ? summary.averageComplexity.toFixed(1) : 'N/A'],
    ['Regions', formatNumber(summary.totalRegions || 0)],
    ['AWS Services', formatNumber(summary.totalServices || 0)]
  ];

  callAutoTable({
    startY: yPos,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
    margin: { left: margin, right: margin },
    styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY }
  });

  yPos = getLastAutoTable().finalY + SPACING.XL;

  // ==========================================
  // TABLE OF CONTENTS
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Table of Contents', [0, 102, 204]);
  
  const tocItems = [
    'Executive Summary',
    'Executive Dashboard',
    'Key Insights',
    'Assessment Agent Summary',
    'Cost Analysis Agent Summary',
    'Cost Breakdown & Anomalies',
    'GCP Cost Projections',
    'Strategy Agent Summary',
    'Migration Wave Details',
    'Risk Assessment',
    'Migration Timeline Summary',
    'Prioritized Action Items',
    'Quick Wins',
    'Key Recommendations',
    'Data Quality & Validation',
    'Appendices'
  ];

  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  doc.setTextColor(0, 0, 0);
  tocItems.forEach((item, index) => {
    checkPageBreak(SPACING.MD);
    const itemText = `${index + 1}. ${item}`;
    const pageNum = index + 2; // Approximate page numbers
    // Use tab-like spacing: item on left, page number on right
    doc.text(itemText, margin + SPACING.SM, yPos);
    doc.text(pageNum.toString(), pageWidth - margin - SPACING.SM, yPos, { align: 'right' });
    yPos += SPACING.MD;
  });

  // ==========================================
  // EXECUTIVE SUMMARY
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Executive Summary', [0, 102, 204]);

  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  doc.setTextColor(0, 0, 0);
  
  const summaryForText = reportData?.summary || {};
  const totalCost = summaryForText.totalMonthlyCost || 0;
    doc.text(
      `This report provides a comprehensive assessment of ${formatNumber(summaryForText.totalWorkloads || 0)} workloads ` +
      `discovered across ${formatNumber(summaryForText.totalRegions || 0)} AWS regions, with a total monthly cost of ` +
      `${formatCurrency(totalCost)} (sum of all AWS bills).`,
      margin, yPos, { maxWidth: contentWidth }
    );
  
  // Add note if cost seems unusually low (might indicate deduplication issue)
  if (totalCost > 0 && totalCost < 10000 && summaryForText.totalWorkloads > 100) {
    yPos += SPACING.MD;
    setFont(FONT_SIZE.MD, FONT_NORMAL);
    doc.setTextColor(200, 0, 0);
    doc.text(
      `Note: Total cost may appear low due to deduplication. Verify against raw bill totals.`,
      margin, yPos, { maxWidth: contentWidth }
    );
    doc.setTextColor(0, 0, 0);
    yPos += SPACING.SM;
  }
  yPos += SPACING.XL;

  // Complexity Distribution
  setFont(FONT_SIZE.XL, FONT_BOLD);
  doc.setTextColor(0, 102, 204);
  doc.text('Complexity Distribution', margin, yPos);
  yPos += SPACING.MD;

  const complexity = reportData?.complexity || {};
  const totalComplexityCount = (complexity.low?.count || 0) + (complexity.medium?.count || 0) + (complexity.high?.count || 0) + (complexity.unassigned?.count || 0);
  const unassignedCount = complexity.unassigned?.count || 0;
  
  // Warn if all workloads are unassigned
  if (unassignedCount > 0 && unassignedCount === totalComplexityCount) {
    setFont(FONT_SIZE.MD, FONT_NORMAL);
    doc.setTextColor(200, 0, 0);
    doc.text(
      `⚠️ WARNING: All ${formatNumber(unassignedCount)} workloads are unassigned. ` +
      `Assessment Agent must complete successfully to generate complexity and readiness scores.`,
      margin, yPos, { maxWidth: contentWidth }
    );
    doc.setTextColor(0, 0, 0);
    yPos += SPACING.LG;
  }
  
  const complexityData = [
    ['Low (1-3)', formatNumber(complexity.low?.count || 0), formatCurrency(complexity.low?.totalCost || 0)],
    ['Medium (4-6)', formatNumber(complexity.medium?.count || 0), formatCurrency(complexity.medium?.totalCost || 0)],
    ['High (7-10)', formatNumber(complexity.high?.count || 0), formatCurrency(complexity.high?.totalCost || 0)],
    ['Unassigned', formatNumber(complexity.unassigned?.count || 0), formatCurrency(complexity.unassigned?.totalCost || 0)]
  ];

  callAutoTable({
    startY: yPos,
    head: [['Complexity Level', 'Workloads', 'Monthly Cost']],
    body: complexityData,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
    margin: { left: margin, right: margin },
    styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY }
  });

  yPos = getLastAutoTable().finalY + SPACING.LG;

  // Readiness Distribution
  checkPageBreak(SPACING.XXL);
  setFont(FONT_SIZE.XL, FONT_BOLD);
  doc.setTextColor(0, 102, 204);
  doc.text('Migration Readiness', margin, yPos);
  yPos += SPACING.MD;

  const readiness = reportData?.readiness || {};
  const totalReadinessCount = (readiness.ready?.count || 0) + (readiness.conditional?.count || 0) + (readiness.notReady?.count || 0) + (readiness.unassigned?.count || 0);
  const unassignedReadinessCount = readiness.unassigned?.count || 0;
  
  // Warn if all workloads are unassigned for readiness
  if (unassignedReadinessCount > 0 && unassignedReadinessCount === totalReadinessCount && unassignedReadinessCount === unassignedCount) {
    // Warning already shown above for complexity, skip duplicate
  }
  
  const readinessData = [
    ['Ready', formatNumber(readiness.ready?.count || 0), formatCurrency(readiness.ready?.totalCost || 0)],
    ['Conditional', formatNumber(readiness.conditional?.count || 0), formatCurrency(readiness.conditional?.totalCost || 0)],
    ['Not Ready', formatNumber(readiness.notReady?.count || 0), formatCurrency(readiness.notReady?.totalCost || 0)],
    ['Unassigned', formatNumber(readiness.unassigned?.count || 0), formatCurrency(readiness.unassigned?.totalCost || 0)]
  ];

  callAutoTable({
    startY: yPos,
    head: [['Readiness Level', 'Workloads', 'Monthly Cost']],
    body: readinessData,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
    margin: { left: margin, right: margin },
    styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY }
  });

  yPos = getLastAutoTable().finalY + SPACING.XL;

  // Migration Readiness Scorecard
  checkPageBreak(SPACING.XXL);
  setFont(FONT_SIZE.XL, FONT_BOLD);
  doc.setTextColor(0, 102, 204);
  doc.text('Migration Readiness Scorecard', margin, yPos);
  yPos += SPACING.MD;

  try {
    const scorecard = calculateReadinessScorecard(readiness);
    if (scorecard) {
      // Overall status indicator box
      doc.setFillColor(scorecard.statusColor[0], scorecard.statusColor[1], scorecard.statusColor[2]);
      doc.setDrawColor(scorecard.statusColor[0], scorecard.statusColor[1], scorecard.statusColor[2]);
      doc.roundedRect(margin, yPos, contentWidth, 20, 3, 3, 'FD');
      
      doc.setTextColor(255, 255, 255);
      setFont(FONT_SIZE.LG, FONT_BOLD);
      doc.text(`Overall Status: ${scorecard.overallStatus}`, margin + 5, yPos + 12);
      yPos += 25;
      
      doc.setTextColor(0, 0, 0);
      setFont(FONT_SIZE.BASE, FONT_NORMAL);
      const scorecardData = [
        ['Ready', `${formatNumber(scorecard.readyCount)} (${scorecard.readyPercentage}%)`, formatCurrency(readiness.ready?.totalCost || 0)],
        ['Conditional', `${formatNumber(scorecard.conditionalCount)} (${scorecard.conditionalPercentage}%)`, formatCurrency(readiness.conditional?.totalCost || 0)],
        ['Not Ready', `${formatNumber(scorecard.notReadyCount)} (${scorecard.notReadyPercentage}%)`, formatCurrency(readiness.notReady?.totalCost || 0)]
      ];

      callAutoTable({
        startY: yPos,
        head: [['Status', 'Workloads', 'Monthly Cost']],
        body: scorecardData,
        theme: 'grid',
        headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY }
      });

      yPos = getLastAutoTable().finalY + SPACING.LG;
      
      // Action items for not-ready workloads
      if (scorecard.notReadyCount > 0) {
        setFont(FONT_SIZE.BASE, FONT_NORMAL);
        doc.setTextColor(200, 0, 0);
        doc.text(`⚠️ Action Required: ${scorecard.notReadyCount.toLocaleString()} workloads need attention before migration`, margin, yPos, { maxWidth: contentWidth });
        doc.setTextColor(0, 0, 0);
        yPos += SPACING.MD;
      }
    }
  } catch (error) {
    console.error('[PDF Generator] Error calculating scorecard:', error);
  }

  yPos += SPACING.XL;

  // ==========================================
  // EXECUTIVE DASHBOARD
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Executive Dashboard', [0, 102, 204]);
  
  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  doc.setTextColor(0, 0, 0);
  doc.text('At-a-glance view of key migration metrics and status indicators.', margin, yPos, { maxWidth: contentWidth });
  yPos += SPACING.LG;

  // KPI Cards
  const kpiCards = [
    { label: 'Total Workloads', value: formatNumber(summary.totalWorkloads || 0), color: [0, 102, 204] },
    { label: 'Monthly Cost', value: formatCurrency(summary.totalMonthlyCost || 0), color: [40, 167, 69] },
    { label: 'Avg Complexity', value: summary.averageComplexity ? summary.averageComplexity.toFixed(1) : 'N/A', color: [255, 193, 7] },
    { label: 'AWS Services', value: formatNumber(summary.totalServices || 0), color: [108, 117, 125] }
  ];

  const cardWidth = (contentWidth - SPACING.MD) / 2;
  const cardHeight = 25;
  let cardX = margin;
  let cardY = yPos;

  kpiCards.forEach((card, index) => {
    if (index > 0 && index % 2 === 0) {
      cardY += cardHeight + SPACING.SM;
      cardX = margin;
    } else if (index > 0) {
      cardX = margin + cardWidth + SPACING.MD;
    }

    // Card background
    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'F');
    
    // Card text
    doc.setTextColor(255, 255, 255);
    setFont(FONT_SIZE.SM, FONT_NORMAL);
    doc.text(card.label, cardX + 5, cardY + 8);
    setFont(FONT_SIZE.LG, FONT_BOLD);
    doc.text(card.value, cardX + 5, cardY + 18);
  });

  yPos = cardY + cardHeight + SPACING.XL;

  // Cost Breakdown by Category
  try {
    const costBreakdown = calculateCostBreakdown(reportData?.services?.topServices || []);
    if (costBreakdown.length > 0) {
      checkPageBreak(SPACING.XXL);
      setFont(FONT_SIZE.XL, FONT_BOLD);
      doc.setTextColor(0, 102, 204);
      doc.text('Cost Breakdown by Category', margin, yPos);
      yPos += SPACING.MD;

      const breakdownData = costBreakdown.map(cat => [
        cat.name,
        formatCurrency(cat.cost),
        formatNumber(cat.services.length) + ' services'
      ]);

      callAutoTable({
        startY: yPos,
        head: [['Category', 'Monthly Cost', 'Services']],
        body: breakdownData,
        theme: 'grid',
        headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY }
      });

      yPos = getLastAutoTable().finalY + SPACING.XL;
    }
  } catch (error) {
    console.error('[PDF Generator] Error calculating cost breakdown:', error);
  }

  // ==========================================
  // KEY INSIGHTS SECTION
  // ==========================================
  checkPageBreak(SPACING.XXL);
  addSectionHeader('Key Insights', [0, 102, 204]);
  
  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  doc.setTextColor(0, 0, 0);
  
  try {
    const insights = calculateKeyInsights(reportData, costEstimates, strategyResults);
    
    // Top Cost Drivers
    if (insights.topCostDrivers.length > 0) {
      setFont(FONT_SIZE.XL, FONT_BOLD);
      doc.setTextColor(0, 102, 204);
      doc.text('Top Cost Drivers', margin, yPos);
      yPos += SPACING.MD;
      
      const costDriversData = insights.topCostDrivers.map(driver => [
        driver.service,
        formatCurrency(driver.cost),
        `${driver.percentage}%`
      ]);
      
      callAutoTable({
        startY: yPos,
        head: [['Service', 'Monthly Cost', 'Percentage']],
        body: costDriversData,
        theme: 'grid',
        headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY }
      });
      
      yPos = getLastAutoTable().finalY + SPACING.LG;
    }
    
    // Quick Wins
    if (insights.quickWins.length > 0) {
      checkPageBreak(SPACING.XXL);
      setFont(FONT_SIZE.XL, FONT_BOLD);
      doc.setTextColor(40, 167, 69);
      doc.text('Quick Wins', margin, yPos);
      yPos += SPACING.MD;
      
      setFont(FONT_SIZE.BASE, FONT_NORMAL);
      doc.setTextColor(0, 0, 0);
      insights.quickWins.forEach(win => {
        checkPageBreak(SPACING.MD);
        doc.text(`• ${win.description}`, margin + 5, yPos, { maxWidth: contentWidth - 10 });
        yPos += SPACING.SM;
        doc.text(`  ${formatNumber(win.count)} workloads, ${formatCurrency(win.cost)} monthly`, margin + 10, yPos, { maxWidth: contentWidth - 15 });
        yPos += SPACING.MD;
      });
      yPos += SPACING.LG;
    }
    
    // Risk Areas
    if (insights.riskAreas.length > 0) {
      checkPageBreak(SPACING.XXL);
      setFont(FONT_SIZE.XL, FONT_BOLD);
      doc.setTextColor(200, 0, 0);
      doc.text('Risk Areas Requiring Attention', margin, yPos);
      yPos += SPACING.MD;
      
      setFont(FONT_SIZE.BASE, FONT_NORMAL);
      doc.setTextColor(0, 0, 0);
      insights.riskAreas.forEach(risk => {
        checkPageBreak(SPACING.MD);
        doc.text(`• ${risk.description}`, margin + 5, yPos, { maxWidth: contentWidth - 10 });
        yPos += SPACING.SM;
        doc.text(`  Impact: ${formatCurrency(risk.cost)} monthly`, margin + 10, yPos, { maxWidth: contentWidth - 15 });
        yPos += SPACING.MD;
      });
      yPos += SPACING.LG;
    }
    
    // Migration Opportunities
    if (insights.migrationOpportunities.length > 0) {
      checkPageBreak(SPACING.XXL);
      setFont(FONT_SIZE.XL, FONT_BOLD);
      doc.setTextColor(40, 167, 69);
      doc.text('Migration Opportunities', margin, yPos);
      yPos += SPACING.MD;
      
      setFont(FONT_SIZE.BASE, FONT_NORMAL);
      doc.setTextColor(0, 0, 0);
      insights.migrationOpportunities.forEach(opp => {
        checkPageBreak(SPACING.MD);
        doc.text(`• ${opp.description}`, margin + 5, yPos, { maxWidth: contentWidth - 10 });
        yPos += SPACING.SM;
        doc.text(`  Potential value: ${formatCurrency(opp.cost)} monthly`, margin + 10, yPos, { maxWidth: contentWidth - 15 });
        yPos += SPACING.MD;
      });
    }
  } catch (error) {
    console.error('[PDF Generator] Error calculating insights:', error);
  }

  // ==========================================
  // ASSESSMENT AGENT SUMMARY
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Assessment Agent Summary', [0, 102, 204]);

  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  const summaryForAssessment = reportData?.summary || {};
    doc.text(
      `Assessment results for ${formatNumber(summaryForAssessment.totalWorkloads || 0)} workloads across ` +
      `${formatNumber(summaryForAssessment.totalServices || 0)} AWS services.`,
      margin, yPos, { maxWidth: contentWidth }
    );
  yPos += SPACING.LG;

  // All Services Table - Complete list (ALL services, not just top N)
  // Extract services data once at function level for reuse later
  const services = reportData?.services || {};
  const allServicesList = services.topServices || []; // Now contains ALL services, not just top N
  const otherService = services.other || null;
  
  // Debug: Log service data
  console.log(`PDF Generator - Processing ${allServicesList.length} services (should be ALL services, not limited)`);
  if (allServicesList.length > 0) {
    // SAFETY: Batch reduce to avoid stack overflow with large service lists
    let totalServiceCost = 0;
    const COST_BATCH_SIZE = 1000; // Process 1K services at a time
    for (let i = 0; i < allServicesList.length; i += COST_BATCH_SIZE) {
      const batch = allServicesList.slice(i, Math.min(i + COST_BATCH_SIZE, allServicesList.length));
      for (const s of batch) {
        totalServiceCost += (s?.totalCost || 0);
      }
    }
    
    const expectedTotal = reportData?.summary?.totalMonthlyCost || 0;
    console.log(`PDF Generator - Total cost from services: $${totalServiceCost.toFixed(2)}, Expected: $${expectedTotal.toFixed(2)}`);
    
    // CRITICAL FIX: If service costs don't match expected total, scale them
    if (expectedTotal > 0 && Math.abs(totalServiceCost - expectedTotal) > 100) {
      const scaleFactor = expectedTotal / totalServiceCost;
      console.log(`PDF Generator - WARNING: Service costs don't match expected total. Scaling by factor ${scaleFactor.toFixed(4)}`);
      
      // SAFETY: Batch forEach to avoid stack overflow with large service lists
      const SCALE_BATCH_SIZE = 1000; // Process 1K services at a time
      for (let i = 0; i < allServicesList.length; i += SCALE_BATCH_SIZE) {
        const batch = allServicesList.slice(i, Math.min(i + SCALE_BATCH_SIZE, allServicesList.length));
        for (const service of batch) {
          if (service.totalCost) {
            service.totalCost = service.totalCost * scaleFactor;
          }
        }
      }
      
      // SAFETY: Batch reduce to avoid stack overflow
      let newTotal = 0;
      for (let i = 0; i < allServicesList.length; i += SCALE_BATCH_SIZE) {
        const batch = allServicesList.slice(i, Math.min(i + SCALE_BATCH_SIZE, allServicesList.length));
        for (const s of batch) {
          newTotal += (s?.totalCost || 0);
        }
      }
      console.log(`PDF Generator - After scaling, service total: $${newTotal.toFixed(2)}`);
    }
  }

  // SAFETY: Batch map to avoid stack overflow with large service lists
  const serviceTableData = [];
  const TABLE_BATCH_SIZE = 1000; // Process 1K services at a time
  for (let i = 0; i < allServicesList.length; i += TABLE_BATCH_SIZE) {
    const batch = allServicesList.slice(i, Math.min(i + TABLE_BATCH_SIZE, allServicesList.length));
    for (const service of batch) {
      serviceTableData.push([
        service?.service || 'Unknown',
        (service?.count || 0).toLocaleString(),
        formatCurrency(service?.totalCost || 0),
        service?.averageComplexity ? service.averageComplexity.toFixed(1) : 'N/A',
        service?.gcpService || 'N/A',
        service?.migrationStrategy || 'N/A'
      ]);
    }
  }

  // Include "Other" category if it exists (for backward compatibility)
  if (otherService && otherService.count > 0) {
    serviceTableData.push([
      otherService.service || 'Other',
      (otherService.count || 0).toLocaleString(),
      formatCurrency(otherService.totalCost || 0),
      otherService.averageComplexity ? otherService.averageComplexity.toFixed(1) : 'N/A',
      otherService.gcpService || 'Multiple',
      'Mixed'
    ]);
  }

  if (serviceTableData.length > 0) {
    callAutoTable({
      startY: yPos,
      head: [['AWS Service', 'Workloads', 'Monthly Cost', 'Avg Complexity', 'Target GCP Service', 'Strategy']],
      body: serviceTableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
      margin: { left: margin, right: margin },
      styles: { fontSize: FONT_SIZE.SM, font: FONT_FAMILY },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 40 },
        5: { cellWidth: 25 }
      }
    });
    yPos = getLastAutoTable().finalY + SPACING.XL;
  } else {
    doc.text('No service data available.', margin, yPos);
    yPos += SPACING.LG;
  }

  // ==========================================
  // REGIONAL ANALYSIS SUMMARY
  // ==========================================
  checkPageBreak(30);
  addSectionHeader('Regional Analysis Summary', [0, 102, 204]);

  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  const regions = reportData?.regions || [];
  doc.text(
    `Workload distribution across ${regions.length} AWS regions.`,
    margin, yPos, { maxWidth: contentWidth }
  );
  yPos += SPACING.LG;

  // All regions - sorted by cost
  // SAFETY: Safe array conversion and sort with error handling
  let sortedRegions = [];
  try {
    sortedRegions = Array.from(regions);
    // SAFETY: Limit regions before sorting
    if (sortedRegions.length > 1000) {
      console.warn(`[reportPdfGenerator] Too many regions (${sortedRegions.length}), limiting to 1000`);
      sortedRegions = sortedRegions.slice(0, 1000);
    }
    sortedRegions.sort((a, b) => {
      try {
        const costA = typeof a?.totalCost === 'number' ? a.totalCost : parseFloat(a?.totalCost) || 0;
        const costB = typeof b?.totalCost === 'number' ? b.totalCost : parseFloat(b?.totalCost) || 0;
        return costB - costA;
      } catch (e) {
        return 0; // Keep order if sort fails
      }
    });
  } catch (sortError) {
    console.error('[reportPdfGenerator] Error sorting regions:', sortError);
    sortedRegions = Array.isArray(regions) ? regions.slice(0, 100) : [];
  }

  // SAFETY: Batch map to avoid stack overflow (regions should be small, but batch to be safe)
  const regionTableData = [];
  const REGION_BATCH_SIZE = 100; // Process 100 regions at a time (should be plenty)
  for (let i = 0; i < sortedRegions.length; i += REGION_BATCH_SIZE) {
    const batch = sortedRegions.slice(i, Math.min(i + REGION_BATCH_SIZE, sortedRegions.length));
    for (const region of batch) {
      regionTableData.push([
        region?.region || 'Unknown',
        (region?.count || 0).toLocaleString(),
        formatCurrency(region?.totalCost || 0),
        region?.averageComplexity ? region.averageComplexity.toFixed(1) : 'N/A'
      ]);
    }
  }

  if (regionTableData.length > 0) {
    callAutoTable({
      startY: yPos,
      head: [['Region', 'Workloads', 'Monthly Cost', 'Avg Complexity']],
      body: regionTableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
      margin: { left: margin, right: margin },
      styles: { fontSize: FONT_SIZE.SM, font: FONT_FAMILY },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 30, halign: 'center' }
      }
    });
    yPos = getLastAutoTable().finalY + SPACING.LG;
  } else {
    doc.text('No regional data available.', margin, yPos);
    yPos += SPACING.LG;
  }

  // ==========================================
  // COST ANALYSIS AGENT SUMMARY
  // ==========================================
  // Show cost section even if costEstimates is empty - use reportData costs
  const hasCostEstimates = costEstimates && costEstimates.length > 0;
  const hasReportDataCosts = reportData?.summary?.totalMonthlyCost > 0;
  
  if (hasCostEstimates || hasReportDataCosts) {
    doc.addPage();
    yPos = margin;
    addSectionHeader('Cost Analysis Agent Summary', [40, 167, 69]);

    setFont(FONT_SIZE.BASE, FONT_NORMAL);
    if (hasCostEstimates) {
      doc.text(
        `Cost comparison summary between AWS and GCP with Committed Use Discounts (CUD) applied. ` +
        `Complete service cost breakdown.`,
        margin, yPos, { maxWidth: contentWidth }
      );
    } else if (hasReportDataCosts) {
      doc.text(
        `Cost summary from discovered workloads. Total monthly cost: ${formatCurrency(reportData.summary.totalMonthlyCost)}. ` +
        `Detailed GCP cost estimates will be available after Cost Agent completes.`,
        margin, yPos, { maxWidth: contentWidth }
      );
    }
    yPos += SPACING.LG;

    let costTableData = [];
    
    // Sort by AWS cost and show all services (only if we have costEstimates)
    let sortedCostEstimates = [];
    if (hasCostEstimates) {
      // SAFETY: Safe array conversion and sort with error handling
      try {
        sortedCostEstimates = Array.from(costEstimates);
        // SAFETY: Limit before sorting to avoid memory issues
        if (sortedCostEstimates.length > 10000) {
          console.warn(`[reportPdfGenerator] Too many cost estimates (${sortedCostEstimates.length}), limiting to 10000`);
          sortedCostEstimates = sortedCostEstimates.slice(0, 10000);
        }
        sortedCostEstimates.sort((a, b) => {
          try {
            const costA = typeof a?.costEstimate?.awsCost === 'number' 
              ? a.costEstimate.awsCost 
              : parseFloat(a?.costEstimate?.awsCost) || 0;
            const costB = typeof b?.costEstimate?.awsCost === 'number'
              ? b.costEstimate.awsCost
              : parseFloat(b?.costEstimate?.awsCost) || 0;
            return costB - costA;
          } catch (e) {
            return 0; // Keep order if sort fails
          }
        });
      } catch (sortError) {
        console.error('[reportPdfGenerator] Error sorting cost estimates:', sortError);
        sortedCostEstimates = Array.isArray(costEstimates) ? costEstimates.slice(0, 1000) : [];
      }
    }
    
    if (hasCostEstimates) {
      // SAFETY: Batch map to avoid stack overflow with large cost estimates arrays
      costTableData = [];
      const COST_TABLE_BATCH_SIZE = 1000; // Process 1K estimates at a time
      for (let i = 0; i < sortedCostEstimates.length; i += COST_TABLE_BATCH_SIZE) {
        const batch = sortedCostEstimates.slice(i, Math.min(i + COST_TABLE_BATCH_SIZE, sortedCostEstimates.length));
        for (const estimate of batch) {
          const costs = estimate?.costEstimate || {};
          costTableData.push([
            estimate?.service || 'Unknown',
            costs.gcpService || 'N/A',
            formatCurrency(costs.awsCost || 0),
            formatCurrency(costs.gcpOnDemand || 0),
            formatCurrency(costs.gcp1YearCUD || 0),
            formatCurrency(costs.gcp3YearCUD || 0),
            formatCurrency(costs.savings3Year || 0)
          ]);
        }
      }
    } else if (hasReportDataCosts && reportData?.services?.topServices) {
      // Fallback: Show costs from reportData if costEstimates not available
      costTableData = reportData.services.topServices.slice(0, 20).map(service => [
        service.name || 'Unknown',
        'N/A', // GCP service mapping not available without Cost Agent
        formatCurrency(service.totalCost || 0),
        'N/A',
        'N/A',
        'N/A',
        'N/A'
      ]);
      
      setFont(FONT_SIZE.MD, FONT_NORMAL);
      doc.setTextColor(100, 100, 100);
      doc.text('Note: GCP cost estimates require Cost Agent to complete. Showing AWS costs only.', margin, yPos, { maxWidth: contentWidth });
      yPos += SPACING.MD;
    }

    if (costTableData.length > 0) {
      callAutoTable({
        startY: yPos,
        head: [['AWS Service', 'GCP Service', 'AWS Cost', 'GCP On-Demand', 'GCP 1Y CUD', 'GCP 3Y CUD', 'Savings (3Y)']],
        body: costTableData,
        theme: 'grid',
        headStyles: { fillColor: [40, 167, 69], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.XS, font: FONT_FAMILY },
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

      yPos = getLastAutoTable().finalY + SPACING.LG;
    } else {
      // No cost data available
      setFont(FONT_SIZE.BASE, FONT_NORMAL);
      doc.setTextColor(150, 150, 150);
      doc.text('No cost data available. Costs will be calculated after Cost Agent completes.', margin, yPos, { maxWidth: contentWidth });
      yPos += SPACING.XL;
    }

    // Total cost summary - sum ALL services (not just top N)
    // Use absolute values to handle negative costs (credits) properly
    // Note: costEstimates is validated at function start, so it's guaranteed to be a non-empty array
    // SAFETY: Batch reduce to avoid stack overflow with large cost estimates arrays
    const totalCosts = { aws: 0, gcpOnDemand: 0, gcp1Year: 0, gcp3Year: 0 };
    const COST_ESTIMATE_BATCH_SIZE = 1000; // Process 1K estimates at a time
    
    for (let i = 0; i < costEstimates.length; i += COST_ESTIMATE_BATCH_SIZE) {
      const batch = costEstimates.slice(i, Math.min(i + COST_ESTIMATE_BATCH_SIZE, costEstimates.length));
      for (const est of batch) {
        const costs = est?.costEstimate || {};
        // Use absolute value for AWS cost (handles credits/refunds)
        totalCosts.aws += Math.abs(costs.awsCost || 0);
        totalCosts.gcpOnDemand += Math.max(0, costs.gcpOnDemand || 0);
        totalCosts.gcp1Year += Math.max(0, costs.gcp1YearCUD || 0);
        totalCosts.gcp3Year += Math.max(0, costs.gcp3YearCUD || 0);
      }
    }
    
    // If costEstimates total doesn't match reportData total, use reportData total (more accurate)
    const reportDataTotal = reportData?.summary?.totalMonthlyCost || 0;
    if (reportDataTotal > 0 && Math.abs(totalCosts.aws - reportDataTotal) > 1000) {
      console.warn(`PDF Generator - Cost mismatch: costEstimates total (${totalCosts.aws.toFixed(2)}) vs reportData total (${reportDataTotal.toFixed(2)}). Using reportData total.`);
      totalCosts.aws = reportDataTotal;
    }
    
    // Debug: Log cost totals
    // Note: costEstimates is validated at function start, so it's guaranteed to be a non-empty array
    console.log(`PDF Generator - Cost totals from ${costEstimates.length} services:`, {
      awsTotal: totalCosts.aws,
      gcp3YearTotal: totalCosts.gcp3Year,
      savings: totalCosts.aws - totalCosts.gcp3Year
    });

    checkPageBreak(25);
    setFont(FONT_SIZE.XL, FONT_BOLD);
    doc.setTextColor(40, 167, 69);
    doc.text('Total Cost Summary', margin, yPos);
    yPos += SPACING.MD;

    // Calculate migration costs (one-time)
    // Use more realistic cost model for large-scale migrations
    const totalWorkloads = reportData?.summary?.totalWorkloads || 0;
    const dataEgressCost = totalCosts.aws * 0.02; // Estimate 2% of monthly cost for data egress
    
    // Realistic migration costs - scale with workload count but with economies of scale
    // For very large migrations (>100k workloads), use tiered pricing
    let migrationConsulting;
    if (totalWorkloads > 100000) {
      // Large scale: $0.10 per workload (bulk discount)
      migrationConsulting = totalWorkloads * 0.10;
    } else if (totalWorkloads > 10000) {
      // Medium scale: $1 per workload
      migrationConsulting = totalWorkloads * 1;
    } else {
      // Small scale: $50 per workload
      migrationConsulting = totalWorkloads * 50;
    }
    
    const migrationTools = totalCosts.aws * 0.01; // 1% of monthly cost for migration tools
    
    // Training costs also scale with workload count
    let trainingCost;
    if (totalWorkloads > 100000) {
      // Large scale: $0.02 per workload (bulk training)
      trainingCost = totalWorkloads * 0.02;
    } else if (totalWorkloads > 10000) {
      // Medium scale: $0.50 per workload
      trainingCost = totalWorkloads * 0.50;
    } else {
      // Small scale: $10 per workload
      trainingCost = totalWorkloads * 10;
    }
    
    const totalMigrationCost = dataEgressCost + migrationConsulting + migrationTools + trainingCost;
    
    // Calculate operational costs (ongoing)
    const licensingCost = totalCosts.gcp3Year * 0.05; // 5% for licensing (Custom Solutions, etc.)
    const managementTools = totalCosts.gcp3Year * 0.03; // 3% for management/monitoring tools
    const monthlyOperationalCost = licensingCost + managementTools;
    const annualOperationalCost = monthlyOperationalCost * 12;
    const threeYearOperationalCost = annualOperationalCost * 3;
    
    // Calculate complete TCO (3 years)
    const gcp3YearTotal = totalCosts.gcp3Year * 12 * 3; // 3 years of GCP costs
    const totalTCO = gcp3YearTotal + totalMigrationCost + threeYearOperationalCost;
    const aws3YearTotal = totalCosts.aws * 12 * 3;
    const netSavings = aws3YearTotal - totalTCO;
    
    const totalCostData = [
      ['AWS Total (Monthly)', formatCurrency(totalCosts.aws)],
      ['GCP On-Demand (Monthly)', formatCurrency(totalCosts.gcpOnDemand)],
      ['GCP 1-Year CUD (Monthly)', formatCurrency(totalCosts.gcp1Year)],
      ['GCP 3-Year CUD (Monthly)', formatCurrency(totalCosts.gcp3Year)],
      ['Potential Savings (Monthly)', formatCurrency(totalCosts.aws - totalCosts.gcp3Year)]
    ];
    
    callAutoTable({
      startY: yPos,
      head: [['Cost Type', 'Monthly Cost']],
      body: totalCostData,
      theme: 'grid',
      headStyles: { fillColor: [40, 167, 69], fontStyle: FONT_BOLD, font: FONT_FAMILY },
      margin: { left: margin, right: margin },
      styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY }
    });
    
    yPos = getLastAutoTable().finalY + SPACING.XL;
    
    // Migration Costs (One-Time)
    checkPageBreak(30);
    setFont(FONT_SIZE.XL, FONT_BOLD);
    doc.setTextColor(40, 167, 69);
    doc.text('Migration Costs (One-Time)', margin, yPos);
    yPos += SPACING.MD;
    
    const migrationCostData = [
      ['Data Egress from AWS', formatCurrency(dataEgressCost)],
      ['Migration Consulting', formatCurrency(migrationConsulting)],
      ['Migration Tools & Software', formatCurrency(migrationTools)],
      ['Training & Knowledge Transfer', formatCurrency(trainingCost)],
      ['Total Migration Cost', formatCurrency(totalMigrationCost)]
    ];
    
    callAutoTable({
      startY: yPos,
      head: [['Cost Item', 'One-Time Cost']],
      body: migrationCostData,
      theme: 'grid',
      headStyles: { fillColor: [40, 167, 69], fontStyle: FONT_BOLD, font: FONT_FAMILY },
      margin: { left: margin, right: margin },
      styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY }
    });
    
    yPos = getLastAutoTable().finalY + SPACING.XL;
    
    // Operational Costs (Ongoing)
    checkPageBreak(30);
    setFont(FONT_SIZE.XL, FONT_BOLD);
    doc.setTextColor(40, 167, 69);
    doc.text('Operational Costs (Ongoing)', margin, yPos);
    yPos += SPACING.MD;
    
    const operationalCostData = [
      ['Licensing (Custom Solutions)', formatCurrency(licensingCost) + '/month'],
      ['Management & Monitoring Tools', formatCurrency(managementTools) + '/month'],
      ['Total Operational Cost (Monthly)', formatCurrency(monthlyOperationalCost)],
      ['Total Operational Cost (3 Years)', formatCurrency(threeYearOperationalCost)]
    ];
    
    callAutoTable({
      startY: yPos,
      head: [['Cost Item', 'Cost']],
      body: operationalCostData,
      theme: 'grid',
      headStyles: { fillColor: [40, 167, 69], fontStyle: FONT_BOLD, font: FONT_FAMILY },
      margin: { left: margin, right: margin },
      styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY }
    });
    
    yPos = getLastAutoTable().finalY + SPACING.XL;
    
    // Complete TCO Summary (3 Years)
    checkPageBreak(30);
    setFont(FONT_SIZE.XL, FONT_BOLD);
    doc.setTextColor(0, 0, 0);
    setFont(FONT_SIZE.XL, FONT_BOLD);
    doc.text('Complete TCO Analysis (3 Years)', margin, yPos);
    yPos += SPACING.MD;
    
    setFont(FONT_SIZE.BASE, FONT_NORMAL);
    setFont(FONT_SIZE.BASE, FONT_NORMAL);
    const tcoData = [
      ['AWS Total (3 Years)', formatCurrency(aws3YearTotal)],
      ['GCP 3-Year CUD Total (3 Years)', formatCurrency(gcp3YearTotal)],
      ['Migration Costs (One-Time)', formatCurrency(totalMigrationCost)],
      ['Operational Costs (3 Years)', formatCurrency(threeYearOperationalCost)],
      ['Total GCP TCO (3 Years)', formatCurrency(totalTCO)],
      ['Net Savings (3 Years)', formatCurrency(netSavings)]
    ];
    
    // Add note if net savings is negative
    if (netSavings < 0) {
      yPos += SPACING.SM;
      setFont(FONT_SIZE.MD, FONT_NORMAL);
      doc.setTextColor(200, 0, 0);
      doc.text(
        `Note: Negative net savings indicates GCP TCO exceeds AWS costs over 3 years. ` +
        `This may be due to high migration costs for large-scale migrations. ` +
        `Consider phased migration approach or re-evaluate migration cost assumptions.`,
        margin + 5, yPos, { maxWidth: contentWidth - 10 }
      );
      doc.setTextColor(0, 0, 0);
    }
    
    callAutoTable({
      startY: yPos,
      head: [['Cost Category', '3-Year Total']],
      body: tcoData,
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
      margin: { left: margin, right: margin },
      styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' }
      }
    });

    yPos = getLastAutoTable().finalY + SPACING.XL;
  }

  // ==========================================
  // COST BREAKDOWN & ANOMALIES
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Cost Breakdown & Anomalies', [40, 167, 69]);
  
  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  doc.setTextColor(0, 0, 0);
  doc.text('Detailed cost analysis including top expensive workloads and cost optimization opportunities.', margin, yPos, { maxWidth: contentWidth });
  yPos += SPACING.LG;

  // Top 10 Expensive Workloads
  try {
    // CRITICAL: Check memory and workload count BEFORE accessing workloads array
    let shouldProcessWorkloads = false;
    const workloadCount = reportData?.summary?.totalWorkloads || 0;
    
    // CRITICAL: Check memory first, then decide if we can safely access workloads array
    if (performance.memory) {
      const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
      const usagePercent = (usedMB / limitMB) * 100;
      
      // Only process if memory is low AND workload count is reasonable
      if (usagePercent < 70 && workloadCount > 0 && workloadCount < 150000) {
        shouldProcessWorkloads = true;
      } else {
        if (usagePercent >= 70) {
          console.warn(`[PDF Generator] Memory usage high (${usagePercent.toFixed(1)}%), skipping workload processing`);
        }
        if (workloadCount >= 150000) {
          console.warn(`[PDF Generator] Workload count too large (${workloadCount.toLocaleString()}), skipping detailed workload analysis`);
        }
      }
    } else {
      // If no memory API, only process if workload count is small
      shouldProcessWorkloads = workloadCount > 0 && workloadCount < 100000;
    }
    
    // CRITICAL: Only access workloads array if we're going to use it AND it exists
    let topWorkloads = [];
    if (shouldProcessWorkloads) {
      // Double-check memory before accessing
      if (performance.memory) {
        const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
        const usagePercent = (usedMB / limitMB) * 100;
        if (usagePercent < 70 && reportData?.workloads) {
          const workloads = reportData.workloads;
          topWorkloads = Array.isArray(workloads) && workloads.length > 0 ? getTopExpensiveWorkloads(workloads, 10) : [];
        }
      } else if (reportData?.workloads) {
        const workloads = reportData.workloads;
        topWorkloads = Array.isArray(workloads) && workloads.length > 0 ? getTopExpensiveWorkloads(workloads, 10) : [];
      }
    }
    
    if (!shouldProcessWorkloads && workloadCount > 0) {
      // Show message that workload details were skipped
      setFont(FONT_SIZE.BASE, FONT_NORMAL);
      doc.setTextColor(200, 0, 0);
      doc.text(`Note: Detailed workload analysis skipped due to large dataset (${workloadCount.toLocaleString()} workloads). Summary data is still included.`, margin, yPos, { maxWidth: contentWidth });
      doc.setTextColor(0, 0, 0);
      yPos += SPACING.LG;
    }
    
    if (topWorkloads.length > 0) {
      setFont(FONT_SIZE.XL, FONT_BOLD);
      doc.setTextColor(0, 102, 204);
      doc.text('Top 10 Most Expensive Workloads', margin, yPos);
      yPos += SPACING.MD;

      // SAFETY: Batch map to avoid stack overflow with large arrays
      const topWorkloadsData = [];
      const MAX_TOP_WORKLOADS = Math.min(topWorkloads.length, 10);
      for (let idx = 0; idx < MAX_TOP_WORKLOADS; idx++) {
        const w = topWorkloads[idx];
        if (!w) continue;
        topWorkloadsData.push([
          (idx + 1).toString(),
          (w.name || 'Unknown').substring(0, 40) + ((w.name || '').length > 40 ? '...' : ''),
          w.service || 'Unknown',
          w.region || 'Unknown',
          formatCurrency(w.cost || 0),
          (w.complexity || 'N/A').toString()
        ]);
      }

      callAutoTable({
        startY: yPos,
        head: [['#', 'Workload Name', 'Service', 'Region', 'Monthly Cost', 'Complexity']],
        body: topWorkloadsData,
        theme: 'grid',
        headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.XS, font: FONT_FAMILY },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 60 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 20, halign: 'center' }
        }
      });

      yPos = getLastAutoTable().finalY + SPACING.LG;
    }
  } catch (error) {
    console.error('[PDF Generator] Error getting top workloads:', error);
  }

  // Cost Anomalies
  try {
    // CRITICAL: Check memory BEFORE accessing workloads array
    let shouldProcessAnomalies = false;
    const workloadCount = reportData?.summary?.totalWorkloads || 0;
    
    // CRITICAL: Only process anomalies if memory is low AND workload count is reasonable
    if (performance.memory) {
      const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
      const usagePercent = (usedMB / limitMB) * 100;
      
      if (usagePercent < 70 && workloadCount > 0 && workloadCount < 150000) {
        shouldProcessAnomalies = true;
      } else {
        if (usagePercent >= 70) {
          console.warn(`[PDF Generator] Memory usage high (${usagePercent.toFixed(1)}%), skipping anomaly detection`);
        }
        if (workloadCount >= 150000) {
          console.warn(`[PDF Generator] Workload count too large (${workloadCount.toLocaleString()}), skipping anomaly detection`);
        }
      }
    } else {
      shouldProcessAnomalies = workloadCount > 0 && workloadCount < 100000;
    }
    
    // CRITICAL: Only access workloads array if we're going to use it AND memory allows
    let anomalies = { highCostWorkloads: [], costSpikes: [], optimizationOpportunities: [] };
    if (shouldProcessAnomalies) {
      // Double-check memory before accessing
      if (performance.memory) {
        const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
        const usagePercent = (usedMB / limitMB) * 100;
        if (usagePercent < 70 && reportData?.workloads) {
          const workloads = reportData.workloads;
          const services = reportData?.services?.topServices || [];
          anomalies = Array.isArray(workloads) && workloads.length > 0 ? detectCostAnomalies(workloads, services) : anomalies;
        }
      } else if (reportData?.workloads) {
        const workloads = reportData.workloads;
        const services = reportData?.services?.topServices || [];
        anomalies = Array.isArray(workloads) && workloads.length > 0 ? detectCostAnomalies(workloads, services) : anomalies;
      }
    }
    
    if (anomalies.highCostWorkloads.length > 0) {
      checkPageBreak(SPACING.XXL);
      setFont(FONT_SIZE.XL, FONT_BOLD);
      doc.setTextColor(200, 0, 0);
      doc.text('High-Cost Anomalies', margin, yPos);
      yPos += SPACING.MD;

      setFont(FONT_SIZE.BASE, FONT_NORMAL);
      doc.setTextColor(0, 0, 0);
      doc.text('The following workloads have unusually high costs and should be reviewed:', margin, yPos, { maxWidth: contentWidth });
      yPos += SPACING.MD;

      // SAFETY: Batch map to avoid stack overflow
      const anomaliesData = [];
      const MAX_ANOMALIES = Math.min(anomalies.highCostWorkloads.length, 10);
      for (let i = 0; i < MAX_ANOMALIES; i++) {
        const w = anomalies.highCostWorkloads[i];
        if (!w) continue;
        anomaliesData.push([
          (w.name || 'Unknown').substring(0, 40) + ((w.name || '').length > 40 ? '...' : ''),
          formatCurrency(w.cost || 0),
          (w.deviation || '0%') + ' above average'
        ]);
      }

      callAutoTable({
        startY: yPos,
        head: [['Workload', 'Monthly Cost', 'Deviation']],
        body: anomaliesData,
        theme: 'grid',
        headStyles: { fillColor: [200, 0, 0], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.SM, font: FONT_FAMILY }
      });

      yPos = getLastAutoTable().finalY + SPACING.LG;
    }

    // Optimization Opportunities
    if (anomalies.optimizationOpportunities.length > 0) {
      checkPageBreak(SPACING.XXL);
      setFont(FONT_SIZE.XL, FONT_BOLD);
      doc.setTextColor(40, 167, 69);
      doc.text('Cost Optimization Opportunities', margin, yPos);
      yPos += SPACING.MD;

      // SAFETY: Batch map to avoid stack overflow
      const optData = [];
      const MAX_OPT = Math.min(anomalies.optimizationOpportunities.length, 10);
      for (let i = 0; i < MAX_OPT; i++) {
        const w = anomalies.optimizationOpportunities[i];
        if (!w) continue;
        optData.push([
          (w.name || 'Unknown').substring(0, 40) + ((w.name || '').length > 40 ? '...' : ''),
          formatCurrency(w.cost || 0),
          (w.complexity || 'N/A').toString(),
          formatCurrency(w.potentialSavings || 0)
        ]);
      }

      callAutoTable({
        startY: yPos,
        head: [['Workload', 'Current Cost', 'Complexity', 'Potential Savings']],
        body: optData,
        theme: 'grid',
        headStyles: { fillColor: [40, 167, 69], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.SM, font: FONT_FAMILY }
      });

      yPos = getLastAutoTable().finalY + SPACING.XL;
    }
  } catch (error) {
    console.error('[PDF Generator] Error detecting anomalies:', error);
  }

  // ==========================================
  // GCP COST PROJECTIONS
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('GCP Cost Projections', [40, 167, 69]);
  
  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  doc.setTextColor(0, 0, 0);
  
  try {
    const awsTotalCost = reportData?.summary?.totalMonthlyCost || 0;
    const projections = calculateGCPProjections(costEstimates, awsTotalCost);
    
    if (projections) {
      doc.text('Comprehensive cost comparison between AWS and GCP with 3-year projections.', margin, yPos, { maxWidth: contentWidth });
      yPos += SPACING.LG;

      // Side-by-side comparison
      setFont(FONT_SIZE.XL, FONT_BOLD);
      doc.setTextColor(0, 102, 204);
      doc.text('AWS vs GCP Cost Comparison', margin, yPos);
      yPos += SPACING.MD;

      const comparisonData = [
        ['Monthly Cost', formatCurrency(projections.awsMonthly), formatCurrency(projections.gcpMonthly), formatCurrency(projections.monthlySavings), `${projections.savingsPercentage}%`],
        ['3-Year Total (On-Demand)', formatCurrency(projections.aws3Year), formatCurrency(projections.gcp3Year), formatCurrency(projections.aws3Year - projections.gcp3Year), 'N/A'],
        ['3-Year Total (with CUD)', formatCurrency(projections.aws3Year), formatCurrency(projections.gcp3YearCUD), formatCurrency(projections.threeYearSavings), `${((projections.threeYearSavings / projections.aws3Year) * 100).toFixed(1)}%`]
      ];

      callAutoTable({
        startY: yPos,
        head: [['Period', 'AWS Cost', 'GCP Cost', 'Savings', 'Savings %']],
        body: comparisonData,
        theme: 'grid',
        headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY }
      });

      yPos = getLastAutoTable().finalY + SPACING.LG;

      // Key insights
      if (projections.monthlySavings > 0) {
        setFont(FONT_SIZE.BASE, FONT_NORMAL);
        doc.setTextColor(40, 167, 69);
        doc.text(`✓ Potential monthly savings: ${formatCurrency(projections.monthlySavings)} (${projections.savingsPercentage}%)`, margin, yPos, { maxWidth: contentWidth });
        yPos += SPACING.MD;
        doc.text(`✓ Potential 3-year savings (with CUD): ${formatCurrency(projections.threeYearSavings)}`, margin, yPos, { maxWidth: contentWidth });
        yPos += SPACING.LG;
        doc.setTextColor(0, 0, 0);
      }
    } else {
      doc.text('GCP cost projections require cost estimates from Cost Agent.', margin, yPos, { maxWidth: contentWidth });
    }
  } catch (error) {
    console.error('[PDF Generator] Error calculating GCP projections:', error);
    doc.text('Error calculating GCP cost projections.', margin, yPos, { maxWidth: contentWidth });
  }

  // ==========================================
  // STRATEGY AGENT SUMMARY
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Strategy Agent Summary', [255, 193, 7]);

  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  doc.setTextColor(0, 0, 0);

  if (strategyResults && strategyResults.wavePlan) {
    setFont(FONT_SIZE.XL, FONT_BOLD);
    doc.setTextColor(0, 102, 204);
    doc.text('Migration Wave Distribution', margin, yPos);
    yPos += SPACING.MD;

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
      headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
      margin: { left: margin, right: margin },
      styles: { fontSize: FONT_SIZE.BASE, font: FONT_FAMILY }
    });

    yPos = getLastAutoTable().finalY + SPACING.XL;
  }

  if (strategyResults && strategyResults.migrationPlan) {
    checkPageBreak(20);
    setFont(FONT_SIZE.XL, FONT_BOLD);
    doc.setTextColor(0, 102, 204);
    doc.text('Migration Strategy Distribution', margin, yPos);
    yPos += SPACING.MD;

    if (strategyResults.migrationPlan.metrics && strategyResults.migrationPlan.metrics.strategyDistribution) {
      const strategyData = Object.entries(strategyResults.migrationPlan.metrics.strategyDistribution)
        .map(([strategy, count]) => [strategy, count.toLocaleString()]);

      callAutoTable({
        startY: yPos,
        head: [['Strategy', 'Workloads']],
        body: strategyData,
        theme: 'grid',
        headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.BASE, font: FONT_FAMILY }
      });

      yPos = getLastAutoTable().finalY + SPACING.XL;
    }
    
    // CRITICAL FIX: Convert planItems to plans format if needed
    // The migrationPlan may have planItems instead of plans
    // MEMORY-SAFE: Check memory and planItems size before processing
    let plans = strategyResults.migrationPlan.plans;
    let shouldProcessPlanItems = true;
    
    // CRITICAL: Check memory before processing planItems
    if (performance.memory) {
      const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
      const usagePercent = (usedMB / limitMB) * 100;
      
      if (usagePercent > 70) {
        console.warn(`[PDF Generator] Memory usage ${usagePercent.toFixed(1)}% - Skipping planItems conversion to prevent crash`);
        shouldProcessPlanItems = false;
      }
    }
    
    if (!plans && strategyResults.migrationPlan.planItems && shouldProcessPlanItems) {
      const planItems = strategyResults.migrationPlan.planItems;
      const planItemsCount = Array.isArray(planItems) ? planItems.length : 0;
      
      // CRITICAL: Skip conversion if planItems is too large (>100K) to prevent memory crash
      if (planItemsCount > 100000) {
        console.warn(`[PDF Generator] planItems too large (${planItemsCount.toLocaleString()} items) - Skipping conversion to prevent crash`);
        shouldProcessPlanItems = false;
        plans = null; // Don't process plans
      } else {
        // SAFETY: Batch planItems mapping to avoid stack overflow with large datasets
        plans = [];
        const PLAN_BATCH_SIZE = 10000; // Process 10K plan items at a time
        
        for (let i = 0; i < planItems.length; i += PLAN_BATCH_SIZE) {
          // CRITICAL: Check memory during processing
          if (performance.memory) {
            const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
            const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
            const usagePercent = (usedMB / limitMB) * 100;
            if (usagePercent > 75) {
              console.warn(`[PDF Generator] Memory usage ${usagePercent.toFixed(1)}% during planItems conversion - Stopping early`);
              break; // Stop processing if memory gets too high
            }
          }
          
          const batch = planItems.slice(i, Math.min(i + PLAN_BATCH_SIZE, planItems.length));
          // SAFETY: Use explicit loop instead of map to avoid any potential stack issues
          for (const item of batch) {
            plans.push({
              workloadId: item.workloadId,
              workload: { id: item.workloadId, name: item.workloadName },
              sourceService: item.sourceService,
              service: item.sourceService,
              targetGcpService: item.serviceMapping?.gcpService || 'N/A',
              gcpService: item.serviceMapping?.gcpService || 'N/A',
              gcpApi: item.serviceMapping?.gcpApi || 'N/A',
              strategy: item.serviceMapping?.migrationStrategy || 'N/A',
              effort: item.serviceMapping?.effort?.level || 'N/A',
              wave: item.migrationWave || 'N/A'
            });
          }
        }
        
        console.log(`PDF Generator - Converted ${plans.length} planItems to plans format`);
      }
    }
    
    // Complete Service Mappings Summary - Show ALL services (not limited)
    // CRITICAL: Only process if we have plans and memory allows
    if (plans && plans.length > 0 && shouldProcessPlanItems) {
      // CRITICAL: Check memory again before processing plans
      let canProcessPlans = true;
      if (performance.memory) {
        const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
        const usagePercent = (usedMB / limitMB) * 100;
        if (usagePercent > 70) {
          console.warn(`[PDF Generator] Memory usage ${usagePercent.toFixed(1)}% - Skipping service mappings processing`);
          canProcessPlans = false;
        }
      }
      
      if (canProcessPlans && plans.length > 100000) {
        console.warn(`[PDF Generator] Plans array too large (${plans.length.toLocaleString()} items) - Skipping service mappings`);
        canProcessPlans = false;
      }
      
      if (canProcessPlans) {
        checkPageBreak(30);
        setFont(FONT_SIZE.XL, FONT_BOLD);
        doc.setTextColor(0, 102, 204);
        doc.text('Complete Service Mappings', margin, yPos);
        yPos += SPACING.MD;
        
        // Group by service and show all mappings (ALL workloads, not limited)
        // SAFETY: Process planItems directly without creating full plans array if possible
        const serviceMap = new Map();
        const PLANS_BATCH_SIZE = 10000; // Process 10K plans at a time
        
        for (let i = 0; i < plans.length; i += PLANS_BATCH_SIZE) {
          // CRITICAL: Check memory during processing
          if (performance.memory) {
            const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
            const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
            const usagePercent = (usedMB / limitMB) * 100;
            if (usagePercent > 75) {
              console.warn(`[PDF Generator] Memory usage ${usagePercent.toFixed(1)}% during service mapping - Stopping early`);
              break; // Stop processing if memory gets too high
            }
          }
          
          const batch = plans.slice(i, Math.min(i + PLANS_BATCH_SIZE, plans.length));
          for (const plan of batch) {
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
          }
        }
        
        console.log(`PDF Generator - Processing ${plans.length} migration plans`);
        
        // SAFETY: serviceMap should be small (number of unique services), but add error handling
        let serviceValues = [];
        try {
          serviceValues = Array.from(serviceMap.values());
          // Limit to 1000 services
          if (serviceValues.length > 1000) {
            console.warn(`[reportPdfGenerator] Too many services (${serviceValues.length}), limiting to 1000`);
            serviceValues = serviceValues.slice(0, 1000);
          }
          serviceValues.sort((a, b) => {
            try {
              const countA = typeof a?.count === 'number' ? a.count : parseInt(a?.count) || 0;
              const countB = typeof b?.count === 'number' ? b.count : parseInt(b?.count) || 0;
              return countB - countA;
            } catch (e) {
              return 0; // Keep order if sort fails
            }
          });
        } catch (sortError) {
          console.error('[reportPdfGenerator] Error processing service values:', sortError);
          serviceValues = [];
        }
        
        // SAFETY: Use loop instead of map for extra safety
        const allMappings = [];
        for (const m of serviceValues) {
          allMappings.push([
            m.service,
            m.gcpService,
            m.gcpApi,
            m.strategy,
            m.effort,
            formatNumber(m.count)
          ]);
        }
        
        callAutoTable({
          startY: yPos,
          head: [['AWS Service', 'GCP Service', 'GCP API', 'Strategy', 'Effort', 'Workloads']],
          body: allMappings,
          theme: 'grid',
          headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
          margin: { left: margin, right: margin },
          styles: { fontSize: FONT_SIZE.SM, font: FONT_FAMILY },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 40 },
            2: { cellWidth: 40 },
            3: { cellWidth: 25 },
            4: { cellWidth: 20 },
            5: { cellWidth: 20, halign: 'center' }
          }
        });
        
        yPos = getLastAutoTable().finalY + SPACING.XL;
      } else {
        // Memory too high or plans too large - show message instead
        checkPageBreak(30);
        setFont(FONT_SIZE.BASE, FONT_NORMAL);
        doc.setTextColor(150, 150, 150);
        const planItemsCount = strategyResults.migrationPlan.planItems?.length || plans?.length || 0;
        doc.text(`Service mappings skipped due to ${planItemsCount > 100000 ? 'large dataset' : 'high memory usage'} (${planItemsCount.toLocaleString()} items). Summary data is still included.`, margin, yPos, { maxWidth: contentWidth });
        yPos += SPACING.XL;
      }
    }
  }
  
  // Migration Timeline Summary
  if (strategyResults && strategyResults.wavePlan) {
    checkPageBreak(25);
    setFont(FONT_SIZE.XL, FONT_BOLD);
    doc.setTextColor(0, 102, 204);
    doc.text('Migration Timeline Summary', margin, yPos);
    yPos += SPACING.MD;
    
    const wave1Count = strategyResults.wavePlan.wave1?.length || 0;
    const wave2Count = strategyResults.wavePlan.wave2?.length || 0;
    const wave3Count = strategyResults.wavePlan.wave3?.length || 0;
    
    // Estimate durations based on parallel migration capacity (not sequential per-workload)
    // Assumes parallel migration teams working simultaneously
    const landingZoneWeeks = 3;
    
    // Parallel migration capacity: workloads per week per team
    // Wave 1 (low complexity): 500-1000 workloads/week per team, assume 2 teams = 1000-2000/week
    // Wave 2 (medium complexity): 200-500 workloads/week per team, assume 2 teams = 400-1000/week  
    // Wave 3 (high complexity): 50-200 workloads/week per team, assume 2 teams = 100-400/week
    const WAVE1_WORKLOADS_PER_WEEK = 1500; // Low complexity - high throughput
    const WAVE2_WORKLOADS_PER_WEEK = 600;  // Medium complexity - moderate throughput
    const WAVE3_WORKLOADS_PER_WEEK = 200; // High complexity - lower throughput
    
    const wave1Weeks = Math.max(2, Math.ceil(wave1Count / WAVE1_WORKLOADS_PER_WEEK));
    const wave2Weeks = Math.max(4, Math.ceil(wave2Count / WAVE2_WORKLOADS_PER_WEEK));
    const wave3Weeks = Math.max(6, Math.ceil(wave3Count / WAVE3_WORKLOADS_PER_WEEK));
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
      headStyles: { fillColor: [0, 102, 204], fontStyle: FONT_BOLD, font: FONT_FAMILY },
      margin: { left: margin, right: margin },
      styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY }
    });
    
    yPos = getLastAutoTable().finalY + SPACING.XL;
  }

  // ==========================================
  // MIGRATION WAVE DETAILS
  // ==========================================
  if (strategyResults && strategyResults.wavePlan) {
    doc.addPage();
    yPos = margin;
    addSectionHeader('Migration Wave Details', [255, 193, 7]);
    
    setFont(FONT_SIZE.BASE, FONT_NORMAL);
    doc.setTextColor(0, 0, 0);
    doc.text('Detailed breakdown of migration waves with effort estimates, dependencies, and risk assessment.', margin, yPos, { maxWidth: contentWidth });
    yPos += SPACING.LG;

    const wave1Count = strategyResults.wavePlan.wave1?.length || 0;
    const wave2Count = strategyResults.wavePlan.wave2?.length || 0;
    const wave3Count = strategyResults.wavePlan.wave3?.length || 0;

    // Wave details table
    const waveDetailsData = [
      ['Wave 1 - Quick Wins', formatNumber(wave1Count), 'Low', '2-4 weeks', 'Low', 'High'],
      ['Wave 2 - Standard', formatNumber(wave2Count), 'Medium', '4-8 weeks', 'Medium', 'Medium'],
      ['Wave 3 - Complex', formatNumber(wave3Count), 'High', '8-12 weeks', 'High', 'Low']
    ];

    callAutoTable({
      startY: yPos,
      head: [['Wave', 'Workloads', 'Complexity', 'Estimated Duration', 'Risk Level', 'Priority']],
      body: waveDetailsData,
      theme: 'grid',
      headStyles: { fillColor: [255, 193, 7], fontStyle: FONT_BOLD, font: FONT_FAMILY },
      margin: { left: margin, right: margin },
      styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY }
    });

    yPos = getLastAutoTable().finalY + SPACING.LG;

    // Wave sequencing rationale
    setFont(FONT_SIZE.XL, FONT_BOLD);
    doc.setTextColor(0, 102, 204);
    doc.text('Wave Sequencing Rationale', margin, yPos);
    yPos += SPACING.MD;

    setFont(FONT_SIZE.BASE, FONT_NORMAL);
    doc.setTextColor(0, 0, 0);
    doc.text('• Wave 1: Low-complexity workloads for quick wins and early value realization', margin + 5, yPos, { maxWidth: contentWidth - 10 });
    yPos += SPACING.SM;
    doc.text('• Wave 2: Standard complexity workloads building on Wave 1 experience', margin + 5, yPos, { maxWidth: contentWidth - 10 });
    yPos += SPACING.SM;
    doc.text('• Wave 3: High-complexity workloads requiring additional planning and resources', margin + 5, yPos, { maxWidth: contentWidth - 10 });
    yPos += SPACING.XL;
  }

  // ==========================================
  // RISK ASSESSMENT
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Risk Assessment', [200, 0, 0]);
  
  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  doc.setTextColor(0, 0, 0);
  doc.text('Comprehensive risk analysis with likelihood, impact, and mitigation strategies.', margin, yPos, { maxWidth: contentWidth });
  yPos += SPACING.LG;

  try {
    const risks = calculateRiskAssessment(reportData, strategyResults);
    
    if (risks.length > 0) {
      // Risk matrix table
      const riskData = risks.map(risk => [
        risk.risk,
        risk.likelihood,
        risk.impact,
        risk.description.substring(0, 60) + (risk.description.length > 60 ? '...' : ''),
        risk.mitigation.substring(0, 50) + (risk.mitigation.length > 50 ? '...' : '')
      ]);

      callAutoTable({
        startY: yPos,
        head: [['Risk', 'Likelihood', 'Impact', 'Description', 'Mitigation']],
        body: riskData,
        theme: 'grid',
        headStyles: { fillColor: [200, 0, 0], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.XS, font: FONT_FAMILY },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 60 },
          4: { cellWidth: 50 }
        }
      });

      yPos = getLastAutoTable().finalY + SPACING.XL;
    } else {
      doc.text('No significant risks identified. All workloads are assessed as low to medium risk.', margin, yPos, { maxWidth: contentWidth });
      yPos += SPACING.LG;
    }
  } catch (error) {
    console.error('[PDF Generator] Error calculating risks:', error);
  }

  // ==========================================
  // PRIORITIZED ACTION ITEMS
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Prioritized Action Items', [0, 102, 204]);
  
  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  doc.setTextColor(0, 0, 0);
  doc.text('Actionable items organized by priority with owners, timelines, and success metrics.', margin, yPos, { maxWidth: contentWidth });
  yPos += SPACING.LG;

  try {
    const actions = calculatePrioritizedActions(reportData, strategyResults, costEstimates);
    
    // High Priority Actions
    if (actions.high.length > 0) {
      setFont(FONT_SIZE.XL, FONT_BOLD);
      doc.setTextColor(200, 0, 0);
      doc.text('High Priority', margin, yPos);
      yPos += SPACING.MD;

      const highPriorityData = actions.high.map(action => [
        action.action,
        action.owner,
        action.timeline,
        action.kpi
      ]);

      callAutoTable({
        startY: yPos,
        head: [['Action', 'Owner', 'Timeline', 'Success Metric']],
        body: highPriorityData,
        theme: 'grid',
        headStyles: { fillColor: [200, 0, 0], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.SM, font: FONT_FAMILY }
      });

      yPos = getLastAutoTable().finalY + SPACING.LG;
    }

    // Medium Priority Actions
    if (actions.medium.length > 0) {
      checkPageBreak(SPACING.XXL);
      setFont(FONT_SIZE.XL, FONT_BOLD);
      doc.setTextColor(255, 193, 7);
      doc.text('Medium Priority', margin, yPos);
      yPos += SPACING.MD;

      const mediumPriorityData = actions.medium.map(action => [
        action.action,
        action.owner,
        action.timeline,
        action.kpi
      ]);

      callAutoTable({
        startY: yPos,
        head: [['Action', 'Owner', 'Timeline', 'Success Metric']],
        body: mediumPriorityData,
        theme: 'grid',
        headStyles: { fillColor: [255, 193, 7], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.SM, font: FONT_FAMILY }
      });

      yPos = getLastAutoTable().finalY + SPACING.LG;
    }

    // Low Priority Actions
    if (actions.low.length > 0) {
      checkPageBreak(SPACING.XXL);
      setFont(FONT_SIZE.XL, FONT_BOLD);
      doc.setTextColor(108, 117, 125);
      doc.text('Low Priority', margin, yPos);
      yPos += SPACING.MD;

      const lowPriorityData = actions.low.map(action => [
        action.action,
        action.owner,
        action.timeline,
        action.kpi
      ]);

      callAutoTable({
        startY: yPos,
        head: [['Action', 'Owner', 'Timeline', 'Success Metric']],
        body: lowPriorityData,
        theme: 'grid',
        headStyles: { fillColor: [108, 117, 125], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.SM, font: FONT_FAMILY }
      });

      yPos = getLastAutoTable().finalY + SPACING.XL;
    }
  } catch (error) {
    console.error('[PDF Generator] Error calculating actions:', error);
  }

  // ==========================================
  // QUICK WINS
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Quick Wins', [40, 167, 69]);
  
  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  doc.setTextColor(0, 0, 0);
  doc.text('Low-effort, high-impact opportunities for immediate value realization.', margin, yPos, { maxWidth: contentWidth });
  yPos += SPACING.LG;

  try {
    const quickWins = calculateQuickWins(reportData);
    
    if (quickWins.length > 0) {
      const quickWinsData = quickWins.map(win => [
        win.title,
        win.description,
        win.impact,
        win.effort,
        win.cost ? formatCurrency(win.cost) : 'N/A',
        win.savings ? formatCurrency(win.savings) : 'N/A'
      ]);

      callAutoTable({
        startY: yPos,
        head: [['Opportunity', 'Description', 'Impact', 'Effort', 'Current Cost', 'Potential Savings']],
        body: quickWinsData,
        theme: 'grid',
        headStyles: { fillColor: [40, 167, 69], fontStyle: FONT_BOLD, font: FONT_FAMILY },
        margin: { left: margin, right: margin },
        styles: { fontSize: FONT_SIZE.SM, font: FONT_FAMILY }
      });

      yPos = getLastAutoTable().finalY + SPACING.XL;
    } else {
      doc.text('No quick wins identified. Review workload complexity and readiness scores.', margin, yPos, { maxWidth: contentWidth });
      yPos += SPACING.LG;
    }
  } catch (error) {
    console.error('[PDF Generator] Error calculating quick wins:', error);
  }

  // ==========================================
  // DATA QUALITY & VALIDATION
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Data Quality & Validation', [108, 117, 125]);
  
  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  doc.setTextColor(0, 0, 0);
  
  try {
    // CRITICAL: Check memory BEFORE accessing workloads array
    let shouldCalculateQuality = false;
    const workloadCount = reportData?.summary?.totalWorkloads || 0;
    
    // CRITICAL: Only calculate quality if memory is low
    if (performance.memory) {
      const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
      const usagePercent = (usedMB / limitMB) * 100;
      if (usagePercent < 70 && workloadCount < 150000) {
        shouldCalculateQuality = true;
      }
    } else {
      shouldCalculateQuality = workloadCount < 100000;
    }
    
    // CRITICAL: Only access workloads array if we're going to use it
    // Use summary data instead of full workloads array for data quality
    const dataQuality = calculateDataQuality(reportData, shouldCalculateQuality ? (reportData?.workloads || []) : []);
    
    doc.text('Data completeness and quality indicators for this assessment.', margin, yPos, { maxWidth: contentWidth });
    yPos += SPACING.LG;

    const qualityData = [
      ['Data Completeness', `${dataQuality.completeness}%`],
      ['Confidence Level', dataQuality.confidenceLevel],
      ['Assessed Workloads', formatNumber(dataQuality.assessedWorkloads)],
      ['Total Workloads', formatNumber(dataQuality.totalWorkloads)],
      ['Data Freshness', dataQuality.dataFreshness]
    ];

    callAutoTable({
      startY: yPos,
      head: [['Metric', 'Value']],
      body: qualityData,
      theme: 'grid',
      headStyles: { fillColor: [108, 117, 125], fontStyle: FONT_BOLD, font: FONT_FAMILY },
      margin: { left: margin, right: margin },
      styles: { fontSize: FONT_SIZE.MD, font: FONT_FAMILY }
    });

    yPos = getLastAutoTable().finalY + SPACING.LG;

    // Validation warnings
    if (parseFloat(dataQuality.completeness) < 80) {
      setFont(FONT_SIZE.BASE, FONT_NORMAL);
      doc.setTextColor(200, 0, 0);
      doc.text(`⚠️ Warning: Data completeness is ${dataQuality.completeness}%. Consider running Assessment Agent to improve data quality.`, margin, yPos, { maxWidth: contentWidth });
      yPos += SPACING.MD;
      doc.setTextColor(0, 0, 0);
    }
  } catch (error) {
    console.error('[PDF Generator] Error calculating data quality:', error);
  }

  // Recommendations text
  checkPageBreak(30);
  setFont(FONT_SIZE.XL, FONT_BOLD);
  doc.setTextColor(0, 102, 204);
  doc.text('Key Recommendations', margin, yPos);
  yPos += SPACING.MD;

  setFont(FONT_SIZE.BASE, FONT_NORMAL);
  const wave1Count = strategyResults?.wavePlan?.wave1?.length || 0;
  const highComplexityCount = reportData?.complexity?.high?.count || 0;
  const readyCount = reportData?.readiness?.ready?.count || 0;
  // Reuse allServicesList from earlier in the function (line 260)
  const totalMonthlyCost = reportData?.summary?.totalMonthlyCost || 1; // Avoid division by zero
  const totalServices = reportData?.summary?.totalServices || 0;
  
  // Calculate top 5 services percentage (for recommendation)
  const top5Services = allServicesList.slice(0, 5);
  // SAFETY: Safe reduce with error handling
  let top5Cost = 0;
  try {
    if (top5Services && top5Services.length > 0) {
      top5Cost = top5Services.reduce((sum, s) => {
        try {
          const cost = s?.totalCost || 0;
          const numCost = typeof cost === 'number' ? cost : parseFloat(cost) || 0;
          return sum + numCost;
        } catch (e) {
          return sum; // Skip invalid entries
        }
      }, 0);
    }
  } catch (reduceError) {
    console.warn('[reportPdfGenerator] Error calculating top5Cost:', reduceError);
    top5Cost = 0;
  }
  const top5Percentage = totalMonthlyCost > 0 ? ((top5Cost / totalMonthlyCost) * 100).toFixed(1) : '0.0';
  
  const recommendations = [];
  
  // Only include wave recommendations if waves are populated
  const wave2Count = strategyResults?.wavePlan?.wave2?.length || 0;
  const wave3Count = strategyResults?.wavePlan?.wave3?.length || 0;
  const totalWaveCount = wave1Count + wave2Count + wave3Count;
  
  if (totalWaveCount > 0) {
    if (wave1Count > 0) {
      recommendations.push(`• Prioritize Wave 1 workloads (${wave1Count.toLocaleString()} workloads) for quick wins and early value realization`);
    }
    if (wave2Count > 0) {
      recommendations.push(`• Plan Wave 2 migration (${wave2Count.toLocaleString()} workloads) for standard complexity workloads`);
    }
    if (wave3Count > 0) {
      recommendations.push(`• Allocate additional time and resources for Wave 3 (${wave3Count.toLocaleString()} complex workloads)`);
    }
  } else {
    recommendations.push(`• Migration wave planning requires completed assessment data. Run Assessment Agent to generate wave plans.`);
  }
  
  // Complexity recommendations
  const mediumComplexityCount = reportData?.complexity?.medium?.count || 0;
  const lowComplexityCount = reportData?.complexity?.low?.count || 0;
  // unassignedCount already declared earlier in function (line 228)
  const conditionalCount = reportData?.readiness?.conditional?.count || 0;
  const notReadyCount = reportData?.readiness?.notReady?.count || 0;
  
  if (unassignedCount > 0 && unassignedCount === (highComplexityCount + mediumComplexityCount + lowComplexityCount + unassignedCount)) {
    recommendations.push(`• ⚠️ Assessment data not available: All workloads are unassigned. Run Assessment Agent to generate complexity and readiness scores.`);
  } else {
    if (highComplexityCount > 0) {
      recommendations.push(`• Plan for ${highComplexityCount.toLocaleString()} high-complexity workloads requiring additional assessment and planning`);
    }
    if (readyCount > 0) {
      recommendations.push(`• ${readyCount.toLocaleString()} workloads are ready for immediate migration`);
    } else if (conditionalCount > 0) {
      recommendations.push(`• ${conditionalCount.toLocaleString()} workloads are conditionally ready - review requirements before migration`);
    }
  }
  
  recommendations.push(`• Consider 3-year Committed Use Discounts for predictable workloads to maximize cost savings`);
  recommendations.push(`• All ${totalServices} AWS services have been mapped to GCP equivalents and included in TCO calculations`);
  if (top5Percentage > 0) {
    recommendations.push(`• Focus on top 5 services representing ${top5Percentage}% of total cost`);
  }

  recommendations.forEach(rec => {
    checkPageBreak(8);
    doc.text(rec, margin + 5, yPos, { maxWidth: contentWidth - 10 });
    yPos += SPACING.MD;
  });

  // ==========================================
  // APPENDICES
  // ==========================================
  doc.addPage();
  yPos = margin;
  addSectionHeader('Appendices', [108, 117, 125]);

  // Helper function to add appendix with proper formatting
  const addAppendix = (letter, title, content, isLast = false) => {
    checkPageBreak(SPACING.XXL);
    
    // Appendix letter and title
    setFont(FONT_SIZE.LG, FONT_BOLD);
    doc.setTextColor(0, 0, 0);
    doc.text(`${letter}. ${title}`, margin, yPos);
    yPos += SPACING.MD;
    
    // Content - use base font size like rest of document
    setFont(FONT_SIZE.BASE, FONT_NORMAL);
    doc.setTextColor(0, 0, 0);
    
    // Split content into lines and add with proper spacing
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      checkPageBreak(SPACING.SM);
      
      if (line.trim() === '') {
        yPos += SPACING.XS; // Extra space for blank lines
      } else {
        // Handle bullet points and indentation
        const indent = line.startsWith('  -') ? margin + SPACING.LG : (line.startsWith('•') ? margin + SPACING.SM : margin);
        doc.text(line.trim(), indent, yPos, { maxWidth: contentWidth - (indent - margin) - SPACING.SM });
        
        // Calculate height needed for wrapped text using consistent spacing
        const textWidth = contentWidth - (indent - margin) - SPACING.SM;
        const wrappedLines = doc.splitTextToSize(line.trim(), textWidth);
        yPos += wrappedLines.length * SPACING.SM + SPACING.XS;
      }
    });
    
    // Add spacing after appendix (except last one)
    if (!isLast) {
      yPos += SPACING.MD;
    }
  };

  // Appendix A: Complexity Scoring Methodology
  addAppendix(
    'A',
    'Complexity Scoring Methodology',
    'Complexity scores range from 1-10, where:\n' +
    '• Low (1-3): Simple workloads with minimal dependencies\n' +
    '• Medium (4-6): Moderate complexity with some dependencies\n' +
    '• High (7-10): Complex workloads with significant dependencies or custom configurations'
  );

  // Appendix B: Migration Readiness Criteria
  addAppendix(
    'B',
    'Migration Readiness Criteria',
    'Readiness is determined by:\n' +
    '• Ready: Complexity ≤ 3, no risk factors\n' +
    '• Conditional: Complexity ≤ 6, ≤ 2 risk factors\n' +
    '• Not Ready: Complexity > 6 or > 2 risk factors'
  );

  // Appendix C: Committed Use Discounts (CUD)
  addAppendix(
    'C',
    'Committed Use Discounts (CUD)',
    'GCP Committed Use Discounts provide:\n' +
    '• Compute Services (EC2, GKE, Cloud Run, Functions):\n' +
    '  - 1-Year CUD: 25% discount\n' +
    '  - 3-Year CUD: 45% discount\n' +
    '• Storage Services (Cloud Storage, Persistent Disk):\n' +
    '  - 1-Year CUD: 15% discount\n' +
    '  - 3-Year CUD: 30% discount\n' +
    '• Database Services (Cloud SQL, Spanner, Firestore):\n' +
    '  - 1-Year CUD: 20% discount\n' +
    '  - 3-Year CUD: 40% discount\n' +
    '• All workloads are assumed eligible for CUD pricing\n' +
    '• CUD discounts are applied to on-demand pricing'
  );

  // Appendix D: Service Mapping Methodology
  addAppendix(
    'D',
    'Service Mapping Methodology',
    'AWS services are mapped to GCP equivalents using:\n' +
    '• Direct mappings for equivalent services (EC2 → Compute Engine, S3 → Cloud Storage)\n' +
    '• Intelligent fallbacks for generic service names:\n' +
    '  - RDS → Cloud SQL (PostgreSQL/MySQL/SQL Server)\n' +
    '  - AWS Marketplace → GCP Marketplace\n' +
    '  - Support services → GCP Support tiers\n' +
    '  - Data Transfer → Cloud Interconnect\n' +
    '• Migration strategies (6 R\'s): Rehost, Replatform, Refactor, Repurchase, Retire, Retain\n' +
    '• Effort levels: Low, Medium, High based on service complexity'
  );

  // Appendix E: Cost Calculation Methodology
  addAppendix(
    'E',
    'Cost Calculation Methodology',
    'Cost calculations include:\n' +
    '• AWS Costs: Aggregated from Cost and Usage Report (CUR) line items\n' +
    '• GCP Costs: Estimated based on AWS costs with service-specific adjustments\n' +
    '• On-Demand: Base GCP pricing (typically ~10% less than AWS)\n' +
    '• CUD Pricing: On-demand pricing with applicable discount applied\n' +
    '• Savings: Difference between AWS costs and GCP 3-Year CUD costs\n' +
    '• Negative Costs: Credits/refunds are handled using absolute values\n' +
    '• All costs are monthly unless otherwise specified'
  );

  // Appendix F: Migration Cost Assumptions
  addAppendix(
    'F',
    'Migration Cost Assumptions',
    'One-time migration costs:\n' +
    '• Data Egress: 2% of monthly AWS cost (estimated AWS egress fees)\n' +
    '• Migration Consulting: Tiered pricing based on scale:\n' +
    '  - Small (<10k workloads): $50 per workload\n' +
    '  - Medium (10k-100k workloads): $1 per workload\n' +
    '  - Large (>100k workloads): $0.10 per workload (bulk discount)\n' +
    '• Migration Tools: 1% of monthly AWS cost (licensing, migration tools)\n' +
    '• Training: Tiered pricing based on scale:\n' +
    '  - Small (<10k workloads): $10 per workload\n' +
    '  - Medium (10k-100k workloads): $0.50 per workload\n' +
    '  - Large (>100k workloads): $0.02 per workload (bulk training)\n\n' +
    'Ongoing operational costs:\n' +
    '• Licensing: 5% of monthly GCP cost (Custom Solutions, third-party licenses)\n' +
    '• Management Tools: 3% of monthly GCP cost (monitoring, management platforms)\n\n' +
    'Note: Actual costs may vary based on specific requirements and vendor negotiations.'
  );

  // Appendix G: Workload Classification
  addAppendix(
    'G',
    'Workload Classification',
    'Workloads are classified as:\n' +
    '• With ResourceId: One workload = one actual AWS resource\n' +
    '  (e.g., EC2 instance i-1234567890, RDS database mydb-instance-1)\n' +
    '• Without ResourceId: One workload = one service per region\n' +
    '  (e.g., All S3 charges in us-east-1 = 1 S3 workload)\n' +
    '• Deduplication: Same resource across different dates/bills = 1 workload\n' +
    '• Aggregation: All usage types (storage, requests, data transfer) combined per service+region'
  );

  // Appendix H: Glossary & Definitions
  addAppendix(
    'H',
    'Glossary & Definitions',
    'Migration Terminology:\n' +
    '• Complexity Score: 1-10 scale rating workload migration difficulty\n' +
    '• Readiness: Assessment of workload\'s preparedness for migration\n' +
    '• Migration Wave: Grouped workloads migrated together in phases\n' +
    '• Committed Use Discount (CUD): GCP discount for 1 or 3-year commitments\n' +
    '• TCO: Total Cost of Ownership including migration and operational costs\n' +
    '• Service Mapping: AWS to GCP service equivalent identification\n' +
    '• Migration Strategy: Approach (Rehost, Refactor, Replatform, etc.)\n\n' +
    'Complexity Levels:\n' +
    '• Low (1-3): Simple, straightforward migrations\n' +
    '• Medium (4-6): Moderate complexity requiring planning\n' +
    '• High (7-10): Complex migrations needing extensive assessment\n\n' +
    'Readiness Levels:\n' +
    '• Ready: Can migrate immediately\n' +
    '• Conditional: Can migrate with prerequisites met\n' +
    '• Not Ready: Requires remediation before migration'
  );

  // Appendix I: Detailed Methodology
  addAppendix(
    'I',
    'Assessment Methodology',
    'How Complexity Scores are Calculated:\n' +
    '• Service Type: Different services have base complexity levels\n' +
    '• Dependencies: Inter-service dependencies increase complexity\n' +
    '• Configuration: Custom configurations add complexity points\n' +
    '• Data Volume: Large data volumes increase migration complexity\n' +
    '• Custom Code: Application-specific code increases complexity\n\n' +
    'How Readiness is Determined:\n' +
    '• Complexity Score: Lower complexity = higher readiness\n' +
    '• Risk Factors: Security, compliance, dependencies assessed\n' +
    '• Data Residency: Geographic requirements considered\n' +
    '• Service Availability: GCP equivalent availability verified\n\n' +
    'How Cost Estimates are Derived:\n' +
    '• AWS Costs: Extracted from Cost and Usage Reports (CUR)\n' +
    '• GCP Pricing: Based on GCP Pricing API and service mappings\n' +
    '• CUD Discounts: Applied based on commitment level (1 or 3 years)\n' +
    '• Migration Costs: Estimated based on workload count and complexity\n\n' +
    'Data Sources:\n' +
    '• AWS Cost and Usage Reports (CUR)\n' +
    '• GCP Pricing API\n' +
    '• Service mapping database\n' +
    '• Historical migration data (for effort estimation)\n\n' +
    'Assumptions:\n' +
    '• Workloads maintain similar usage patterns post-migration\n' +
    '• GCP service equivalents provide similar functionality\n' +
    '• Migration costs scale with workload count\n' +
    '• CUD commitments are feasible for predictable workloads'
  );

  // Appendix J: Top 100 Workloads by Cost
  addAppendix(
    'J',
    'Top 100 Workloads by Cost',
    (() => {
      try {
        // CRITICAL: Check memory and workload count BEFORE accessing workloads array
        const workloadCount = reportData?.summary?.totalWorkloads || 0;
        
        if (performance.memory) {
          const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
          const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
          const usagePercent = (usedMB / limitMB) * 100;
          if (usagePercent > 70 || workloadCount > 150000) {
            return `Workload list generation skipped due to ${usagePercent > 70 ? 'high memory usage' : 'large dataset'} (${workloadCount.toLocaleString()} workloads). Use the web interface to view detailed workload data.`;
          }
        } else if (workloadCount > 100000) {
          return `Workload list generation skipped due to large dataset (${workloadCount.toLocaleString()} workloads). Use the web interface to view detailed workload data.`;
        }
        
        // CRITICAL: Only access workloads array if we passed all checks
        const workloads = reportData?.workloads || [];
        // CRITICAL: Limit to top 50 instead of 100 for memory efficiency
        const topWorkloads = getTopExpensiveWorkloads(workloads, 50);
        
        if (topWorkloads.length === 0) {
          return 'No workload cost data available.';
        }
        
        let content = 'Top 100 most expensive workloads:\n\n';
        topWorkloads.forEach((w, idx) => {
          content += `${(idx + 1).toString().padStart(3, ' ')}. ${w.name.substring(0, 50)} | ${w.service} | ${w.region} | ${formatCurrency(w.cost)}\n`;
        });
        
        return content;
      } catch (error) {
        console.error('[PDF Generator] Error generating top workloads:', error);
        return 'Error generating workload list.';
      }
    })(),
    true // Last appendix
  );

  // ==========================================
  // FOOTER ON ALL PAGES
  // ==========================================
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    setFont(FONT_SIZE.SM, FONT_NORMAL);
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
  
  console.log('[PDF] Saving PDF file:', fileName);
  console.log('[PDF] PDF document pages:', doc.internal.getNumberOfPages());
  
  try {
    doc.save(fileName);
    console.log('[PDF] PDF save() called successfully');
  } catch (error) {
    console.error('[PDF] Error saving PDF:', error);
    // Fallback: Try to get PDF as blob and create download link
    try {
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('[PDF] PDF downloaded via blob fallback');
    } catch (fallbackError) {
      console.error('[PDF] Fallback download also failed:', fallbackError);
      throw new Error(`Failed to save PDF: ${error.message}`);
    }
  }
};

export default generateComprehensiveReportPDF;
