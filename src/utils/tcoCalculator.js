/**
 * Advanced TCO Calculator with Real-time Pricing and AI Insights
 */

// Base pricing data (would typically come from cloud provider APIs)
const BASE_PRICING = {
  aws: {
    ec2: {
      onDemand: 0.0464, // t3.micro per hour
      reserved: 0.0325, // 1-year reserved t3.micro
      computeOptimized: 0.25, // per hour
      memoryOptimized: 0.35, // per hour
    },
    s3: {
      standard: 0.023, // per GB/month
      intelligent: 0.025, // per GB/month
      glacier: 0.004, // per GB/month
    },
    rds: {
      mysql: 0.017, // per hour
      postgres: 0.018, // per hour
      aurora: 0.095, // per hour
    },
    lambda: {
      requests: 0.0000002, // per request
      compute: 0.0000166667, // per GB-second
    },
    vpc: {
      dataProcessed: 0.045, // per GB
      natGateway: 0.045, // per hour
    },
  },
  azure: {
    virtualMachines: {
      basic: 0.0496, // B1S per hour
      standard: 0.125, // D2s v3 per hour
      computeOptimized: 0.22, // per hour
      memoryOptimized: 0.30, // per hour
    },
    storage: {
      standardLRS: 0.0184, // per GB/month
      premiumLRS: 0.1, // per GB/month
      blob: 0.0184, // per GB/month
    },
    sqlDatabase: {
      basic: 5.808, // per month
      standard: 15.312, // per month
      premium: 61.44, // per month
    },
    functions: {
      execution: 0.000016, // per GB-second
      requests: 0.0000002, // per request
    },
  },
  gcp: {
    computeEngine: {
      e2Micro: 0.0071, // per hour
      e2Standard: 0.098, // per hour
      computeOptimized: 0.25, // per hour
      memoryOptimized: 0.35, // per hour
    },
    cloudStorage: {
      multiRegional: 0.026, // per GB/month
      regional: 0.02, // per GB/month
      coldline: 0.007, // per GB/month
    },
    cloudSql: {
      mysql: 0.017, // per hour
      postgres: 0.018, // per hour
      sqlServer: 0.025, // per hour
    },
    cloudFunctions: {
      execution: 0.0000025, // per GB-second
      requests: 0.0000004, // per request
    },
  },
};

// Calculate TCO with advanced features
export const calculateAdvancedTco = (inputs) => {
  const {
    workloads = [],
    timeframe = 36, // months
    pricingMultiplier = {
      aws: 1.0,
      azure: 1.0,
      gcp: 1.0,
    },
    reservedInstanceDiscount = {
      aws: 0.3, // 30% savings
      azure: 0.3,
      gcp: 0.3,
    },
    regionalAdjustment = {
      aws: 1.0,
      azure: 1.0,
      gcp: 1.0,
    },
    carbonImpact = false,
  } = inputs;

  // Calculate on-premise costs
  const onPremiseMonthly = calculateOnPremiseCosts(inputs.onPremise);
  const onPremiseTco = onPremiseMonthly * timeframe;

  // Calculate cloud costs with advanced considerations
  const awsMonthly = calculateCloudCosts('aws', inputs.aws, workloads, pricingMultiplier, reservedInstanceDiscount, regionalAdjustment);
  const azureMonthly = calculateCloudCosts('azure', inputs.azure, workloads, pricingMultiplier, reservedInstanceDiscount, regionalAdjustment);
  const gcpMonthly = calculateCloudCosts('gcp', inputs.gcp, workloads, pricingMultiplier, reservedInstanceDiscount, regionalAdjustment);

  const awsTco = awsMonthly * timeframe;
  const azureTco = azureMonthly * timeframe;
  const gcpTco = gcpMonthly * timeframe;

  // Calculate migration costs
  const migrationCost = Object.values(inputs.migration || {}).reduce((sum, cost) => sum + (typeof cost === 'number' ? cost : 0), 0);

  // Calculate total TCOs
  const totalAwsTco = awsTco + migrationCost;
  const totalAzureTco = azureTco + migrationCost;
  const totalGcpTco = gcpTco + migrationCost;

  // Calculate ROIs
  const awsRoi = totalAwsTco > 0 ? ((onPremiseTco - totalAwsTco) / totalAwsTco) * 100 : 0;
  const azureRoi = totalAzureTco > 0 ? ((onPremiseTco - totalAzureTco) / totalAzureTco) * 100 : 0;
  const gcpRoi = totalGcpTco > 0 ? ((onPremiseTco - totalGcpTco) / totalGcpTco) * 100 : 0;

  // Calculate break-even analysis
  const awsBreakEvenMonths = calculateBreakEven(awsMonthly, migrationCost, onPremiseMonthly);
  const azureBreakEvenMonths = calculateBreakEven(azureMonthly, migrationCost, onPremiseMonthly);
  const gcpBreakEvenMonths = calculateBreakEven(gcpMonthly, migrationCost, onPremiseMonthly);

  // Calculate carbon impact if required
  const carbonImpactData = carbonImpact ? calculateCarbonImpact(workloads) : null;

  // Generate recommendations
  const recommendations = generateRecommendations({
    aws: { monthly: awsMonthly, roi: awsRoi },
    azure: { monthly: azureMonthly, roi: azureRoi },
    gcp: { monthly: gcpMonthly, roi: gcpRoi },
  }, workloads);

  return {
    monthly: {
      onPremise: onPremiseMonthly,
      aws: awsMonthly,
      azure: azureMonthly,
      gcp: gcpMonthly,
    },
    tco: {
      onPremise: onPremiseTco,
      aws: awsTco,
      azure: azureTco,
      gcp: gcpTco,
      migration: migrationCost,
      total: {
        aws: totalAwsTco,
        azure: totalAzureTco,
        gcp: totalGcpTco,
      },
    },
    roi: {
      aws: awsRoi,
      azure: azureRoi,
      gcp: gcpRoi,
    },
    breakEven: {
      aws: awsBreakEvenMonths,
      azure: azureBreakEvenMonths,
      gcp: gcpBreakEvenMonths,
    },
    carbonImpact: carbonImpactData,
    recommendations,
    timeframe,
  };
};

