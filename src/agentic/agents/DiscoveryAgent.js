/**
 * Discovery Agent
 * 
 * Automated Discovery & Assessment Agent with visible processing
 * Integrates with Google Cloud Migration Centre to discover and analyze workloads
 */

import { BaseAgent } from '../core/BaseAgent.js';
import { Workload } from '../../domain/entities/Workload.js';
import { getContainer } from '../../infrastructure/dependency_injection/Container.js';

export class DiscoveryAgent extends BaseAgent {
  constructor(dependencies = {}) {
    super('DiscoveryAgent', 'Discovery Agent', dependencies);
    this.apiConfig = dependencies.apiConfig || {};
    this.workloadRepository = dependencies.workloadRepository || getContainer().workloadRepository;
    this.initialize();
  }

  /**
   * Execute discovery process with visible processing
   */
  async execute(input, options = {}) {
    const { scanType = 'full', targets = [] } = options;

    try {
      // Step 1: Initialize discovery
      await this.executeStep('Initializing discovery', async () => {
        this.think(`Starting ${scanType} scan of ${targets.length || 'all'} targets`);
        await new Promise(resolve => requestAnimationFrame(resolve));
      }, 5);

      // Step 2: Asset Discovery
      const discoveredAssets = await this.executeStep('Discovering assets', async () => {
        this.think('Scanning environment for virtual machines, databases, and applications');
        return await this.discoverAssets(targets, scanType);
      }, 30);

      // Step 2.5: Convert and save workloads to repository
      await this.executeStep('Saving discovered workloads', async () => {
        this.think(`Converting ${discoveredAssets.length} discovered assets to workloads and saving to repository`);
        
        // PERFORMANCE: Batch save workloads in parallel chunks for faster processing
        const SAVE_BATCH_SIZE = 500; // Increased from sequential to 500 parallel saves
        let savedCount = 0;
        
        for (let i = 0; i < discoveredAssets.length; i += SAVE_BATCH_SIZE) {
          const batch = discoveredAssets.slice(i, i + SAVE_BATCH_SIZE);
          const batchNumber = Math.floor(i / SAVE_BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(discoveredAssets.length / SAVE_BATCH_SIZE);
          
          // Process batch in parallel
          const savePromises = batch.map(async (asset) => {
            try {
              // Map asset type to WorkloadType enum
              let workloadType = 'vm';
              if (asset.type === 'database') workloadType = 'database';
              else if (asset.type === 'storage') workloadType = 'storage';
              else if (asset.type === 'application') workloadType = 'application';
              else if (asset.type === 'container') workloadType = 'container';
              
              const workload = new Workload({
                id: asset.id,
                name: asset.name,
                service: asset.compatibility?.recommendedService || asset.service || asset.type || 'Unknown',
                type: workloadType,
                sourceProvider: 'aws', // Default, can be enhanced
                cpu: asset.cpu || 0,
                memory: asset.memory || 0,
                storage: asset.storage || asset.size || 0,
                monthlyCost: 0, // Will be calculated later
                region: asset.region || asset.network?.split('-')[0] || 'us-east-1',
                os: asset.os || 'linux',
                monthlyTraffic: asset.utilization?.network || asset.utilization?.networkUtilization || 0,
                dependencies: asset.dependencies || []
              });
              await this.workloadRepository.save(workload);
              savedCount++;
              this.emit('workload-saved', { workloadId: asset.id, workloadName: asset.name });
              return { success: true, workloadId: asset.id };
            } catch (error) {
              console.warn(`Failed to save workload ${asset.id}:`, error);
              this.emit('workload-save-error', { workloadId: asset.id, error: error.message });
              return { success: false, workloadId: asset.id, error: error.message };
            }
          });
          
          // Wait for batch to complete
          await Promise.all(savePromises);
          
          // Log progress every 10 batches or first/last
          if (batchNumber === 1 || batchNumber === totalBatches || batchNumber % 10 === 0) {
            console.log(`DiscoveryAgent: Saved batch ${batchNumber}/${totalBatches} (${savedCount.toLocaleString()}/${discoveredAssets.length.toLocaleString()} workloads)`);
          }
          
          // Yield to event loop every batch to prevent blocking
          if (i + SAVE_BATCH_SIZE < discoveredAssets.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        // Force final persistence to IndexedDB
        if (this.workloadRepository._forcePersist) {
          await this.workloadRepository._forcePersist();
        }
        
        console.log(`DiscoveryAgent: Successfully saved ${savedCount.toLocaleString()}/${discoveredAssets.length.toLocaleString()} workloads to IndexedDB`);
      }, 35);

      // Step 3: Dependency Mapping
      const dependencyMap = await this.executeStep('Mapping dependencies', async () => {
        this.think(`Analyzing dependencies between ${discoveredAssets.length} discovered assets`);
        return await this.mapDependencies(discoveredAssets);
      }, 50);

      // Step 4: Performance Analysis
      const performanceData = await this.executeStep('Analyzing performance', async () => {
        this.think('Collecting performance metrics and utilization data');
        return await this.analyzePerformance(discoveredAssets);
      }, 70);

      // Step 5: Generate Assessment
      const assessment = await this.executeStep('Generating assessment', async () => {
        this.think('Calculating readiness scores and migration recommendations');
        return await this.generateAssessment({
          assets: discoveredAssets,
          dependencies: dependencyMap,
          performance: performanceData,
        });
      }, 90);

      // Step 6: Generate Recommendations
      await this.executeStep('Generating recommendations', async () => {
        this.think('Creating migration wave suggestions and optimization opportunities');
        await new Promise(resolve => requestAnimationFrame(resolve));
      }, 100);

      const result = {
        status: 'success',
        summary: {
          totalAssets: discoveredAssets.length,
          virtualMachines: discoveredAssets.filter(a => a.type === 'vm').length,
          databases: discoveredAssets.filter(a => a.type === 'database').length,
          applications: discoveredAssets.filter(a => a.type === 'application').length,
          storage: discoveredAssets.filter(a => a.type === 'storage').length,
        },
        assets: discoveredAssets,
        dependencies: dependencyMap,
        performance: performanceData,
        assessment: assessment,
        recommendations: this.generateRecommendations(assessment),
      };

      this.setCompleted(result);
      return result;
    } catch (error) {
      this.setError(error);
      throw new Error(`Discovery failed: ${error.message}`);
    }
  }

  /**
   * Discover assets using GCP Migration Centre API
   */
  async discoverAssets(targets, scanType) {
    // In production, this would call Google Cloud Migration Centre API
    // For PoC, we'll simulate the discovery process

    return new Promise((resolve) => {
      setTimeout(() => {
        const mockAssets = [
          {
            id: 'vm-001',
            name: 'web-server-01',
            type: 'vm',
            os: 'Ubuntu 20.04 LTS',
            cpu: 4,
            memory: 16, // GB
            storage: 100, // GB
            network: 'vlan-10',
            ipAddress: '10.0.1.10',
            tags: ['web', 'production'],
            utilization: {
              cpu: 45,
              memory: 62,
              storage: 73,
              network: 120, // Mbps
            },
            compatibility: {
              gcpReady: true,
              issues: [],
              recommendedInstance: 'n2-standard-4',
            },
          },
          {
            id: 'vm-002',
            name: 'app-server-02',
            type: 'vm',
            os: 'CentOS 7',
            cpu: 8,
            memory: 32, // GB
            storage: 200, // GB
            network: 'vlan-10',
            ipAddress: '10.0.1.11',
            tags: ['application', 'production'],
            utilization: {
              cpu: 35,
              memory: 48,
              storage: 65,
              network: 80,
            },
            compatibility: {
              gcpReady: true,
              issues: [],
              recommendedInstance: 'n2-standard-8',
            },
          },
          {
            id: 'db-001',
            name: 'primary-database',
            type: 'database',
            engine: 'PostgreSQL 12',
            version: '12.5',
            cpu: 8,
            memory: 32, // GB
            storage: 500, // GB
            tags: ['database', 'critical', 'production'],
            utilization: {
              cpu: 65,
              memory: 78,
              storage: 82,
              connections: 45,
            },
            compatibility: {
              gcpReady: true,
              issues: [],
              recommendedService: 'Cloud SQL for PostgreSQL',
            },
          },
          {
            id: 'db-002',
            name: 'analytics-database',
            type: 'database',
            engine: 'MySQL 8.0',
            version: '8.0.25',
            cpu: 4,
            memory: 16, // GB
            storage: 1000, // GB
            tags: ['database', 'analytics'],
            utilization: {
              cpu: 25,
              memory: 35,
              storage: 85,
              connections: 12,
            },
            compatibility: {
              gcpReady: true,
              issues: [],
              recommendedService: 'Cloud SQL for MySQL',
            },
          },
          {
            id: 'storage-001',
            name: 'file-storage',
            type: 'storage',
            size: 5000, // GB
            storageType: 'NFS',
            tags: ['storage', 'shared'],
            utilization: {
              used: 3200, // GB
              available: 1800, // GB
            },
            compatibility: {
              gcpReady: true,
              issues: [],
              recommendedService: 'Cloud Filestore',
            },
          },
          {
            id: 'app-001',
            name: 'web-application',
            type: 'application',
            platform: 'Java',
            version: 'Spring Boot 2.5',
            dependencies: ['db-001', 'storage-001'],
            tags: ['application', 'critical'],
            compatibility: {
              gcpReady: true,
              issues: ['Requires refactoring for cloud-native'],
              recommendedService: 'GKE',
              modernizationStrategy: 'containerize',
            },
          },
          {
            id: 'app-002',
            name: 'legacy-mainframe',
            type: 'application',
            platform: 'COBOL',
            version: 'legacy',
            dependencies: [],
            tags: ['application', 'legacy', 'critical'],
            compatibility: {
              gcpReady: false,
              issues: ['Requires complete rewrite', 'No direct cloud equivalent'],
              recommendedService: 'Compute Engine + Emulation',
              modernizationStrategy: 'rewrite',
            },
          },
        ];

        // Filter based on scan type
        if (scanType === 'quick') {
          resolve(mockAssets.slice(0, 3));
        } else {
          resolve(mockAssets);
        }
      }, 1500);
    });
  }

  /**
   * Map dependencies between assets
   */
  async mapDependencies(assets) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const dependencies = {
          nodes: assets.map(asset => ({
            id: asset.id,
            name: asset.name,
            type: asset.type,
            group: asset.type,
          })),
          links: [
            { source: 'vm-001', target: 'app-001', type: 'hosts' },
            { source: 'vm-002', target: 'app-001', type: 'hosts' },
            { source: 'app-001', target: 'db-001', type: 'connects' },
            { source: 'app-001', target: 'storage-001', type: 'uses' },
            { source: 'db-001', target: 'db-002', type: 'replicates' },
            { source: 'vm-001', target: 'vm-002', type: 'load_balanced' },
          ],
          criticalPaths: [
            ['vm-001', 'app-001', 'db-001'],
            ['vm-002', 'app-001', 'db-001'],
          ],
        };
        resolve(dependencies);
      }, 1000);
    });
  }

  /**
   * Analyze performance metrics
   */
  async analyzePerformance(assets) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const performanceAnalysis = {
          overall: {
            cpuUtilization: 51,
            memoryUtilization: 64,
            storageUtilization: 68,
            networkUtilization: 45,
            healthScore: 78,
          },
          trends: {
            cpuTrend: 'stable',
            memoryTrend: 'increasing',
            storageTrend: 'increasing',
            networkTrend: 'stable',
          },
          anomalies: [
            {
              assetId: 'db-002',
              type: 'storage',
              severity: 'medium',
              description: 'Storage utilization above 80% threshold',
              recommendation: 'Increase storage capacity before migration',
            },
            {
              assetId: 'app-002',
              type: 'compatibility',
              severity: 'high',
              description: 'Legacy application requires modernization',
              recommendation: 'Plan for application rewrite or refactoring',
            },
          ],
          rightsizingOpportunities: [
            {
              assetId: 'vm-001',
              currentConfig: { cpu: 4, memory: 16 },
              recommendedConfig: { cpu: 2, memory: 8 },
              potentialSavings: 45,
              reason: 'Consistently under-utilized CPU and memory',
            },
            {
              assetId: 'db-002',
              currentConfig: { cpu: 8, memory: 32 },
              recommendedConfig: { cpu: 4, memory: 16 },
              potentialSavings: 50,
              reason: 'Low utilization analytics workload',
            },
          ],
        };
        resolve(performanceAnalysis);
      }, 800);
    });
  }

  /**
   * Generate comprehensive assessment
   */
  async generateAssessment(data) {
    const { assets, dependencies, performance } = data;

    return {
      readinessScore: this.calculateReadinessScore(assets),
      complexityScore: this.calculateComplexityScore(assets, dependencies),
      riskAssessment: this.assessRisks(assets, dependencies),
      migrationWaves: this.suggestMigrationWaves(assets, dependencies),
      estimatedTimeline: this.estimateTimeline(assets),
      costEstimate: this.estimateCosts(assets),
    };
  }

  /**
   * Calculate cloud readiness score
   */
  calculateReadinessScore(assets) {
    let readyCount = 0;
    let totalCount = assets.length;

    assets.forEach(asset => {
      if (asset.compatibility?.gcpReady) {
        readyCount++;
      }
    });

    const percentage = (readyCount / totalCount) * 100;

    return {
      score: Math.round(percentage),
      ready: readyCount,
      total: totalCount,
      rating: percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : percentage >= 40 ? 'Fair' : 'Poor',
    };
  }

  /**
   * Calculate migration complexity
   */
  calculateComplexityScore(assets, dependencies) {
    let complexity = 0;

    complexity += Math.min(assets.length * 0.5, 20);
    const avgDependencies = dependencies.links.length / assets.length;
    complexity += Math.min(avgDependencies * 5, 30);
    const legacyCount = assets.filter(a => !a.compatibility?.gcpReady).length;
    complexity += legacyCount * 10;

    return {
      score: Math.round(Math.min(complexity, 100)),
      level: complexity < 30 ? 'Low' : complexity < 60 ? 'Medium' : 'High',
      factors: {
        assetCount: assets.length,
        dependencyCount: dependencies.links.length,
        legacySystemCount: legacyCount,
      },
    };
  }

  /**
   * Assess migration risks
   */
  assessRisks(assets, dependencies) {
    const risks = [];

    const criticalAssets = assets.filter(a => a.tags?.includes('critical'));
    if (criticalAssets.length > 0) {
      risks.push({
        category: 'Business Continuity',
        severity: 'high',
        description: `${criticalAssets.length} critical systems require careful migration planning`,
        mitigation: 'Implement robust rollback procedures and pilot testing',
      });
    }

    const legacySystems = assets.filter(a => !a.compatibility?.gcpReady);
    if (legacySystems.length > 0) {
      risks.push({
        category: 'Technical',
        severity: 'high',
        description: `${legacySystems.length} legacy systems may require modernization`,
        mitigation: 'Budget for refactoring or replatforming efforts',
      });
    }

    if (dependencies.criticalPaths.length > 5) {
      risks.push({
        category: 'Complexity',
        severity: 'medium',
        description: 'Complex dependency chains may complicate migration',
        mitigation: 'Use phased migration approach with careful sequencing',
      });
    }

    return risks;
  }

  /**
   * Suggest migration waves
   */
  suggestMigrationWaves(assets, dependencies) {
    const wave1 = assets.filter(a =>
      a.compatibility?.gcpReady && !a.tags?.includes('critical')
    ).slice(0, 2);

    const wave2 = assets.filter(a =>
      a.compatibility?.gcpReady &&
      a.tags?.includes('production') &&
      !a.tags?.includes('critical')
    );

    const wave3 = assets.filter(a =>
      a.tags?.includes('critical') &&
      a.compatibility?.gcpReady
    );

    const wave4 = assets.filter(a => !a.compatibility?.gcpReady);

    return [
      { wave: 1, name: 'Pilot/PoC', assets: wave1, duration: '2-4 weeks' },
      { wave: 2, name: 'Production Workloads', assets: wave2, duration: '4-8 weeks' },
      { wave: 3, name: 'Critical Systems', assets: wave3, duration: '8-12 weeks' },
      { wave: 4, name: 'Legacy Modernization', assets: wave4, duration: '12-24 weeks' },
    ].filter(w => w.assets.length > 0);
  }

  /**
   * Estimate migration timeline
   */
  estimateTimeline(assets) {
    const weeks = assets.length * 1.5;
    const months = Math.ceil(weeks / 4);

    return {
      totalWeeks: Math.round(weeks),
      totalMonths: months,
      phases: {
        assessment: '2-3 weeks',
        planning: '2-4 weeks',
        migration: `${Math.round(weeks * 0.6)} weeks`,
        testing: '4-6 weeks',
        optimization: '2-4 weeks',
      },
    };
  }

  /**
   * Estimate migration costs
   */
  estimateCosts(assets) {
    let totalCost = 0;

    assets.forEach(asset => {
      switch (asset.type) {
        case 'vm':
          totalCost += 5000;
          break;
        case 'database':
          totalCost += 15000;
          break;
        case 'application':
          totalCost += 10000;
          break;
        case 'storage':
          totalCost += 2000;
          break;
        default:
          totalCost += 3000;
      }
    });

    return {
      total: totalCost,
      breakdown: {
        assessment: totalCost * 0.1,
        migration: totalCost * 0.6,
        testing: totalCost * 0.2,
        optimization: totalCost * 0.1,
      },
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(assessment) {
    const recommendations = [];

    if (assessment.readinessScore.score < 60) {
      recommendations.push({
        priority: 'high',
        category: 'Readiness',
        recommendation: 'Focus on improving cloud readiness before migration',
        action: 'Address compatibility issues and modernize legacy systems',
      });
    }

    if (assessment.complexityScore.level === 'High') {
      recommendations.push({
        priority: 'high',
        category: 'Complexity',
        recommendation: 'Consider phased migration approach',
        action: 'Break down complex migrations into smaller, manageable waves',
      });
    }

    if (assessment.riskAssessment.length > 3) {
      recommendations.push({
        priority: 'medium',
        category: 'Risk',
        recommendation: 'Develop comprehensive risk mitigation strategy',
        action: 'Create detailed rollback plans and testing procedures',
      });
    }

    return recommendations;
  }
}

export default DiscoveryAgent;
