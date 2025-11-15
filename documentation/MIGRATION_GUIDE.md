# Migration Guide: Using Clean Architecture

This guide explains how to use the new Clean Architecture implementation in your components.

## Quick Start

### 1. Get Dependencies from Container

```javascript
import { getContainer } from './infrastructure/dependency_injection/Container.js';

// Get container instance
const container = getContainer();

// Access use cases
const assessUseCase = container.assessWorkloadUseCase;
const migrationPlanUseCase = container.generateMigrationPlanUseCase;
const tcoUseCase = container.calculateTCOUseCase;
const wavePlanUseCase = container.planMigrationWavesUseCase;
```

### 2. Use Domain Entities

```javascript
import { Workload } from './domain/entities/Workload.js';
import { CloudProvider, CloudProviderType } from './domain/value_objects/CloudProvider.js';

// Create domain entity
const workload = new Workload({
  name: 'Web Server',
  cpu: 4,
  memory: 8,
  storage: 100,
  monthlyCost: 100,
  sourceProvider: 'aws',
  type: 'vm',
  os: 'linux'
});

// Use domain methods
workload.isLargeWorkload(); // false
workload.calculateResourceScore(); // 0-100 score
```

### 3. Execute Use Cases

```javascript
// Assess workload
const assessment = await assessUseCase.execute({
  workloadId: workload.id,
  includeCodeMod: true
});

// Generate migration plan
const plan = await migrationPlanUseCase.execute({
  workloadIds: [workload.id],
  useCodeMod: true
});

// Calculate TCO
const tcoResult = await tcoUseCase.execute({
  onPremise: { hardware: 1000, ... },
  aws: { ec2Instances: 5, ... },
  gcp: { compute: 5, ... },
  timeframe: 36
});

// Plan migration waves
const wavePlan = await wavePlanUseCase.execute({
  workloadIds: [workload.id]
});
```

## Component Refactoring Examples

### Before (Anemic Domain)

```javascript
// ❌ Business logic in component
function Assessment({ workload }) {
  const complexity = workload.cpu >= 16 ? 'high' : 'low';
  const risks = workload.dependencies ? ['DEPENDENCIES'] : [];
  
  return <div>Complexity: {complexity}</div>;
}
```

### After (Rich Domain)

```javascript
// ✅ Use domain entity and use case
import { getContainer } from './infrastructure/dependency_injection/Container.js';

function EnhancedAssessment({ workloadId }) {
  const container = getContainer();
  const assessUseCase = container.assessWorkloadUseCase;
  const [assessment, setAssessment] = useState(null);

  useEffect(() => {
    assessUseCase.execute({
      workloadId,
      includeCodeMod: true
    }).then(setAssessment);
  }, [workloadId]);

  return (
    <div>
      Complexity: {assessment?.complexityScore}/10
      Risks: {assessment?.riskFactors.join(', ')}
    </div>
  );
}
```

## Available Use Cases

### 1. AssessWorkloadUseCase

**Purpose**: Perform infrastructure and application assessment

**Input**:
```javascript
{
  workloadId: string,
  includeCodeMod: boolean
}
```

**Output**: `Assessment` entity

**Example**:
```javascript
const assessment = await assessUseCase.execute({
  workloadId: 'workload_123',
  includeCodeMod: true
});

console.log(assessment.complexityScore); // 1-10
console.log(assessment.riskFactors); // Array of risk identifiers
console.log(assessment.getReadinessScore()); // 0-100
```

### 2. GenerateMigrationPlanUseCase

**Purpose**: Create comprehensive migration plan with service mappings

**Input**:
```javascript
{
  workloadIds: string[],
  useCodeMod: boolean
}
```

**Output**: Migration plan with service mappings, strategies, and waves

**Example**:
```javascript
const plan = await migrationPlanUseCase.execute({
  workloadIds: ['workload_1', 'workload_2'],
  useCodeMod: true
});

console.log(plan.planItems); // Array of plan items
console.log(plan.waves); // Organized by wave (1, 2, 3)
console.log(plan.metrics); // Summary metrics
```

### 3. CalculateTCOUseCase

**Purpose**: Calculate Total Cost of Ownership across cloud providers

**Input**:
```javascript
{
  onPremise: { hardware: number, ... },
  aws: { ec2Instances: number, ... },
  azure: { virtualMachines: number, ... },
  gcp: { compute: number, ... },
  migration: { assessment: number, ... },
  timeframe: number,
  region: string
}
```

**Output**: `TCOResult` with costs, ROI, and savings

**Example**:
```javascript
const tco = await tcoUseCase.execute({
  onPremise: { hardware: 1000, software: 500 },
  aws: { ec2Instances: 5 },
  gcp: { compute: 5 },
  timeframe: 36
});

console.log(tco.totalGcp.format()); // "$XX,XXX.XX"
console.log(tco.roi.gcp); // ROI percentage
console.log(tco.savings.gcp.format()); // Savings amount
```

### 4. PlanMigrationWavesUseCase

**Purpose**: Organize workloads into migration waves

**Input**:
```javascript
{
  workloadIds: string[]
}
```

**Output**: `WavePlan` with workloads organized by wave