// Calculate on-premise costs considering various factors
const calculateOnPremiseCosts = (onPremise) => {
  // Base on-premise costs
  const computeCosts = (onPremise.physicalServers || 0) + 
                      (onPremise.cpuCosts || 0) +
                      (onPremise.virtualization === 'vmware' ? (onPremise.vmwareLicenses || 0) : 0) +
                      (onPremise.virtualization === 'hyperv' ? (onPremise.hypervLicenses || 0) : 0);
  
  const storageCosts = (onPremise.sanStorage || 0) + 
                      (onPremise.nasStorage || 0) + 
                      (onPremise.dasStorage || 0) + 
                      (onPremise.backupStorage || 0);
  
  const networkCosts = (onPremise.switchesRouters || 0) + 
                      (onPremise.firewalls || 0) + 
                      (onPremise.loadBalancers || 0) + 
                      (onPremise.networkCabling || 0);
  
  const databaseCosts = (onPremise.oracleLicenses || 0) + 
                       (onPremise.msSqlLicenses || 0) + 
                       (onPremise.mysqlPostgres || 0);
  
  const facilitiesCosts = (onPremise.datacenterSpace || 0) + 
                         (onPremise.power || 0) + 
                         (onPremise.cooling || 0) + 
                         (onPremise.laborStaff || 0) + 
                         (onPremise.maintenance || 0);

  const totalMonthly = computeCosts + storageCosts + networkCosts + databaseCosts + facilitiesCosts;
  
  // Add maintenance and support overhead (typically 15-25% of hardware costs)
  const hardwareCosts = computeCosts + storageCosts + networkCosts;
  const supportOverhead = hardwareCosts * 0.20; // 20% overhead
  
  return totalMonthly + supportOverhead;
};

// Calculate cloud costs with workload considerations
const calculateCloudCosts = (provider, providerInputs, workloads, pricingMultiplier, reservedDiscount, regionalAdjustment) => {
  // Base costs from user inputs
  let baseCost = 0;
  
  if (provider === 'aws') {
    baseCost = Object.values(providerInputs || {}).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
  } else if (provider === 'azure') {
    baseCost = Object.values(providerInputs || {}).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
  } else if (provider === 'gcp') {
    baseCost = Object.values(providerInputs || {}).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
  }
  
  // Apply workload-based adjustments
  if (workloads && workloads.length > 0) {
    const workloadAdjustment = calculateWorkloadAdjustment(workloads, provider);
    baseCost += workloadAdjustment;
  }
  
  // Apply pricing multipliers
  const multiplier = pricingMultiplier[provider] || 1.0;
  const regionalAdj = regionalAdjustment[provider] || 1.0;
  
  // Apply reserved instance discount
  const reservedAdj = 1 - (reservedDiscount[provider] || 0);
  
  return baseCost * multiplier * regionalAdj * reservedAdj;
};

