/**
 * Cloud Pricing API Integration
 * Provides real-time pricing data from major cloud providers
 */

// Mock pricing data - in a production environment, these would connect to actual cloud provider APIs
const mockPricingData = {
  aws: {
    ec2: {
      't3.micro': { onDemand: 0.0116, reserved: 0.0082, savingsPlan: 0.0078 },
      't3.small': { onDemand: 0.0232, reserved: 0.0164, savingsPlan: 0.0156 },
      't3.medium': { onDemand: 0.0464, reserved: 0.0328, savingsPlan: 0.0312 },
      'c5.large': { onDemand: 0.0850, reserved: 0.0600, savingsPlan: 0.0570 },
      'm5.large': { onDemand: 0.0960, reserved: 0.0680, savingsPlan: 0.0640 },
    },
    s3: {
      'standard': 0.023, // per GB/month
      'ia': 0.0125,      // infrequent access
      'glacier': 0.004,  // per GB/month
    },
    rds: {
      'db.t3.micro': { onDemand: 0.017, reserved: 0.012 },
      'db.t3.small': { onDemand: 0.034, reserved: 0.024 },
    },
    dataTransfer: {
      internet: 0.09, // per GB after first TB
      interRegion: 0.02, // per GB
    },
    vpc: {
      hours: 0.05, // per VPC per hour
      natGateway: 0.045, // per NAT Gateway per hour
    }
  },
  azure: {
    virtualMachines: {
      'B1s': { payAsYouGo: 0.0456, reserved: 0.0324 },
      'B2s': { payAsYouGo: 0.0912, reserved: 0.0648 },
      'DS1_v2': { payAsYouGo: 0.0855, reserved: 0.0607 },
      'D2s_v3': { payAsYouGo: 0.0912, reserved: 0.0648 },
    },
    storage: {
      'premiumSSD': 0.176, // per GB/month
      'standardSSD': 0.053, // per GB/month
      'standardHDD': 0.044, // per GB/month
    },
    dataTransfer: {
      internet: 0.087, // per GB after first TB
      interRegion: 0.05, // per GB
    },
    sqlDatabase: {
      'Basic': { dtu: 5, costPerMonth: 5.80 },
      'Standard': { dtu: 50, costPerMonth: 100.70 },
      'Premium': { dtu: 500, costPerMonth: 1099.70 },
    }
  },
  gcp: {
    computeEngine: {
      'e2-micro': { onDemand: 0.0078, sustainedUse: 0.0055 },
      'e2-small': { onDemand: 0.0156, sustainedUse: 0.0110 },
      'e2-medium': { onDemand: 0.0312, sustainedUse: 0.0220 },
      'n1-standard-1': { onDemand: 0.0475, sustainedUse: 0.0337 },
    },
    cloudStorage: {
      'multiRegional': 0.026, // per GB/month
      'regional': 0.020,      // per GB/month
      'nearline': 0.010,      // per GB/month
      'coldline': 0.007,      // per GB/month
    },
    cloudSql: {
      'db-f1-micro': { perMonth: 8.57 },
      'db-g1-small': { perMonth: 17.14 },
    },
    dataTransfer: {
      internet: 0.12, // per GB after first TB
      interRegion: 0.01, // per GB
    }
  }
};

// Regional pricing multipliers
const regionalMultipliers = {
  'us-east-1': 1.0,    // Standard US East
  'us-west-2': 1.05,   // US West (Oregon)
  'eu-west-1': 1.1,    // EU (Ireland)
  'ap-southeast-1': 1.15, // Asia Pacific (Singapore)
  'us-central1': 1.0,  // GCP US Central
  'europe-west1': 1.1, // GCP EU West
  'asia-east1': 1.15,  // GCP Asia East
};

