import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateMigrationReport } from '../utils/pdfExport';

export const useExport = () => {
  const { state } = useAppContext();

  const exportToJSON = useCallback(() => {
    const { onPremise, aws, azure, gcp, migration, tco, roi, timeframe } = state;

    const reportData = {
      generatedDate: new Date().toISOString(),
      analysisTimeframe: {
        months: timeframe,
        years: (timeframe / 12).toFixed(1),
      },
      onPremiseCosts: {
        monthly: onPremise,
        totalMonthly: Object.values(onPremise).reduce((a, b) => parseFloat(a) + parseFloat(b), 0),
        totalOverTimeframe: tco.onPremise,
      },
      awsCosts: {
        monthly: aws,
        totalMonthly: Object.values(aws).reduce((a, b) => parseFloat(a) + parseFloat(b), 0),
        totalOverTimeframe: tco.aws,
      },
      azureCosts: {
        monthly: azure,
        totalMonthly: Object.values(azure).reduce((a, b) => parseFloat(a) + parseFloat(b), 0),
        totalOverTimeframe: tco.azure,
      },
      gcpCosts: {
        monthly: gcp,
        totalMonthly: Object.values(gcp).reduce((a, b) => parseFloat(a) + parseFloat(b), 0),
        totalOverTimeframe: tco.gcp,
      },
      migrationCosts: {
        oneTime: migration,
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
  }, [state]);

  const exportToPDF = useCallback(() => {
    const { projectName, discoveredWorkloads, tco, roi, timeframe, landingZoneConfig } = state;

    const reportData = {
      projectName,
      workloads: discoveredWorkloads,
      tco,
      roi,
      timeframe,
      landingZoneConfig,
    };

    generateMigrationReport(reportData);
  }, [state]);

  return { exportToJSON, exportToPDF };
};
