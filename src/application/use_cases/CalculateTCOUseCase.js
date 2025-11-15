/**
 * Calculate TCO Use Case
 * 
 * Architectural Intent:
 * - Orchestrates TCO calculation across multiple cloud providers
 * - Uses domain services for business logic
 * - Coordinates pricing data retrieval
 * - Produces comprehensive cost comparison
 */

import { Money } from '../../domain/value_objects/Money.js';
import { PricingPort } from '../../domain/ports/PricingPort.js';
import { WorkloadRepositoryPort } from '../../domain/ports/WorkloadRepositoryPort.js';
import { validateTCOInput } from '../../utils/validation.js';

/**
 * TCO Calculation Input
 */
export class TCOInput {
  /**
   * @param {Object} params
   * @param {Object} params.onPremise - On-premise costs
   * @param {Object} params.aws - AWS resource counts
   * @param {Object} params.azure - Azure resource counts
   * @param {Object} params.gcp - GCP resource counts
   * @param {Object} params.migration - Migration costs
   * @param {number} params.timeframe - Analysis timeframe in months
   * @param {string} params.region - Region identifier
   */
  constructor(params) {
    this.onPremise = params.onPremise || {};
    this.aws = params.aws || {};
    this.azure = params.azure || {};
    this.gcp = params.gcp || {};
    this.migration = params.migration || {};
    this.timeframe = params.timeframe || 36;
    this.region = params.region || 'us-east-1';
  }
}

/**
 * TCO Calculation Result
 */
export class TCOResult {
  /**
   * @param {Object} params
   */
  constructor(params) {
    this.onPremise = params.onPremise || Money.zero();
    this.aws = params.aws || Money.zero();
    this.azure = params.azure || Money.zero();
    this.gcp = params.gcp || Money.zero();
    this.migrationCost = params.migrationCost || Money.zero();
    this.totalAws = params.totalAws || Money.zero();
    this.totalAzure = params.totalAzure || Money.zero();
    this.totalGcp = params.totalGcp || Money.zero();
    this.roi = params.roi || {};
    this.savings = params.savings || {};
    this.timeframe = params.timeframe || 36;
  }
}

/**
 * Calculate TCO Use Case
 * 
 * Calculates Total Cost of Ownership for on-premise, AWS, Azure, and GCP
 * with migration costs and ROI analysis
 */
export class CalculateTCOUseCase {
  /**
   * @param {Object} dependencies
   * @param {PricingPort} dependencies.pricingPort
   * @param {WorkloadRepositoryPort} dependencies.workloadRepository
   */
  constructor(dependencies) {
    this.pricingPort = dependencies.pricingPort;
    this.workloadRepository = dependencies.workloadRepository;
  }

  /**
   * Execute TCO calculation
   * @param {TCOInput} input - TCO calculation input
   * @returns {Promise<TCOResult>} TCO calculation result
   */
  async execute(input) {
    if (!(input instanceof TCOInput)) {
      throw new Error('TCOInput instance required');
    }

    // Validate input data
    validateTCOInput({
      timeframe: input.timeframe,
      region: input.region,
      onPremise: input.onPremise,
      aws: input.aws,
      azure: input.azure,
      gcp: input.gcp,
      migration: input.migration
    });

    // Calculate on-premise TCO
    const onPremiseTCO = this._calculateOnPremiseTCO(input.onPremise, input.timeframe);

    // Calculate cloud costs
    const awsCost = await this._calculateCloudCosts('aws', input.aws, input.region, input.timeframe);
    const azureCost = await this._calculateCloudCosts('azure', input.azure, input.region, input.timeframe);
    const gcpCost = await this._calculateCloudCosts('gcp', input.gcp, input.region, input.timeframe);

    // Calculate migration costs
    const migrationCost = this._calculateMigrationCost(input.migration);

    // Calculate totals (cloud + migration)
    const totalAws = awsCost.add(migrationCost);
    const totalAzure = azureCost.add(migrationCost);
    const totalGcp = gcpCost.add(migrationCost);

    // Calculate ROI
    const roi = {
      aws: this._calculateROI(onPremiseTCO, totalAws),
      azure: this._calculateROI(onPremiseTCO, totalAzure),
      gcp: this._calculateROI(onPremiseTCO, totalGcp)
    };

    // Calculate savings
    const savings = {
      aws: onPremiseTCO.subtract(totalAws),
      azure: onPremiseTCO.subtract(totalAzure),
      gcp: onPremiseTCO.subtract(totalGcp)
    };

    return new TCOResult({
      onPremise: onPremiseTCO,
      aws: awsCost,
      azure: azureCost,
      gcp: gcpCost,
      migrationCost,
      totalAws,
      totalAzure,
      totalGcp,
      roi,
      savings,
      timeframe: input.timeframe
    });
  }

  /**
   * Calculate on-premise TCO
   * @private
   */
  _calculateOnPremiseTCO(onPremise, timeframe) {
    const categories = [
      'hardware',
      'software',
      'maintenance',
      'labor',
      'power',
      'cooling',
      'datacenter'
    ];

    const monthlyCost = categories.reduce((sum, category) => {
      const cost = parseFloat(onPremise[category] || 0);
      return sum + cost;
    }, 0);

    return new Money(monthlyCost * timeframe);
  }