class CloudPricingAPI {
  static async getAWSPrices(serviceType, region = 'us-east-1') {
    // In a real implementation, this would call AWS Pricing API
    // For now, returning mock data with regional adjustment
    const data = mockPricingData.aws[serviceType];
    if (!data) return null;
    
    // Apply regional multiplier
    const multiplier = regionalMultipliers[region] || 1.0;
    
    if (typeof data === 'object') {
      const adjustedData = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object') {
          adjustedData[key] = {};
          for (const [pricingType, pricingValue] of Object.entries(value)) {
            adjustedData[key][pricingType] = pricingValue * multiplier;
          }
        } else {
          adjustedData[key] = value * multiplier;
        }
      }
      return adjustedData;
    }
    
    return data * multiplier;
  }

  static async getAzurePrices(serviceType, region = 'eastus') {
    // In a real implementation, this would call Azure Pricing API
    const data = mockPricingData.azure[serviceType];
    if (!data) return null;
    
    // Standard Azure regions pricing is relatively consistent
    const multiplier = regionalMultipliers[region] ? regionalMultipliers[region] * 1.02 : 1.0;
    
    if (typeof data === 'object') {
      const adjustedData = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object') {
          adjustedData[key] = {};
          for (const [pricingType, pricingValue] of Object.entries(value)) {
            adjustedData[key][pricingType] = pricingValue * multiplier;
          }
        } else {
          adjustedData[key] = value * multiplier;
        }
      }
      return adjustedData;
    }
    
    return data * multiplier;
  }

  static async getGCPPrices(serviceType, region = 'us-central1') {
    // In a real implementation, this would call GCP Pricing API
    const data = mockPricingData.gcp[serviceType];
    if (!data) return null;
    
    const multiplier = regionalMultipliers[region] || 1.0;
    
    if (typeof data === 'object') {
      const adjustedData = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object') {
          adjustedData[key] = {};
          for (const [pricingType, pricingValue] of Object.entries(value)) {
            adjustedData[key][pricingType] = pricingValue * multiplier;
          }
        } else {
          adjustedData[key] = value * multiplier;
        }
      }
      return adjustedData;
    }
    
    return data * multiplier;
  }

  // Enhanced TCO calculation with all factors
  static calculateEnhancedTCO(inputs) {
    const {
      onPremise,
      cloudSelection,
      timeframe = 36,
      reservedInstanceTerm = 'none', // 'none', '1year', '3year'
      savingsPlanTerm = 'none',     // 'none', '1year', '3year'
      region = 'us-east-1',
      workloadCharacteristics = {},
      includeDataTransfer = true,
      hybridConnectivity = false,
      complianceFactor = 1.0,
      performanceMultiplier = 1.0
    } = inputs;

    // Calculate on-premise costs
    const onPremiseMonthly = Object.values(onPremise).reduce(
      (sum, cost) => sum + (typeof cost === 'number' ? cost : 0),
      0
    );
    const onPremiseTCO = onPremiseMonthly * timeframe;

    // Calculate cloud costs with enhanced factors
    let cloudMonthly = 0;
    let cloudCostBreakdown = {};

    if (cloudSelection.aws) {
      // AWS enhanced calculation
      const awsPricing = mockPricingData.aws;
      
      // Compute costs with RI/Savings Plan discounts
      let computeCost = 0;
      if (cloudSelection.aws.ec2Instances) {
        const baseCompute = cloudSelection.aws.ec2Instances;
        let computeRate = awsPricing.ec2['m5.large']?.onDemand || 0.0960; // default rate
        
        // Apply discount based on selection
        if (reservedInstanceTerm === '1year') {
          computeRate = awsPricing.ec2['m5.large']?.reserved || 0.0680;
        } else if (reservedInstanceTerm === '3year') {
          computeRate = Math.min(
            awsPricing.ec2['m5.large']?.reserved || 0.0680,
            awsPricing.ec2['m5.large']?.savingsPlan || 0.0640
          );
        } else if (savingsPlanTerm === '1year') {
          computeRate = awsPricing.ec2['m5.large']?.savingsPlan || 0.0640;
        } else if (savingsPlanTerm === '3year') {
          computeRate = awsPricing.ec2['m5.large']?.savingsPlan || 0.0640;
        }
        
        computeCost = baseCompute * computeRate * 730; // 730 hours per month
      }
      
      // Storage costs
      let storageCost = 0;
      if (cloudSelection.aws.s3) {
        const storageRate = awsPricing.s3.standard;
        storageCost = cloudSelection.aws.s3 * storageRate;
      }
      
      // Data transfer costs
      let dataTransferCost = 0;
      if (includeDataTransfer && cloudSelection.aws.dataTransferGB) {
        const transferRate = awsPricing.dataTransfer.internet;
        dataTransferCost = Math.max(0, cloudSelection.aws.dataTransferGB - 1024) * transferRate; // first 1TB free
      }
      
      // VPC and networking costs
      let networkingCost = 0;
      if (cloudSelection.aws.vpc) {
        networkingCost = awsPricing.vpc.hours * 730; // 730 hours per month
      }
      
      // Hybrid connectivity costs
      let hybridCost = 0;
      if (hybridConnectivity) {
        hybridCost = awsPricing.vpc.natGateway * 730; // estimate NAT Gateway usage
      }
      
      // Apply performance and compliance multipliers
      const rawCloudCost = (computeCost + storageCost + dataTransferCost + networkingCost + hybridCost) * performanceMultiplier;
      cloudMonthly += rawCloudCost * complianceFactor;
      
      cloudCostBreakdown = {
        compute: computeCost * complianceFactor * performanceMultiplier,
        storage: storageCost * complianceFactor * performanceMultiplier,
        dataTransfer: dataTransferCost * complianceFactor * performanceMultiplier,
        networking: networkingCost * complianceFactor * performanceMultiplier,
        hybrid: hybridCost * complianceFactor * performanceMultiplier
      };
    }

    if (cloudSelection.azure) {
      // Azure enhanced calculation
      const azurePricing = mockPricingData.azure;
      
      let computeCost = 0;
      if (cloudSelection.azure.virtualMachines) {
        const baseCompute = cloudSelection.azure.virtualMachines;
        let computeRate = azurePricing.virtualMachines['D2s_v3']?.payAsYouGo || 0.0912;
        
        if (reservedInstanceTerm === '1year' || reservedInstanceTerm === '3year') {
          computeRate = azurePricing.virtualMachines['D2s_v3']?.reserved || 0.0648;
        }
        
        computeCost = baseCompute * computeRate * 730;
      }
      
      let storageCost = 0;
      if (cloudSelection.azure.blobStorage) {
        const storageRate = azurePricing.storage.standardSSD;
        storageCost = cloudSelection.azure.blobStorage * storageRate;
      }
      
      let dataTransferCost = 0;
      if (includeDataTransfer && cloudSelection.azure.dataTransferGB) {
        const transferRate = azurePricing.dataTransfer.internet;
        dataTransferCost = Math.max(0, cloudSelection.azure.dataTransferGB - 1024) * transferRate;
      }
      
      const rawCloudCost = (computeCost + storageCost + dataTransferCost) * performanceMultiplier;
      cloudMonthly += rawCloudCost * complianceFactor;
    }

    if (cloudSelection.gcp) {
      // GCP enhanced calculation
      const gcpPricing = mockPricingData.gcp;
      
      let computeCost = 0;
      if (cloudSelection.gcp.computeEngine) {
        const baseCompute = cloudSelection.gcp.computeEngine;
        let computeRate = gcpPricing.computeEngine['n1-standard-1']?.onDemand || 0.0475;
        
        if (reservedInstanceTerm === '1year' || reservedInstanceTerm === '3year') {
          computeRate = gcpPricing.computeEngine['n1-standard-1']?.sustainedUse || 0.0337;
        }
        
        computeCost = baseCompute * computeRate * 730;
      }
      
      let storageCost = 0;
      if (cloudSelection.gcp.cloudStorage) {
        const storageRate = gcpPricing.cloudStorage.regional;
        storageCost = cloudSelection.gcp.cloudStorage * storageRate;
      }
      
      let dataTransferCost = 0;
      if (includeDataTransfer && cloudSelection.gcp.dataTransferGB) {
        const transferRate = gcpPricing.dataTransfer.internet;
        dataTransferCost = Math.max(0, cloudSelection.gcp.dataTransferGB - 1024) * transferRate;
      }
      
      const rawCloudCost = (computeCost + storageCost + dataTransferCost) * performanceMultiplier;
      cloudMonthly += rawCloudCost * complianceFactor;
    }

    // Migration costs
    const migrationCost = inputs.migration ? Object.values(inputs.migration).reduce((sum, cost) => sum + (typeof cost === 'number' ? cost : 0), 0) : 0;

    // Calculate total TCO
    const cloudTCO = cloudMonthly * timeframe;
    const totalCloudTCO = cloudTCO + migrationCost;

    // Calculate savings and ROI
    const savings = onPremiseTCO - totalCloudTCO;
    const roi = totalCloudTCO > 0 ? (savings / totalCloudTCO) * 100 : 0;

    return {
      onPremiseTCO,
      cloudMonthly,
      cloudTCO,
      migrationCost,
      totalCloudTCO,
      savings,
      roi,
      cloudCostBreakdown,
      timeframe
    };
  }

  // Get recommendations based on workload characteristics
  static getOptimizationRecommendations(workloadCharacteristics) {
    const recommendations = [];
    
    // CPU-intensive workloads
    if (workloadCharacteristics.cpuIntensive) {
      recommendations.push({
        type: 'instanceSelection',
        service: 'compute',
        recommendation: 'Consider high-CPU instance types for better performance per dollar',
        potentialSavings: '15-25%'
      });
    }
    
    // Memory-intensive workloads
    if (workloadCharacteristics.memoryIntensive) {
      recommendations.push({
        type: 'instanceSelection',
        service: 'compute',
        recommendation: 'Consider memory-optimized instance types',
        potentialSavings: '10-20%'
      });
    }
    
    // Storage-heavy workloads
    if (workloadCharacteristics.storageIntensive) {
      recommendations.push({
        type: 'storageOptimization',
        service: 'storage',
        recommendation: 'Consider storage class optimization (move infrequent data to cheaper tiers)',
        potentialSavings: '30-50%'
      });
    }
    
    // Long-term workloads
    if (workloadCharacteristics.longTerm) {
      recommendations.push({
        type: 'commitmentOptimization',
        service: 'compute',
        recommendation: 'Consider Reserved Instances or Savings Plans for 1-3 year commitments',
        potentialSavings: '30-60%'
      });
    }
    
    return recommendations;
  }

  // Break-even analysis
  static calculateBreakEvenPoint(onPremiseMonthly, cloudMonthly, migrationCost) {
    if (cloudMonthly >= onPremiseMonthly) {
      return null; // No break-even point
    }
    
    const monthlySavings = onPremiseMonthly - cloudMonthly;
    if (monthlySavings <= 0) {
      return null; // No savings
    }
    
    const monthsToBreakeven = migrationCost / monthlySavings;
    return {
      months: monthsToBreakeven,
      years: monthsToBreakeven / 12
    };
  }
}

export default CloudPricingAPI;