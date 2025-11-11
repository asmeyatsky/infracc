/**
 * Domain Layer Public API
 * 
 * Exports all domain entities, value objects, services, and ports
 */

// Entities
export { default as Workload } from './entities/Workload.js';
export { default as Assessment, AssessmentType } from './entities/Assessment.js';
export { default as ServiceMapping } from './entities/ServiceMapping.js';

// Value Objects
export { default as CloudProvider, CloudProviderType } from './value_objects/CloudProvider.js';
export { default as MigrationStrategyType, MigrationStrategy } from './value_objects/MigrationStrategyType.js';
export { default as EffortLevel, EffortLevelType } from './value_objects/EffortLevel.js';
export { default as WorkloadType, WorkloadTypeEnum } from './value_objects/WorkloadType.js';
export { default as Money } from './value_objects/Money.js';

// Domain Services
export { default as WorkloadAssessmentService } from './services/WorkloadAssessmentService.js';

// Ports (Interfaces)
export { default as CodeModPort, CodeModAnalysisRequest, CodeModAnalysisResult } from './ports/CodeModPort.js';
export { default as PricingPort, PricingRequest, PricingResponse } from './ports/PricingPort.js';
export { default as ServiceMappingPort } from './ports/ServiceMappingPort.js';
export { default as WorkloadRepositoryPort } from './ports/WorkloadRepositoryPort.js';