  /**
   * Calculate cloud costs
   * @private
   */
  async _calculateCloudCosts(provider, resources, region, timeframe) {
    let totalMonthly = 0;

    // Calculate compute costs
    if (resources.compute || resources.ec2Instances || resources.virtualMachines) {
      const computeCount = resources.compute || resources.ec2Instances || resources.virtualMachines || 0;
      const pricing = await this.pricingPort.getPricing({
        provider,
        serviceType: provider === 'aws' ? 'ec2' : provider === 'azure' ? 'virtualMachines' : 'computeEngine',
        region,
        configuration: { instanceType: 'standard' }
      });
      totalMonthly += pricing.onDemandPrice * computeCount * 730; // 730 hours/month
    }

    // Calculate storage costs
    if (resources.storage || resources.s3 || resources.blobStorage) {
      const storageGB = resources.storage || resources.s3 || resources.blobStorage || 0;
      const pricing = await this.pricingPort.getPricing({
        provider,
        serviceType: provider === 'aws' ? 's3' : provider === 'azure' ? 'blobStorage' : 'cloudStorage',
        region,
        configuration: { storageClass: 'standard' }
      });
      totalMonthly += pricing.onDemandPrice * storageGB;
    }

    // Calculate database costs
    if (resources.database || resources.rds || resources.sqlDatabase) {
      const dbCount = resources.database || resources.rds || resources.sqlDatabase || 0;
      const pricing = await this.pricingPort.getPricing({
        provider,
        serviceType: provider === 'aws' ? 'rds' : provider === 'azure' ? 'sqlDatabase' : 'cloudSql',
        region,
        configuration: {}
      });
      totalMonthly += pricing.onDemandPrice * dbCount * 730;
    }

    // Calculate networking costs
    if (resources.networking || resources.vpc) {
      const pricing = await this.pricingPort.getPricing({
        provider,
        serviceType: provider === 'aws' ? 'vpc' : 'networking',
        region,
        configuration: {}
      });
      totalMonthly += pricing.onDemandPrice * 730;
    }

    // Calculate monitoring costs
    if (resources.monitoring || resources.cloudwatch) {
      const pricing = await this.pricingPort.getPricing({
        provider,
        serviceType: provider === 'aws' ? 'cloudwatch' : 'monitoring',
        region,
        configuration: {}
      });
      totalMonthly += pricing.onDemandPrice * 730;
    }

    return new Money(totalMonthly * timeframe);
  }

  /**
   * Calculate migration costs
   * @private
   */
  _calculateMigrationCost(migration) {
    const categories = ['assessment', 'tools', 'training', 'consulting'];
    const total = categories.reduce((sum, category) => {
      const cost = parseFloat(migration[category] || 0);
      return sum + cost;
    }, 0);
    return new Money(total);
  }

  /**
   * Calculate ROI percentage
   * @private
   */
  _calculateROI(currentCost, newCost) {
    if (newCost.isZero()) {
      return 0;
    }

    const savings = currentCost.subtract(newCost);
    if (savings.isNegative()) {
      return (savings.amount / newCost.amount) * 100;
    }
    return (savings.amount / newCost.amount) * 100;
  }

  /**
   * Calculate TCO for workloads
   * Uses discovered workloads to calculate more accurate costs
   */
  async calculateFromWorkloads(workloadIds, timeframe = 36) {
    const workloads = await Promise.all(
      workloadIds.map(id => this.workloadRepository.findById(id))
    );

    const validWorkloads = workloads.filter(w => w !== null);

    // Group by provider and calculate costs
    const awsResources = { ec2Instances: 0, s3: 0, rds: 0 };
    const azureResources = { virtualMachines: 0, blobStorage: 0, sqlDatabase: 0 };
    const gcpResources = { compute: 0, storage: 0, database: 0 };

    // SAFETY: Batch forEach to avoid stack overflow with large datasets
    const TCO_BATCH_SIZE = 10000;
    for (let i = 0; i < validWorkloads.length; i += TCO_BATCH_SIZE) {
      const batch = validWorkloads.slice(i, Math.min(i + TCO_BATCH_SIZE, validWorkloads.length));
      for (const workload of batch) {
        if (workload.sourceProvider.type === 'aws') {
          if (workload.type.type === 'vm') awsResources.ec2Instances += 1;
          if (workload.type.type === 'storage') awsResources.s3 += workload.storage;
          if (workload.type.type === 'database') awsResources.rds += 1;
        } else if (workload.sourceProvider.type === 'azure') {
          if (workload.type.type === 'vm') azureResources.virtualMachines += 1;
          if (workload.type.type === 'storage') azureResources.blobStorage += workload.storage;
          if (workload.type.type === 'database') azureResources.sqlDatabase += 1;
        }
      }
    }

    // Calculate estimated GCP costs based on workload characteristics
    // SAFETY: Batch forEach to avoid stack overflow (reusing TCO_BATCH_SIZE from above)
    for (let i = 0; i < validWorkloads.length; i += TCO_BATCH_SIZE) {
      const batch = validWorkloads.slice(i, Math.min(i + TCO_BATCH_SIZE, validWorkloads.length));
      for (const workload of batch) {
        if (workload.type.type === 'vm') gcpResources.compute += 1;
        if (workload.type.type === 'storage') gcpResources.storage += workload.storage;
        if (workload.type.type === 'database') gcpResources.database += 1;
      }
    }

    const input = new TCOInput({
      onPremise: {},
      aws: awsResources,
      azure: azureResources,
      gcp: gcpResources,
      migration: {},
      timeframe,
      region: validWorkloads[0]?.region || 'us-east-1'
    });

    return this.execute(input);
  }
}

export default CalculateTCOUseCase;
