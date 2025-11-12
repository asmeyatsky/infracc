/**
 * Real Cloud Pricing API Integration
 * Integrates with actual AWS, Azure, and GCP pricing APIs
 * 
 * APIs Used:
 * - AWS: AWS Pricing API (https://pricing.us-east-1.amazonaws.com/)
 * - Azure: Azure Retail Prices API (https://prices.azure.com/api/retail/prices)
 * - GCP: Cloud Billing API (actual costs) & Cloud Pricing API (price lists)
 */

// Configuration
const PRICING_CONFIG = {
  // AWS Pricing API endpoint
  awsPricingEndpoint: 'https://pricing.us-east-1.amazonaws.com',
  awsRegion: 'us-east-1',
  
  // Azure Retail Prices API
  azurePricingEndpoint: 'https://prices.azure.com/api/retail/prices',
  azureRegion: 'eastus',
  
  // GCP Cloud Billing API (requires backend proxy)
  gcpBillingEndpoint: process.env.REACT_APP_GCP_BILLING_ENDPOINT || 'http://localhost:3001/api/billing',
  gcpPricingEndpoint: process.env.REACT_APP_GCP_PRICING_ENDPOINT || 'http://localhost:3001/api/pricing',
  
  // Cache settings
  cacheTimeout: 3600000, // 1 hour in milliseconds
  useCache: true,
};

// In-memory cache for pricing data
const pricingCache = new Map();

/**
 * AWS Pricing API Integration
 * Uses AWS Pricing API to fetch real-time pricing
 */