**Example**:
```javascript
const wavePlan = await wavePlanUseCase.execute({
  workloadIds: ['workload_1', 'workload_2']
});

console.log(wavePlan.wave1); // Quick wins
console.log(wavePlan.wave2); // Standard migrations
console.log(wavePlan.wave3); // Complex migrations
console.log(wavePlan.summary); // Summary statistics
```

## Domain Entities

### Workload

**Create**:
```javascript
const workload = new Workload({
  name: 'Web Server',
  cpu: 4,
  memory: 8,
  storage: 100,
  monthlyCost: 100,
  sourceProvider: 'aws',
  type: 'vm',
  os: 'linux'
});
```

**Business Methods**:
- `workload.isLargeWorkload()` - Check if large
- `workload.hasDependencies()` - Check dependencies
- `workload.isWindowsWorkload()` - Check OS
- `workload.calculateResourceScore()` - Get prioritization score
- `workload.assignAssessment(assessment)` - Assign assessment
- `workload.assignMigrationStrategy(strategy)` - Assign strategy

### Assessment

**Properties**:
- `complexityScore` - 1-10
- `riskFactors` - Array of risks
- `recommendations` - Array of recommendations
- `infrastructureAssessment` - Infrastructure data
- `applicationAssessment` - Application data
- `codeModResults` - CodeMod analysis

**Business Methods**:
- `assessment.isComprehensive()` - Has both infra and app
- `assessment.hasCodeModResults()` - Has CodeMod data
- `assessment.isHighComplexity()` - Complexity >= 7
- `assessment.hasHighRisk()` - High risk factors
- `assessment.getReadinessScore()` - 0-100 readiness

### ServiceMapping

**Properties**:
- `sourceService` - Source cloud service
- `gcpService` - Target GCP service
- `migrationStrategy` - 6 R's strategy
- `effort` - Low/Medium/High
- `considerations` - Migration considerations

**Business Methods**:
- `mapping.isDirectMigration()` - Low effort rehost
- `mapping.requiresSignificantChanges()` - High effort
- `mapping.getComplexityScore()` - 1-10 complexity

## Value Objects

### CloudProvider

```javascript
const provider = new CloudProvider('aws');
provider.displayName; // "Amazon Web Services"
provider.isSourceProvider(); // true
provider.isGCP(); // false
```

### MigrationStrategyType

```javascript
const strategy = new MigrationStrategyType('rehost');
strategy.displayName; // "Rehost (Lift & Shift)"
strategy.requiresSignificantChanges(); // false
```

### EffortLevel

```javascript
const effort = new EffortLevel('high');
effort.displayName; // "High Effort"
effort.score; // 3
effort.estimatedDuration; // 16 weeks
```

### Money

```javascript
const cost = new Money(1000);
const total = cost.add(new Money(500)); // New Money(1500)
cost.format(); // "$1,000.00"
cost.isPositive(); // true
```

## Best Practices

### 1. Always Use Use Cases

❌ **Don't**: Call domain services directly
```javascript
// ❌ Bad
const assessmentService = new WorkloadAssessmentService();
const assessment = assessmentService.assessComplexity(workload);
```

✅ **Do**: Use use cases
```javascript
// ✅ Good
const assessment = await assessUseCase.execute({ workloadId });
```

### 2. Use Domain Entities

❌ **Don't**: Use plain objects
```javascript
// ❌ Bad
const workload = { name: 'Server', cpu: 4 };
if (workload.cpu >= 16) { /* ... */ }
```

✅ **Do**: Use domain entities
```javascript
// ✅ Good
const workload = new Workload({ name: 'Server', cpu: 4 });
if (workload.isLargeWorkload()) { /* ... */ }
```

### 3. Handle Errors

```javascript
try {
  const assessment = await assessUseCase.execute({ workloadId });
} catch (error) {
  console.error('Assessment failed:', error);
  // Show user-friendly error message
}
```

### 4. Use Repository for Persistence

```javascript
const container = getContainer();
const repository = container.workloadRepository;

// Save
await repository.save(workload);

// Find
const workload = await repository.findById(id);

// Find all
const workloads = await repository.findAll();
```

## Testing

### Test Domain Logic

```javascript
import { Workload } from './domain/entities/Workload.js';

describe('Workload', () => {
  it('should identify large workloads', () => {
    const workload = new Workload({
      name: 'Large',
      cpu: 32,
      memory: 8,
      sourceProvider: 'aws'
    });
    expect(workload.isLargeWorkload()).toBe(true);
  });
});
```

### Test Use Cases with Mocks

```javascript
import { AssessWorkloadUseCase } from './application/use_cases/AssessWorkloadUseCase.js';

// Mock dependencies
const mockRepository = {
  findById: jest.fn().mockResolvedValue(workload),
  save: jest.fn()
};

const useCase = new AssessWorkloadUseCase({
  assessmentService: mockService,
  codeModPort: mockCodeMod,
  workloadRepository: mockRepository
});
```

## Migration Checklist

- [ ] Replace business logic in components with use cases
- [ ] Convert plain objects to domain entities
- [ ] Use repository for persistence
- [ ] Remove direct API calls (use adapters)
- [ ] Add error handling
- [ ] Write tests for domain logic
- [ ] Update documentation

## Need Help?

- See `ARCHITECTURE.md` for architecture details
- See `REFACTORING_SUMMARY.md` for what changed
- See component examples in `src/presentation/components/`
