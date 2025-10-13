import jsPDF from 'jspdf';
import 'jspdf-autotable';
import AdvancedAnalytics from './advancedAnalytics';
import CloudPricingAPI from './cloudPricingAPI';

export const generateMigrationReport = (data) => {
  const doc = new jsPDF();
  const {
    projectName = 'Cloud Migration Project',
    workloads = [],
    tco = {},
    roi = {},
    timeframe = 36,
    landingZoneConfig = null,
  } = data;

  let yPos = 20;

  // Enhanced Title Page
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('Cloud Migration TCO Analysis Report', 105, yPos, { align: 'center' });

  yPos += 10;
  doc.setFontSize(16);
  doc.setTextColor(100, 100, 100);
  doc.text(projectName, 105, yPos, { align: 'center' });

  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`Analysis Period: ${timeframe} months (${(timeframe / 12).toFixed(1)} years)`, 105, yPos, { align: 'center' });

  yPos += 5;
  doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, yPos, { align: 'center' });

  yPos += 20;

  // Enhanced Executive Summary
  doc.setFontSize(16);
  doc.setTextColor(0, 102, 204); // Searce Blue
  doc.text('Executive Summary', 20, yPos);
  yPos += 12;

  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);

  const bestCloud = roi.gcp >= roi.aws && roi.gcp >= roi.azure ? 'GCP' :
                   roi.aws >= roi.azure ? 'AWS' : 'Azure';
  const bestROI = Math.max(roi.gcp || 0, roi.aws || 0, roi.azure || 0);
  const bestTCO = bestCloud === 'GCP' ? tco.totalGcp : bestCloud === 'AWS' ? tco.totalAws : tco.totalAzure;
  const bestSavings = (tco.onPremise || 0) - (bestTCO || 0);

  // Executive summary with enhanced insights
  doc.text(`The analysis indicates that ${bestCloud} provides the optimal return on investment`, 20, yPos);
  yPos += 6;
  doc.text(`with a ${bestROI.toFixed(2)}% ROI and potential savings of ${bestSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`, 20, yPos);
  yPos += 10;

  // Summary metrics table
  const summaryData = [
    ['Total Workloads Discovered', workloads.length.toString()],
    ['Analysis Timeframe', `${timeframe} months (${(timeframe / 12).toFixed(1)} years)`],
    ['On-Premise TCO', `${(tco.onPremise || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Best Cloud TCO', `${(bestTCO || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Projected Savings', `${Math.max(0, bestSavings).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Best ROI', `${bestROI.toFixed(2)}%`],
  ];

  doc.autoTable({
    startY: yPos,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204] }, // Searce Blue
    margin: { left: 20, right: 20 },
    styles: { fontSize: 9 }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Workloads Analysis
  if (workloads.length > 0) {
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204);
    doc.text('Workload Analysis', 20, yPos);
    yPos += 12;

    // Categorize workloads by type
    const workloadTypes = {};
    workloads.forEach(workload => {
      const type = workload.type || 'Uncategorized';
      if (!workloadTypes[type]) {
        workloadTypes[type] = 0;
      }
      workloadTypes[type]++;
    });

    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    
    // Workload type breakdown
    Object.entries(workloadTypes).forEach(([type, count], index) => {
      doc.text(`${index + 1}. ${type}: ${count} workloads`, 20, yPos);
      yPos += 5;
    });

    // Sample workloads table
    if (workloads.length > 0) {
      yPos += 5;
      const workloadSamples = workloads.slice(0, 10).map(w => [
        w.name?.substring(0, 25) || 'Unknown',
        w.type || 'N/A',
        w.os || 'N/A',
        `${w.cpu || 0} vCPU`,
        `${w.memory || 0} GB`,
        `${w.storage || 0} GB`,
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['Name', 'Type', 'OS', 'CPU', 'Memory', 'Storage']],
        body: workloadSamples,
        theme: 'striped',
        headStyles: { fillColor: [0, 102, 204] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 8 },
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }
  }

  // New page for TCO Comparison
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setTextColor(0, 102, 204);
  doc.text('Multi-Cloud TCO Comparison', 20, yPos);
  yPos += 12;

  const tcoData = [
    ['Platform', 'Recurring Costs', 'Migration Costs', 'Total TCO', 'vs On-Premise', 'ROI'],
    [
      'On-Premise',
      `${(tco.onPremise || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '-',
      `${(tco.onPremise || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '-',
      '-',
    ],
    [
      'AWS',
      `${(tco.aws || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${(tco.migrationCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${(tco.totalAws || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${((tco.onPremise || 0) - (tco.totalAws || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${(roi.aws || 0).toFixed(2)}%`,
    ],
    [
      'Azure',
      `${(tco.azure || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${(tco.migrationCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${(tco.totalAzure || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${((tco.onPremise || 0) - (tco.totalAzure || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${(roi.azure || 0).toFixed(2)}%`,
    ],
    [
      'GCP',
      `${(tco.gcp || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${(tco.migrationCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${(tco.totalGcp || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${((tco.onPremise || 0) - (tco.totalGcp || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${(roi.gcp || 0).toFixed(2)}%`,
    ],
  ];

  doc.autoTable({
    startY: yPos,
    head: [tcoData[0]],
    body: tcoData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204] },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35 },
      5: { cellWidth: 25 }
    }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Enhanced Recommendations
  doc.setFontSize(16);
  doc.setTextColor(0, 102, 204);
  doc.text('Strategic Recommendations', 20, yPos);
  yPos += 12;

  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);

  // Generate specific recommendations based on the analysis
  const recommendations = [];

  if (bestROI > 0) {
    recommendations.push(`${bestCloud} provides the optimal ROI path with ${bestROI.toFixed(2)}% return and ${Math.abs(bestSavings).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in savings.`);
  }

  if (tco.migrationCost > tco.totalGcp * 0.1) {
    recommendations.push('Consider optimizing migration approach to reduce upfront costs.');
  }

  if (workloads.length > 20) {
    recommendations.push('Implement phased migration strategy to reduce risk and complexity.');
  }

  recommendations.push('Evaluate reserved instance commitments for additional cost optimization.');
  recommendations.push('Implement comprehensive cost monitoring and optimization practices post-migration.');
  recommendations.push('Plan for ongoing optimization reviews every 6 months.');

  recommendations.forEach((rec, index) => {
    doc.text(`${index + 1}. ${rec}`, 20, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Risk Analysis
  doc.setFontSize(16);
  doc.setTextColor(0, 102, 204);
  doc.text('Risk Assessment', 20, yPos);
  yPos += 12;

  const riskFactors = [
    'Market volatility in cloud pricing',
    'Technical complexity of migration',
    'Skills gap in cloud operations',
    'Data security and compliance requirements',
    'Business continuity during transition'
  ];

  riskFactors.forEach((risk, index) => {
    doc.text(`${index + 1}. ${risk}`, 20, yPos);
    yPos += 5;
  });

  yPos += 5;

  // Risk Mitigation
  doc.text('Mitigation Strategies:', 20, yPos);
  yPos += 5;

  const mitigations = [
    'Conduct regular pricing reviews and commitment optimization',
    'Develop comprehensive migration runbooks and testing procedures',
    'Invest in cloud skills training and certification programs',
    'Implement robust security frameworks and compliance processes',
    'Plan for redundancy and disaster recovery during migration'
  ];

  mitigations.forEach((mitigation, index) => {
    doc.text(`${index + 1}. ${mitigation}`, 20, yPos);
    yPos += 5;
  });

  // Environmental Impact
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setTextColor(0, 102, 204);
  doc.text('Environmental Impact Assessment', 20, yPos);
  yPos += 12;

  // Calculate environmental impact (simplified)
  // Using rough estimates: on-premise has ~2.5x the carbon intensity of modern clouds
  const onPremiseFootprint = (tco.onPremise || 0) * 0.0025; // kg CO2 per dollar
  const cloudFootprint = ((tco.aws * 0.0012 || 0) + (tco.azure * 0.0014 || 0) + (tco.gcp * 0.0009 || 0)) / 3;
  const reductionPercent = ((onPremiseFootprint - cloudFootprint) / onPremiseFootprint) * 100;
  const annualReduction = reductionPercent > 0 ? (reductionPercent / 100) * onPremiseFootprint : 0;

  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);

  doc.text(`Carbon Footprint Analysis:`, 20, yPos);
  yPos += 5;
  doc.text(`• Estimated on-premise annual CO2 emissions: ${(onPremiseFootprint / (timeframe/12)).toFixed(2)} tons`, 20, yPos);
  yPos += 5;
  doc.text(`• Estimated cloud annual CO2 emissions: ${(cloudFootprint / (timeframe/12)).toFixed(2)} tons`, 20, yPos);
  yPos += 5;
  doc.text(`• Projected reduction: ${reductionPercent.toFixed(1)}% annually`, 20, yPos);
  yPos += 5;
  doc.text(`• Annual CO2 reduction: ${annualReduction.toFixed(2)} tons`, 20, yPos);
  yPos += 8;

  doc.text(`Environmental Impact Equivalent:`, 20, yPos);
  yPos += 5;
  doc.text(`• ${annualReduction.toFixed(0)} tons CO2 reduction`, 20, yPos);
  yPos += 5;
  doc.text(`• Equivalent to removing ${(annualReduction * 0.5).toFixed(0) || '0'} cars from the road annually`, 20, yPos);
  yPos += 5;
  doc.text(`• Or planting ${(annualReduction * 50).toFixed(0) || '0'} tree seedlings grown for 10 years`, 20, yPos);

  // Landing Zone Configuration (if available)
  if (landingZoneConfig) {
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204);
    doc.text('Landing Zone Configuration', 20, yPos);
    yPos += 12;

    const lzData = [
      ['Organization ID', landingZoneConfig.organizationId || 'Not set'],
      ['Billing Account', landingZoneConfig.billingAccountId || 'Not set'],
      ['Projects', landingZoneConfig.projects?.length.toString() || '0'],
      ['Folders', landingZoneConfig.folders?.join(', ') || 'None'],
      ['VPC Name', landingZoneConfig.networkConfig?.vpcName || 'Not set'],
      ['Primary Region', landingZoneConfig.networkConfig?.region || 'Not set'],
      ['Subnets', landingZoneConfig.networkConfig?.subnets?.length.toString() || '0'],
      ['GKE Enabled', landingZoneConfig.computeConfig?.enableGKE ? 'Yes' : 'No'],
      ['Cloud SQL Enabled', landingZoneConfig.storageConfig?.enableCloudSQL ? 'Yes' : 'No'],
    ];

    doc.autoTable({
      startY: yPos,
      head: [['Configuration', 'Value']],
      body: lzData,
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204] },
      margin: { left: 20, right: 20 },
    });
  }

  // Footer on all pages
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    doc.text(
      'Generated with Google Cloud Infrastructure Modernization Accelerator',
      105,
      doc.internal.pageSize.height - 5,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`migration-report-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
};
