# Clean Architecture Implementation

## Overview

This application follows **Clean Architecture** (also known as Hexagonal Architecture) principles as defined in `SKILL.md`. The architecture ensures:

- **Separation of Concerns**: Each layer has a single, well-defined responsibility
- **Domain-Driven Design**: Business logic is encapsulated in domain models
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Testability**: Each layer can be tested independently

## Architecture Layers

### 1. Domain Layer (Core Business Logic)

**Location**: `src/domain/`

**Purpose**: Contains all business logic and domain rules. This layer has **NO dependencies** on infrastructure or frameworks.

#### Structure:
```
domain/
├── entities/          # Aggregate roots with business logic
│   ├── Workload.js
│   ├── Assessment.js
│   └── ServiceMapping.js
├── value_objects/     # Immutable value objects
│   ├── CloudProvider.js
│   ├── MigrationStrategyType.js
│   ├── EffortLevel.js
│   ├── WorkloadType.js
│   └── Money.js
├── services/         # Domain services (stateless business logic)
│   └── WorkloadAssessmentService.js
└── ports/            # Interfaces (contracts) for external dependencies
    ├── CodeModPort.js
    ├── PricingPort.js
    ├── ServiceMappingPort.js
    └── WorkloadRepositoryPort.js
```

#### Key Principles:
- **Entities** are aggregate roots with identity and business rules
- **Value Objects** are immutable and compared by value
- **Domain Services** contain business logic that doesn't fit in a single entity
- **Ports** define interfaces (contracts) that infrastructure must implement

#### Example:
```javascript
// Domain Entity - encapsulates business rules
const workload = new Workload({
  name: 'Web Server',
  cpu: 4,
  memory: 8,
  // ...
});

// Business logic is in the entity
workload.isLargeWorkload(); // true if cpu >= 16 or memory >= 64
workload.calculateResourceScore(); // prioritization logic
```

### 2. Application Layer (Use Cases)

**Location**: `src/application/use_cases/`

**Purpose**: Orchestrates domain objects to fulfill application use cases. Coordinates between domain and infrastructure layers.

#### Structure:
```
application/
└── use_cases/
    ├── AssessWorkloadUseCase.js
    └── GenerateMigrationPlanUseCase.js
```

#### Key Principles:
- **One use case per class** - each use case handles one business operation
- **Orchestrates domain objects** - coordinates entities and services
- **No business logic** - delegates to domain layer
- **Handles application concerns** - error handling, validation, coordination

#### Example:
```javascript
// Use case orchestrates domain logic
const useCase = new AssessWorkloadUseCase({
  assessmentService: assessmentService,
  codeModPort: codeModPort,
  workloadRepository: workloadRepository
});

// Execute use case
const assessment = await useCase.execute({
  workloadId: 'workload_123',
  includeCodeMod: true
});
```

### 3. Infrastructure Layer (External Concerns)

**Location**: `src/infrastructure/`

**Purpose**: Implements ports (interfaces) defined in domain layer. Handles external systems, persistence, APIs.

#### Structure:
```
infrastructure/
├── adapters/          # External service adapters
│   └── CodeModAdapter.js
├── repositories/      # Persistence implementations
│   ├── ServiceMappingRepository.js
│   └── WorkloadRepository.js
└── dependency_injection/
    └── Container.js   # Dependency wiring
```

#### Key Principles:
- **Implements ports** - all adapters implement interfaces from domain layer
- **Isolated from domain** - domain layer doesn't know about implementations
- **Can be swapped** - easy to replace implementations (e.g., mock for testing)
- **Handles technical concerns** - API calls, serialization, storage

#### Example:
```javascript
// Infrastructure adapter implements domain port
class CodeModAdapter extends CodeModPort {
  async analyzeCode(request) {
    // Makes API call to Google Cloud CodeMod
    const response = await fetch('https://codemod.googleapis.com/v1/analyze', {
      // ...
    });
    return this._mapApiResponseToResult(response);
  }
}
```

### 4. Presentation Layer (UI)

**Location**: `src/presentation/components/`

**Purpose**: React components that display data and handle user interactions. **NO business logic**.

#### Structure:
```
presentation/
└── components/
    └── EnhancedAssessment.js
```

