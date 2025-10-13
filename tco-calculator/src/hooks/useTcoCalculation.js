import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

export const useTcoCalculation = () => {
  const { state, actions } = useAppContext();
  const { onPremise, aws, azure, gcp, migration, timeframe } = state;

  const calculateTco = useCallback(() => {
    // Calculate monthly on-premise costs
    const monthlyOnPremise = Object.values(onPremise).reduce(
      (sum, cost) => sum + parseFloat(cost || 0),
      0
    );

    // Calculate monthly cloud costs
    const monthlyAws = Object.values(aws).reduce(
      (sum, cost) => sum + parseFloat(cost || 0),
      0
    );
    const monthlyAzure = Object.values(azure).reduce(
      (sum, cost) => sum + parseFloat(cost || 0),
      0
    );
    const monthlyGcp = Object.values(gcp).reduce(
      (sum, cost) => sum + parseFloat(cost || 0),
      0
    );

    // Calculate one-time migration costs
    const migrationCost = Object.values(migration).reduce(
      (sum, cost) => sum + parseFloat(cost || 0),
      0
    );

    // Calculate TCO over timeframe
    const onPremiseTco = monthlyOnPremise * timeframe;
    const awsTco = monthlyAws * timeframe;
    const azureTco = monthlyAzure * timeframe;
    const gcpTco = monthlyGcp * timeframe;

    const totalAwsTco = awsTco + migrationCost;
    const totalAzureTco = azureTco + migrationCost;
    const totalGcpTco = gcpTco + migrationCost;

    // Update TCO state
    actions.setTco({
      onPremise: onPremiseTco,
      aws: awsTco,
      azure: azureTco,
      gcp: gcpTco,
      migrationCost,
      totalAws: totalAwsTco,
      totalAzure: totalAzureTco,
      totalGcp: totalGcpTco,
    });

    // Calculate ROI
    const awsNetSavings = onPremiseTco - totalAwsTco;
    const azureNetSavings = onPremiseTco - totalAzureTco;
    const gcpNetSavings = onPremiseTco - totalGcpTco;

    actions.setRoi({
      aws: totalAwsTco > 0 ? (awsNetSavings / totalAwsTco) * 100 : 0,
      azure: totalAzureTco > 0 ? (azureNetSavings / totalAzureTco) * 100 : 0,
      gcp: totalGcpTco > 0 ? (gcpNetSavings / totalGcpTco) * 100 : 0,
    });
  }, [onPremise, aws, azure, gcp, migration, timeframe, actions]);

  return { calculateTco };
};