// Calculate workload-based adjustments
const calculateWorkloadAdjustment = (workloads, provider) => {
  let adjustment = 0;
  
  workloads.forEach(workload => {
    // Calculate resources needed based on workload characteristics
    const computeAdjustment = (workload.cpuCores || 0) * 0.02; // $0.02 per core per hour
    const memoryAdjustment = (workload.memoryGb || 0) * 0.01; // $0.01 per GB per hour
    const storageAdjustment = (workload.storageGb || 0) * 0.001; // $0.001 per GB per month
    const networkAdjustment = (workload.networkGb || 0) * 0.01; // $0.01 per GB
    
    adjustment += computeAdjustment + memoryAdjustment + storageAdjustment + networkAdjustment;
  });
  
  return adjustment;
};

// Calculate break-even point
const calculateBreakEven = (monthlyCloudCost, migrationCost, monthlyOnPremCost) => {
  if (monthlyCloudCost >= monthlyOnPremCost) {
    return Infinity; // Never breaks even
  }
  
  const monthlySavings = monthlyOnPremCost - monthlyCloudCost;
  return monthlySavings > 0 ? Math.ceil(migrationCost / monthlySavings) : Infinity;
};

// Calculate carbon impact
const calculateCarbonImpact = (workloads) => {
  // Simplified carbon calculation based on workload characteristics
  const onPremiseCarbon = workloads.reduce((total, workload) => {
    // On-premise typically higher carbon footprint
    return total + (workload.cpuCores || 1) * 0.5 + (workload.memoryGb || 1) * 0.1;
  }, 0);
  
  const cloudCarbon = workloads.reduce((total, workload) => {
    // Cloud typically 80% more efficient
    return total + ((workload.cpuCores || 1) * 0.5 + (workload.memoryGb || 1) * 0.1) * 0.2;
  }, 0);
  
  return {
    onPremise: onPremiseCarbon,
    cloud: cloudCarbon,
    savings: onPremiseCarbon - cloudCarbon,
    percentage: onPremiseCarbon > 0 ? ((onPremiseCarbon - cloudCarbon) / onPremiseCarbon) * 100 : 0,
  };
};

// Generate AI-powered recommendations
const generateRecommendations = (costs, workloads) => {
  const recommendations = [];
  
  // Find the best option based on ROI
  const providers = [
    { name: 'aws', cost: costs.aws.monthly, roi: costs.aws.roi },
    { name: 'azure', cost: costs.azure.monthly, roi: costs.azure.roi },
    { name: 'gcp', cost: costs.gcp.monthly, roi: costs.gcp.roi },
  ];
  
  const bestProvider = providers.reduce((best, current) => current.roi > best.roi ? current : best);
  
  recommendations.push({
    type: 'primary',
    title: 'Recommended Cloud Provider',
    description: `${bestProvider.name.toUpperCase()} offers the best ROI at ${bestProvider.roi.toFixed(2)}%`,
    provider: bestProvider.name,
    priority: 1,
  });
  
  // Suggest cost optimization
  providers.forEach(provider => {
    if (provider.roi < 10) { // Less than 10% ROI
      recommendations.push({
        type: 'optimization',
        title: `Optimize ${provider.name.toUpperCase()} Costs`,
        description: `Consider reserved instances to improve ${provider.name.toUpperCase()} ROI`,
        provider: provider.name,
        priority: 2,
      });
    }
  });
  
  // Suggest workload-specific optimizations
  if (workloads.length > 0) {
    const computeIntensiveWorkloads = workloads.filter(w => (w.cpuCores || 0) > 8);
    if (computeIntensiveWorkloads.length > 0) {
      recommendations.push({
        type: 'workload',
        title: 'Compute-Optimized Instances',
        description: 'Consider compute-optimized instances for your CPU-intensive workloads',
        priority: 3,
      });
    }
    
    const memoryIntensiveWorkloads = workloads.filter(w => (w.memoryGb || 0) > 32);
    if (memoryIntensiveWorkloads.length > 0) {
      recommendations.push({
        type: 'workload',
        title: 'Memory-Optimized Instances',
        description: 'Consider memory-optimized instances for your RAM-intensive workloads',
        priority: 3,
      });
    }
  }
  
  // Sort by priority
  recommendations.sort((a, b) => a.priority - b.priority);
  
  return recommendations;
};

// Function to get real-time pricing (would connect to actual APIs in production)
export const getRealTimePricing = async (provider, region = 'us-east-1') => {
  try {
    // In a real implementation, this would call the cloud provider's pricing API
    // For now, we'll return the base pricing with a regional adjustment
    const regionalAdjustments = {
      'us-east-1': 1.0,
      'us-west-2': 0.95,
      'eu-west-1': 1.1,
      'ap-southeast-1': 1.15,
    };
    
    const adjustment = regionalAdjustments[region] || 1.0;
    
    return {
      ...BASE_PRICING[provider],
      regionalAdjustment: adjustment,
    };
  } catch (error) {
    console.error('Error fetching real-time pricing:', error);
    return BASE_PRICING[provider] || {};
  }
};