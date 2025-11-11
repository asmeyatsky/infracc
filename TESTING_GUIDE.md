# Testing Guide

## Pre-Testing Checklist ✅

### Completed Before Testing

1. ✅ **Error Boundary** - Added to App.js
2. ✅ **Input Validation** - Added validation utilities
3. ✅ **Use Case Validation** - All use cases validate inputs
4. ✅ **Error Handling** - Try-catch blocks in all use cases
5. ✅ **Test Files** - Created for domain, application, and infrastructure layers
6. ✅ **Test Configuration** - Jest configured via react-scripts

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test -- Workload.test.js
```

## Test Structure

### Domain Layer Tests
- `src/domain/entities/__tests__/Workload.test.js`
- `src/domain/value_objects/__tests__/Money.test.js`
- `src/domain/services/__tests__/WorkloadAssessmentService.test.js`

### Application Layer Tests
- `src/application/use_cases/__tests__/AssessWorkloadUseCase.test.js`
- `src/application/use_cases/__tests__/GenerateMigrationPlanUseCase.test.js`
- `src/application/use_cases/__tests__/CalculateTCOUseCase.test.js`
- `src/application/use_cases/__tests__/PlanMigrationWavesUseCase.test.js`

### Infrastructure Layer Tests
- `src/infrastructure/adapters/__tests__/CodeModAdapter.test.js`
- `src/infrastructure/repositories/__tests__/WorkloadRepository.test.js`

### Utility Tests
- `src/utils/__tests__/validation.test.js`

## Test Coverage Goals

- **Domain Layer**: 80%+ (Business logic must be tested)
- **Application Layer**: 70%+ (Use cases should be tested)
- **Infrastructure Layer**: 60%+ (Adapters and repositories)
- **Overall**: 70%+ (Good coverage across all layers)

## What to Test

### Domain Layer
- ✅ Entity creation and validation
- ✅ Business logic methods
- ✅ Value object immutability
- ✅ Domain service calculations

### Application Layer
- ✅ Use case execution
- ✅ Input validation
- ✅ Error handling
- ✅ Dependency orchestration

### Infrastructure Layer
- ✅ Adapter functionality
- ✅ Repository persistence
- ✅ Error handling and fallbacks
- ✅ Cache behavior

## Common Test Patterns

### Testing Domain Entities
```javascript
describe('Workload', () => {
  it('should create valid workload', () => {
    const workload = new Workload({
      name: 'Test',
      sourceProvider: 'aws'
    });
    expect(workload.name).toBe('Test');
  });

  it('should enforce business rules', () => {
    expect(() => {
      new Workload({ name: '' });
    }).toThrow();
  });
});
```

### Testing Use Cases
```javascript
describe('AssessWorkloadUseCase', () => {
  it('should assess workload', async () => {
    const assessment = await useCase.execute({
      workloadId: 'workload_123',
      includeCodeMod: true
    });
    expect(assessment).toBeInstanceOf(Assessment);
  });
});
```

### Testing with Mocks
```javascript
const mockRepository = {
  findById: jest.fn().mockResolvedValue(workload),
  save: jest.fn()
};

const useCase = new AssessWorkloadUseCase({
  workloadRepository: mockRepository
});
```

## Troubleshooting Tests

### Tests Not Running
- Check Jest configuration in `package.json`
- Verify test files are in `__tests__` folders or have `.test.js` extension
- Ensure all imports are correct

### Import Errors
- Check file extensions (`.js` required)
- Verify all exports exist
- Check for circular dependencies

### Mock Issues
- Ensure mocks return promises for async methods
- Verify mock function signatures match interfaces
- Check mock reset in `beforeEach`

## Integration Testing

### Manual Testing Checklist

1. **Discovery Flow**
   - [ ] Add workload manually
   - [ ] Import CSV
   - [ ] Save and load project

2. **Assessment Flow**
   - [ ] Assess single workload
   - [ ] Assess all workloads
   - [ ] Include CodeMod analysis

3. **Migration Planning**
   - [ ] Generate migration plan
   - [ ] View wave plan
   - [ ] Export plan

4. **TCO Calculation**
   - [ ] Calculate TCO
   - [ ] Compare cloud providers
   - [ ] View ROI analysis

## Next Steps After Testing

1. Fix any failing tests
2. Increase test coverage
3. Add integration tests
4. Add E2E tests (optional)
5. Performance testing
6. Security testing
