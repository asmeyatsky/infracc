/**
 * Agentic Container
 * 
 * Architectural Intent:
 * - Dependency injection for agentic layer
 * - Wires agents with use cases from Clean Architecture
 * - Enables agent configuration
 * - Maintains separation between agentic and application layers
 */

import { getContainer } from '../../infrastructure/dependency_injection/Container.js';
import AssessmentAgent from '../agents/AssessmentAgent.js';
import PlanningAgent from '../agents/PlanningAgent.js';
import CostAnalysisAgent from '../agents/CostAnalysisAgent.js';
import DiscoveryAgent from '../agents/DiscoveryAgent.js';
import OnboardingAgent from '../agents/OnboardingAgent.js';
import StrategyAgent from '../agents/StrategyAgent.js';
import CodeModAgent from '../agents/CodeModAgent.js';
import AssistantAgent from '../agents/AssistantAgent.js';
import AgenticOrchestrator from '../orchestration/AgenticOrchestrator.js';

/**
 * Agentic Container
 * 
 * Provides agents with access to Clean Architecture use cases
 */
export class AgenticContainer {
  /**
   * @param {Object} config
   * @param {Object} config.aiConfig - AI configuration
   * @param {Object} config.container - Clean Architecture container (optional)
   */
  constructor(config = {}) {
    this.aiConfig = config.aiConfig || {};
    
    // Get Clean Architecture container
    this.container = config.container || getContainer();

    // Initialize agents
    this._initializeAgents();
  }

  /**
   * Initialize all agents
   * @private
   */
  _initializeAgents() {
    // Assessment Agent
    this._assessmentAgent = new AssessmentAgent({
      assessWorkloadUseCase: this.container.assessWorkloadUseCase,
      assessmentService: this.container.workloadAssessmentService,
      aiConfig: this.aiConfig
    });

    // Planning Agent
    this._planningAgent = new PlanningAgent({
      generateMigrationPlanUseCase: this.container.generateMigrationPlanUseCase,
      planMigrationWavesUseCase: this.container.planMigrationWavesUseCase,
      aiConfig: this.aiConfig
    });

    // Cost Analysis Agent
    this._costAnalysisAgent = new CostAnalysisAgent({
      calculateTCOUseCase: this.container.calculateTCOUseCase,
      aiConfig: this.aiConfig
    });

    // Discovery Agent
    this._discoveryAgent = new DiscoveryAgent({
      apiConfig: this.aiConfig,
      aiConfig: this.aiConfig,
      workloadRepository: this.container.workloadRepository
    });

    // Onboarding Agent
    this._onboardingAgent = new OnboardingAgent({
      aiConfig: this.aiConfig
    });

    // Strategy Agent
    this._strategyAgent = new StrategyAgent({
      aiConfig: this.aiConfig
    });

    // CodeMod Agent
    this._codeModAgent = new CodeModAgent({
      aiConfig: this.aiConfig
    });

    // Assistant Agent
    this._assistantAgent = new AssistantAgent({
      apiConfig: this.aiConfig,
      aiConfig: this.aiConfig
    });

    // Agentic Orchestrator
    this._orchestrator = new AgenticOrchestrator({
      assessWorkloadUseCase: this.container.assessWorkloadUseCase,
      generateMigrationPlanUseCase: this.container.generateMigrationPlanUseCase,
      planMigrationWavesUseCase: this.container.planMigrationWavesUseCase,
      calculateTCOUseCase: this.container.calculateTCOUseCase,
      workloadAssessmentService: this.container.workloadAssessmentService,
      aiConfig: this.aiConfig
    });
  }

  // Getters for agents
  get assessmentAgent() {
    return this._assessmentAgent;
  }

  get planningAgent() {
    return this._planningAgent;
  }

  get costAnalysisAgent() {
    return this._costAnalysisAgent;
  }

  get discoveryAgent() {
    return this._discoveryAgent;
  }

  get onboardingAgent() {
    return this._onboardingAgent;
  }

  get strategyAgent() {
    return this._strategyAgent;
  }

  get codeModAgent() {
    return this._codeModAgent;
  }

  get assistantAgent() {
    return this._assistantAgent;
  }

  get orchestrator() {
    return this._orchestrator;
  }

  // Get Clean Architecture container (accessor)
  get architectureContainer() {
    return this._architectureContainer;
  }
}

// Singleton instance
let agenticContainerInstance = null;

/**
 * Get agentic container instance (singleton)
 * @param {Object} config 
 * @returns {AgenticContainer}
 */
export function getAgenticContainer(config = {}) {
  if (!agenticContainerInstance) {
    agenticContainerInstance = new AgenticContainer(config);
  }
  return agenticContainerInstance;
}

/**
 * Reset agentic container (for testing)
 */
export function resetAgenticContainer() {
  agenticContainerInstance = null;
}

export default AgenticContainer;