#### Key Principles:
- **UI only** - no business logic, no domain knowledge
- **Uses use cases** - all business operations go through use cases
- **Delegates to application layer** - never calls domain directly
- **Handles presentation concerns** - UI state, user interactions, display

#### Example:
```javascript
// Presentation component uses use cases
function EnhancedAssessment({ workloads }) {
  const container = getContainer();
  const assessUseCase = container.assessWorkloadUseCase;

  const handleAssess = async (workloadId) => {
    // Use case handles all business logic
    const assessment = await assessUseCase.execute({
      workloadId,
      includeCodeMod: true
    });
    // Update UI state
  };

  return <div>...</div>;
}
```

## Dependency Flow

```
Presentation Layer
    ↓ (depends on)
Application Layer (Use Cases)
    ↓ (depends on)
Domain Layer (Entities, Services, Ports)
    ↑ (implemented by)
Infrastructure Layer (Adapters, Repositories)
```

**Key Rule**: Dependencies always point inward. Outer layers depend on inner layers, never the reverse.

## Dependency Injection

All dependencies are wired in `Container.js`:

```javascript
// Container creates and wires all dependencies
const container = getContainer();

// Presentation layer gets use cases from container
const assessUseCase = container.assessWorkloadUseCase;
```

## Key Features

### 1. Infrastructure Assessment

- **Domain Service**: `WorkloadAssessmentService`
- **Use Case**: `AssessWorkloadUseCase`
- **Features**:
  - Complexity scoring (1-10)
  - Risk factor identification
  - Resource compatibility assessment
  - Recommendations generation

### 2. Application Assessment with CodeMod

- **Port**: `CodeModPort` (interface)
- **Adapter**: `CodeModAdapter` (implementation)
- **Integration**: Google Cloud CodeMod API
- **Features**:
  - Source code analysis
  - Service mapping detection
  - Code change recommendations
  - Dependency analysis

### 3. Service Mapping

- **Entity**: `ServiceMapping`
- **Repository**: `ServiceMappingRepository`
- **Features**:
  - AWS/Azure to GCP mappings
  - Migration strategy recommendations (6 R's)
  - Effort level assessment
  - CodeMod-enhanced mappings

### 4. Migration Planning

- **Use Case**: `GenerateMigrationPlanUseCase`
- **Features**:
  - Wave planning (1-3)
  - Strategy distribution
  - Effort estimation
  - Complexity analysis

## Testing Strategy

### Domain Layer Tests
- **Unit tests** for entities and value objects
- **Domain service tests** with mocked dependencies
- **Business rule validation**

### Application Layer Tests
- **Use case tests** with mocked ports
- **Integration tests** for use case orchestration

### Infrastructure Layer Tests
- **Adapter tests** with mocked APIs
- **Repository tests** with test data

### Presentation Layer Tests
- **Component tests** with mocked use cases
- **UI interaction tests**

## Migration from Old Architecture

### Before (Anemic Domain)
```javascript
// Business logic in component
function Assessment({ workload }) {
  const complexity = workload.cpu >= 16 ? 'high' : 'low'; // ❌ Business logic in UI
  // ...
}
```

### After (Rich Domain)
```javascript
// Business logic in domain
const workload = new Workload({ cpu: 16, ... });
workload.isLargeWorkload(); // ✅ Business logic in domain

// UI uses use case
const assessment = await assessUseCase.execute({ workloadId }); // ✅ Clean separation
```

## Benefits

1. **Maintainability**: Clear separation of concerns
2. **Testability**: Each layer can be tested independently
3. **Flexibility**: Easy to swap implementations (e.g., mock for testing)
4. **Scalability**: Easy to add new features without breaking existing code
5. **Enterprise-Grade**: Follows industry best practices

## Next Steps

1. ✅ Domain layer structure
2. ✅ Application layer (use cases)
3. ✅ Infrastructure layer (adapters, repositories)
4. ✅ Dependency injection container
5. ✅ Presentation layer refactoring
6. ⏳ Comprehensive tests
7. ⏳ Additional use cases (TCO calculation, wave planning)
8. ⏳ Enhanced CodeMod integration