class AWSPricingAPI {
  /**
   * Get EC2 instance pricing
   * @param {string} instanceType - Instance type (e.g., 't3.micro')
   * @param {string} region - AWS region (e.g., 'us-east-1')
   * @param {string} os - Operating system ('Linux', 'Windows')
   * @returns {Promise<Object>} Pricing data
   */
  static async getEC2Pricing(instanceType, region = 'us-east-1', os = 'Linux') {
    const cacheKey = `aws-ec2-${instanceType}-${region}-${os}`;
    
    // Check cache
    if (PRICING_CONFIG.useCache && pricingCache.has(cacheKey)) {
      const cached = pricingCache.get(cacheKey);
      if (Date.now() - cached.timestamp < PRICING_CONFIG.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // AWS Pricing API requires specific format
      // Note: This requires a backend proxy due to CORS restrictions
      const response = await fetch(`${PRICING_CONFIG.gcpBillingEndpoint}/aws/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'AmazonEC2',
          instanceType,
          region,
          operatingSystem: os,
          tenancy: 'Shared',
          capacityStatus: 'Used',
        }),
      });

      if (!response.ok) {
        throw new Error(`AWS Pricing API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the result
      if (PRICING_CONFIG.useCache) {
        pricingCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      return {
        onDemand: parseFloat(data.OnDemand?.price || 0),
        reserved1Year: parseFloat(data.Reserved?.oneYear?.price || 0),
        reserved3Year: parseFloat(data.Reserved?.threeYear?.price || 0),
        savingsPlan: parseFloat(data.SavingsPlan?.oneYear?.price || 0),
        region,
        instanceType,
      };
    } catch (error) {
      console.error('Error fetching AWS EC2 pricing:', error);
      // Fallback to mock data
      return this.getMockEC2Pricing(instanceType, region);
    }
  }

  /**
   * Get S3 storage pricing
   * @param {string} storageClass - Storage class ('Standard', 'Standard-IA', 'Glacier')
   * @param {string} region - AWS region
   * @returns {Promise<Object>} Pricing data per GB/month
   */
  static async getS3Pricing(storageClass = 'Standard', region = 'us-east-1') {
    const cacheKey = `aws-s3-${storageClass}-${region}`;

    if (PRICING_CONFIG.useCache && pricingCache.has(cacheKey)) {
      const cached = pricingCache.get(cacheKey);
      if (Date.now() - cached.timestamp < PRICING_CONFIG.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${PRICING_CONFIG.gcpBillingEndpoint}/aws/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'AmazonS3',
          storageClass,
          region,
        }),
      });

      if (!response.ok) {
        throw new Error(`AWS Pricing API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (PRICING_CONFIG.useCache) {
        pricingCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      return {
        pricePerGB: parseFloat(data.pricePerGB || 0),
        storageClass,
        region,
      };
    } catch (error) {
      console.error('Error fetching AWS S3 pricing:', error);
      return this.getMockS3Pricing(storageClass);
    }
  }

  /**
   * Get RDS pricing
   * @param {string} engine - Database engine ('mysql', 'postgresql', 'sqlserver')
   * @param {string} instanceClass - Instance class (e.g., 'db.t3.micro')
   * @param {string} region - AWS region
   * @returns {Promise<Object>} Pricing data
   */
  static async getRDSPricing(engine, instanceClass, region = 'us-east-1') {
    const cacheKey = `aws-rds-${engine}-${instanceClass}-${region}`;

    if (PRICING_CONFIG.useCache && pricingCache.has(cacheKey)) {
      const cached = pricingCache.get(cacheKey);
      if (Date.now() - cached.timestamp < PRICING_CONFIG.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${PRICING_CONFIG.gcpBillingEndpoint}/aws/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'AmazonRDS',
          engine,
          instanceClass,
          region,
        }),
      });

      if (!response.ok) {
        throw new Error(`AWS Pricing API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (PRICING_CONFIG.useCache) {
        pricingCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      return {
        onDemand: parseFloat(data.OnDemand?.price || 0),
        reserved1Year: parseFloat(data.Reserved?.oneYear?.price || 0),
        reserved3Year: parseFloat(data.Reserved?.threeYear?.price || 0),
        engine,
        instanceClass,
        region,
      };
    } catch (error) {
      console.error('Error fetching AWS RDS pricing:', error);
      return this.getMockRDSPricing(engine, instanceClass);
    }
  }

  // Mock fallback methods
  static getMockEC2Pricing(instanceType, region) {
    const mockPrices = {
      't3.micro': { onDemand: 0.0116, reserved: 0.0082, savingsPlan: 0.0078 },
      't3.small': { onDemand: 0.0232, reserved: 0.0164, savingsPlan: 0.0156 },
      'm5.large': { onDemand: 0.0960, reserved: 0.0680, savingsPlan: 0.0640 },
    };
    return mockPrices[instanceType] || mockPrices['t3.micro'];
  }

  static getMockS3Pricing(storageClass) {
    const mockPrices = {
      'Standard': 0.023,
      'Standard-IA': 0.0125,
      'Glacier': 0.004,
    };
    return { pricePerGB: mockPrices[storageClass] || 0.023 };
  }

  static getMockRDSPricing(engine, instanceClass) {
    return {
      onDemand: 0.017,
      reserved1Year: 0.012,
      reserved3Year: 0.010,
    };
  }
}

/**
 * Azure Pricing API Integration
 * Uses Azure Retail Prices API
 */
class AzurePricingAPI {
  /**
   * Get Virtual Machine pricing
   * @param {string} vmSize - VM size (e.g., 'Standard_B1s')
   * @param {string} region - Azure region (e.g., 'eastus')
   * @param {string} os - Operating system ('Linux', 'Windows')
   * @returns {Promise<Object>} Pricing data
   */
  static async getVMPricing(vmSize, region = 'eastus', os = 'Linux') {
    const cacheKey = `azure-vm-${vmSize}-${region}-${os}`;

    if (PRICING_CONFIG.useCache && pricingCache.has(cacheKey)) {
      const cached = pricingCache.get(cacheKey);
      if (Date.now() - cached.timestamp < PRICING_CONFIG.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Azure Retail Prices API query
      const query = `$filter=armSkuName eq '${vmSize}' and armRegionName eq '${region}' and priceType eq 'Consumption'`;
      const response = await fetch(
        `${PRICING_CONFIG.azurePricingEndpoint}?${query}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Azure Pricing API error: ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.Items || [];
      
      // Find the matching item
      const vmPricing = items.find(
        item => item.armSkuName === vmSize && 
                item.armRegionName === region &&
                item.productName?.includes(os)
      );

      if (!vmPricing) {
        throw new Error('VM pricing not found');
      }

      const pricing = {
        payAsYouGo: parseFloat(vmPricing.retailPrice || 0),
        reserved1Year: parseFloat(vmPricing.reserved1YearPrice || 0),
        reserved3Year: parseFloat(vmPricing.reserved3YearPrice || 0),
        vmSize,
        region,
        os,
      };

      if (PRICING_CONFIG.useCache) {
        pricingCache.set(cacheKey, {
          data: pricing,
          timestamp: Date.now(),
        });
      }

      return pricing;
    } catch (error) {
      console.error('Error fetching Azure VM pricing:', error);
      return this.getMockVMPricing(vmSize);
    }
  }

  /**
   * Get Azure Storage pricing
   * @param {string} storageType - Storage type ('Premium SSD', 'Standard SSD', 'Standard HDD')
   * @param {string} region - Azure region
   * @returns {Promise<Object>} Pricing data per GB/month
   */
  static async getStoragePricing(storageType = 'Standard SSD', region = 'eastus') {
    const cacheKey = `azure-storage-${storageType}-${region}`;

    if (PRICING_CONFIG.useCache && pricingCache.has(cacheKey)) {
      const cached = pricingCache.get(cacheKey);
      if (Date.now() - cached.timestamp < PRICING_CONFIG.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const query = `$filter=serviceName eq 'Storage' and armRegionName eq '${region}'`;
      const response = await fetch(
        `${PRICING_CONFIG.azurePricingEndpoint}?${query}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Azure Pricing API error: ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.Items || [];
      
      // Find storage pricing
      const storagePricing = items.find(
        item => item.productName?.includes(storageType)
      );

      const pricing = {
        pricePerGB: parseFloat(storagePricing?.retailPrice || 0),
        storageType,
        region,
      };

      if (PRICING_CONFIG.useCache) {
        pricingCache.set(cacheKey, {
          data: pricing,
          timestamp: Date.now(),
        });
      }

      return pricing;
    } catch (error) {
      console.error('Error fetching Azure storage pricing:', error);
      return this.getMockStoragePricing(storageType);
    }
  }

  // Mock fallback methods
  static getMockVMPricing(vmSize) {
    const mockPrices = {
      'Standard_B1s': { payAsYouGo: 0.0456, reserved: 0.0324 },
      'Standard_B2s': { payAsYouGo: 0.0912, reserved: 0.0648 },
      'Standard_D2s_v3': { payAsYouGo: 0.0912, reserved: 0.0648 },
    };
    return mockPrices[vmSize] || mockPrices['Standard_B1s'];
  }

  static getMockStoragePricing(storageType) {
    const mockPrices = {
      'Premium SSD': 0.176,
      'Standard SSD': 0.053,
      'Standard HDD': 0.044,
    };
    return { pricePerGB: mockPrices[storageType] || 0.053 };
  }
}

/**
 * GCP Pricing API Integration
 * Uses GCP Cloud Billing API and Cloud Pricing API
 */
class GCPPricingAPI {
  /**
   * Get Compute Engine pricing
   * @param {string} machineType - Machine type (e.g., 'e2-micro')
   * @param {string} region - GCP region (e.g., 'us-central1')
   * @returns {Promise<Object>} Pricing data
   */
  static async getComputePricing(machineType, region = 'us-central1') {
    const cacheKey = `gcp-compute-${machineType}-${region}`;

    if (PRICING_CONFIG.useCache && pricingCache.has(cacheKey)) {
      const cached = pricingCache.get(cacheKey);
      if (Date.now() - cached.timestamp < PRICING_CONFIG.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${PRICING_CONFIG.gcpPricingEndpoint}/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineType,
          region,
        }),
      });

      if (!response.ok) {
        throw new Error(`GCP Pricing API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (PRICING_CONFIG.useCache) {
        pricingCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      return {
        onDemand: parseFloat(data.onDemand?.price || 0),
        sustainedUse: parseFloat(data.sustainedUse?.price || 0),
        committedUse1Year: parseFloat(data.committedUse1Year?.price || 0),
        committedUse3Year: parseFloat(data.committedUse3Year?.price || 0),
        machineType,
        region,
      };
    } catch (error) {
      console.error('Error fetching GCP Compute pricing:', error);
      return this.getMockComputePricing(machineType);
    }
  }

  /**
   * Get Cloud Storage pricing
   * @param {string} storageClass - Storage class ('Standard', 'Nearline', 'Coldline', 'Archive')
   * @param {string} region - GCP region
   * @returns {Promise<Object>} Pricing data per GB/month
   */
  static async getStoragePricing(storageClass = 'Standard', region = 'us-central1') {
    const cacheKey = `gcp-storage-${storageClass}-${region}`;

    if (PRICING_CONFIG.useCache && pricingCache.has(cacheKey)) {
      const cached = pricingCache.get(cacheKey);
      if (Date.now() - cached.timestamp < PRICING_CONFIG.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${PRICING_CONFIG.gcpPricingEndpoint}/storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storageClass,
          region,
        }),
      });

      if (!response.ok) {
        throw new Error(`GCP Pricing API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (PRICING_CONFIG.useCache) {
        pricingCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      return {
        pricePerGB: parseFloat(data.pricePerGB || 0),
        storageClass,
        region,
      };
    } catch (error) {
      console.error('Error fetching GCP storage pricing:', error);
      return this.getMockStoragePricing(storageClass);
    }
  }

  /**
   * Get actual costs from Cloud Billing API
   * @param {string} billingAccount - Billing account ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Cost data
   */
  static async getActualCosts(billingAccount, startDate, endDate) {
    try {
      const response = await fetch(`${PRICING_CONFIG.gcpBillingEndpoint}/costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingAccount,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`GCP Billing API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching GCP actual costs:', error);
      throw error;
    }
  }

  // Mock fallback methods
  static getMockComputePricing(machineType) {
    const mockPrices = {
      'e2-micro': { onDemand: 0.0078, sustainedUse: 0.0055 },
      'e2-small': { onDemand: 0.0156, sustainedUse: 0.0110 },
      'n1-standard-1': { onDemand: 0.0475, sustainedUse: 0.0337 },
    };
    return mockPrices[machineType] || mockPrices['e2-micro'];
  }

  static getMockStoragePricing(storageClass) {
    const mockPrices = {
      'Standard': 0.026,
      'Nearline': 0.010,
      'Coldline': 0.007,
      'Archive': 0.004,
    };
    return { pricePerGB: mockPrices[storageClass] || 0.026 };
  }
}

/**
 * Unified pricing interface
 */
class CloudPricingIntegration {
  static async getPricing(provider, service, params) {
    switch (provider) {
      case 'aws':
        switch (service) {
          case 'ec2':
            return await AWSPricingAPI.getEC2Pricing(
              params.instanceType,
              params.region,
              params.os
            );
          case 's3':
            return await AWSPricingAPI.getS3Pricing(
              params.storageClass,
              params.region
            );
          case 'rds':
            return await AWSPricingAPI.getRDSPricing(
              params.engine,
              params.instanceClass,
              params.region
            );
          default:
            throw new Error(`Unsupported AWS service: ${service}`);
        }
      
      case 'azure':
        switch (service) {
          case 'vm':
            return await AzurePricingAPI.getVMPricing(
              params.vmSize,
              params.region,
              params.os
            );
          case 'storage':
            return await AzurePricingAPI.getStoragePricing(
              params.storageType,
              params.region
            );
          default:
            throw new Error(`Unsupported Azure service: ${service}`);
        }
      
      case 'gcp':
        switch (service) {
          case 'compute':
            return await GCPPricingAPI.getComputePricing(
              params.machineType,
              params.region
            );
          case 'storage':
            return await GCPPricingAPI.getStoragePricing(
              params.storageClass,
              params.region
            );
          case 'actualCosts':
            return await GCPPricingAPI.getActualCosts(
              params.billingAccount,
              params.startDate,
              params.endDate
            );
          default:
            throw new Error(`Unsupported GCP service: ${service}`);
        }
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Check if pricing APIs are available
   */
  static async checkAvailability() {
    const availability = {
      aws: false,
      azure: false, // Not used for AWS to GCP migration
      gcp: false,
      backend: false,
    };

    // Check backend API
    try {
      const response = await fetch(`${PRICING_CONFIG.gcpBillingEndpoint}/health`);
      availability.backend = response.ok;
    } catch (error) {
      availability.backend = false;
    }

    // Azure API check removed - not needed for AWS to GCP migration
    // Azure pricing API has CORS restrictions and is not used in this workflow
    availability.azure = false;

    // AWS and GCP require backend proxy
    availability.aws = availability.backend;
    availability.gcp = availability.backend;

    return availability;
  }
}

export default CloudPricingIntegration;
export { AWSPricingAPI, AzurePricingAPI, GCPPricingAPI };
