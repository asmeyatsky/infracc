/**
 * Dependency Injection Container
 * 
 * Architectural Intent:
 * - Centralizes dependency wiring
 * - Provides single source of truth for dependencies
 * - Enables easy testing with mocks
 * - Follows dependency inversion principle
 */

// Domain Services
import { WorkloadAssessmentService } from '../../domain/services/WorkloadAssessmentService.js';

// Ports (Interfaces)
import { CodeModPort } from '../../domain/ports/CodeModPort.js';
import { ServiceMappingPort } from '../../domain/ports/ServiceMappingPort.js';
import { WorkloadRepositoryPort } from '../../domain/ports/WorkloadRepositoryPort.js';
import { PricingPort } from '../../domain/ports/PricingPort.js';

// Infrastructure Adapters
import { CodeModAdapter } from '../adapters/CodeModAdapter.js';
import { ServiceMappingRepository } from '../repositories/ServiceMappingRepository.js';
import { WorkloadRepository } from '../repositories/WorkloadRepository.js';
import CloudPricingAPI from '../../utils/cloudPricingAPI.js';

// Application Use Cases
import { AssessWorkloadUseCase } from '../../application/use_cases/AssessWorkloadUseCase.js';
import { GenerateMigrationPlanUseCase } from '../../application/use_cases/GenerateMigrationPlanUseCase.js';
import { CalculateTCOUseCase } from '../../application/use_cases/CalculateTCOUseCase.js';
import { PlanMigrationWavesUseCase } from '../../application/use_cases/PlanMigrationWavesUseCase.js';

/**
 * Dependency Injection Container
 * 
 * Key Design Decisions:
 * 1. All dependencies are created here
 * 2. Easy to swap implementations (e.g., mock repositories for testing)
 * 3. Single point of configuration
 * 4. Follows Hollywood Principle: "Don't call us, we'll call you"
 */
export class Container {
  constructor(config = {}) {
    this.config = {
      useCodeMod: config.useCodeMod !== false,
      useMockPricing: config.useMockPricing !== false,
      codeModApiKey: config.codeModApiKey || process.env.REACT_APP_CODEMOD_API_KEY,
      ...config
    };

    // Initialize dependencies
    this._initializeDependencies();
  }

  /**
   * Initialize all dependencies
   * @private
   */
  _initializeDependencies() {
    // Infrastructure layer (adapters and repositories)
    this._codeModPort = new CodeModAdapter({
      apiKey: this.config.codeModApiKey,
      useMock: !this.config.useCodeMod || !this.config.codeModApiKey
    });

    this._serviceMappingPort = new ServiceMappingRepository({
      useOfficialDocs: true // Use official Google Cloud documentation
    });

    this._workloadRepository = new WorkloadRepository({
      storageKey: 'migration_workloads'
    });

    this._pricingPort = this._createPricingAdapter();

    // Domain services
    this._workloadAssessmentService = new WorkloadAssessmentService();

    // Application use cases
    this._assessWorkloadUseCase = new AssessWorkloadUseCase({
      assessmentService: this._workloadAssessmentService,
      codeModPort: this._codeModPort,
      workloadRepository: this._workloadRepository
    });

    this._generateMigrationPlanUseCase = new GenerateMigrationPlanUseCase({
      serviceMappingPort: this._serviceMappingPort,
      workloadRepository: this._workloadRepository,
      codeModPort: this._codeModPort
    });

    this._calculateTCOUseCase = new CalculateTCOUseCase({
      pricingPort: this._pricingPort,
      workloadRepository: this._workloadRepository
    });

    this._planMigrationWavesUseCase = new PlanMigrationWavesUseCase({
      workloadRepository: this._workloadRepository,
      serviceMappingPort: this._serviceMappingPort
    });
  }

  /**
   * Get all dependencies (for agentic layer)
   * @returns {Object} All dependencies
   */
  getAllDependencies() {
    return {
      assessWorkloadUseCase: this._assessWorkloadUseCase,
      generateMigrationPlanUseCase: this._generateMigrationPlanUseCase,
      calculateTCOUseCase: this._calculateTCOUseCase,
      planMigrationWavesUseCase: this._planMigrationWavesUseCase,
      workloadAssessmentService: this._workloadAssessmentService,
      codeModPort: this._codeModPort,
      serviceMappingPort: this._serviceMappingPort,
      workloadRepository: this._workloadRepository,
      pricingPort: this._pricingPort
    };
  }

  /**
   * Create pricing adapter
   * @private
   */
  _createPricingAdapter() {
    // For now, we'll create a simple adapter that wraps CloudPricingAPI
    // In a full implementation, this would implement PricingPort
    return {
      getPricing: async (request) => {
        const { provider, serviceType, region, configuration } = request;
        
        if (provider === 'aws') {
          const price = await CloudPricingAPI.getAWSPrices(serviceType, region);
          return {
            onDemandPrice: price || 0,
            currency: 'USD',
            unit: 'per-hour'
          };
        } else if (provider === 'azure') {
          const price = await CloudPricingAPI.getAzurePrices(serviceType, region);
          return {
            onDemandPrice: price || 0,
            currency: 'USD',
            unit: 'per-hour'
          };
        } else if (provider === 'gcp') {
          const price = await CloudPricingAPI.getGCPPrices(serviceType, region);
          return {
            onDemandPrice: price || 0,
            currency: 'USD',
            unit: 'per-hour'
          };
        }
        
        return {
          onDemandPrice: 0,
          currency: 'USD',
          unit: 'per-hour'
        };
      },
      isAvailable: async () => true
    };
  }

  // Getters for dependencies
  get codeModPort() {
    return this._codeModPort;
  }

  get serviceMappingPort() {
    return this._serviceMappingPort;
  }

  get workloadRepository() {
    return this._workloadRepository;
  }

  get pricingPort() {
    return this._pricingPort;
  }

  get workloadAssessmentService() {
    return this._workloadAssessmentService;
  }

  get assessWorkloadUseCase() {
    return this._assessWorkloadUseCase;
  }

  get generateMigrationPlanUseCase() {
    return this._generateMigrationPlanUseCase;
  }

  get calculateTCOUseCase() {
    return this._calculateTCOUseCase;
  }

  get planMigrationWavesUseCase() {
    return this._planMigrationWavesUseCase;
  }
}

// Singleton instance
let containerInstance = null;

/**
 * Get container instance (singleton)
 * @param {Object} config 
 * @returns {Container}
 */
export function getContainer(config = {}) {
  if (!containerInstance) {
    containerInstance = new Container(config);
  }
  return containerInstance;
}

/**
 * Reset container (for testing)
 */
export function resetContainer() {
  containerInstance = null;
}

export default Container;
