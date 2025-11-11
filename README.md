# InfraCC - AWS & Azure to GCP Migration Accelerator

> **Premier cloud-to-cloud migration tool** with Infrastructure Assessment, Application Assessment (Google Cloud CodeMod), accurate service mapping, and comprehensive migration planning.

This project is a comprehensive cloud-to-cloud migration accelerator designed to help organizations migrate workloads from AWS or Azure to Google Cloud Platform (GCP). It provides assessment, planning, cost analysis, and migration execution tools.

## ??? Architecture

This application follows **Clean Architecture** (Hexagonal Architecture) principles:

- **Domain Layer**: Business logic, entities, value objects
- **Application Layer**: Use cases orchestrate business operations
- **Infrastructure Layer**: External adapters (CodeMod, pricing APIs, persistence)
- **Presentation Layer**: React components (UI only, no business logic)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete architecture documentation.

## ? Features

### Pillar 1: Assess ??
1. **Cloud Workload Discovery Tool** - Discover and inventory AWS/Azure workloads for migration
2. **Dependency Visualization Map** - Interactive network graph showing workload relationships
3. **Migration Strategy Recommender** - 6 R's framework-based migration recommendations with service mapping
4. **Cost Comparison Calculator** - Compare current AWS/Azure costs with projected GCP costs

### Pillar 2: Mobilize ??
5. **Landing Zone Builder** - 5-step wizard for GCP infrastructure configuration
6. **Terraform Generator** - Production-ready IaC templates (7 modules: main, projects, network, compute, storage, monitoring, security)

### Pillar 3: Operate ??
7. **Cost Dashboard** - Real-time multi-cloud cost monitoring with forecasting and budget alerts
8. **Resource Optimization** - AI-powered recommendations across 8 categories (right-sizing, consolidation, pricing, etc.)
9. **Policy Compliance** - Governance dashboard with 20+ rules across 5 policy categories

### Cross-Cutting Features ??
10. **Infrastructure Assessment** - Complexity scoring, risk identification, resource compatibility
11. **Application Assessment** - Google Cloud CodeMod integration for code analysis
12. **Service Mapping** - Comprehensive AWS?GCP and Azure?GCP service mappings with migration strategies
13. **Migration Planning** - Wave planning, effort estimation, strategy distribution
14. **Project Manager** - Save/load/demo/import/export functionality with localStorage persistence
15. **Auto-save** - Automatic project saving every 2 seconds
16. **Demo Mode** - Pre-configured cloud workloads for demonstration
17. **Agentic Workflows** - Autonomous AI agents for assessment, planning, and cost analysis

## ?? Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/infracc.git
   ```

2. Navigate to the project directory:
   ```bash
   cd infracc
   ```

3. Install the dependencies:
   ```bash
   npm install
   ```

## ?? Usage

1. Start the development server:
   ```bash
   npm start
   ```
   
   Or use the restart script:
   ```bash
   ./restart.sh
   ```

2. Open your browser and navigate to `http://localhost:3000`.

3. Start with the **Discovery** tab to add workloads, then proceed through **Assessment**, **Strategy**, and other tabs.

## ?? Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete architecture guide
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - How to use the new architecture
- **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - What changed in the refactoring
- **[AGENTIC_INTEGRATION_COMPLETE.md](./AGENTIC_INTEGRATION_COMPLETE.md)** - Agentic features documentation
- **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** - Detailed local setup guide

## ?? Testing

Run tests:
```bash
npm test
```

Test coverage includes:
- Domain layer (entities, value objects, services)
- Application layer (use cases)
- Infrastructure layer (adapters, repositories)

## ?? Available Scripts

In the project directory, you can run:

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner in interactive watch mode
- `npm run build` - Builds the app for production to the `build` folder
- `./restart.sh` - Restart the development server

## ?? Configuration

### Environment Variables

- `REACT_APP_CODEMOD_API_KEY` - Google Cloud CodeMod API key (optional, falls back to mock data)
- `REACT_APP_GOOGLE_VISION_API_KEY` - Google Cloud Vision API key (optional)

### CodeMod Integration

The application includes Google Cloud CodeMod integration for enhanced service mapping and code analysis. If an API key is not provided, the application will use mock data automatically.

## ?? Key Features

### Infrastructure Assessment
- Complexity scoring (1-10)
- Risk factor identification
- Resource compatibility assessment
- Recommendations generation

### Application Assessment with CodeMod
- Source code analysis
- Service mapping detection
- Code change recommendations
- Dependency analysis

### Service Mapping
- AWS/Azure to GCP mappings
- Migration strategy recommendations (6 R's)
- Effort level assessment
- CodeMod-enhanced mappings

### Migration Planning
- Wave planning (1-3) based on complexity
- Strategy distribution
- Effort estimation
- Complexity analysis

### Agentic Capabilities ??
- **AssessmentAgent** - Autonomous workload assessment with AI
- **PlanningAgent** - Autonomous migration planning
- **CostAnalysisAgent** - Autonomous cost analysis
- **AgenticOrchestrator** - Complete workflow automation

## ?? Project Structure

```
xtogcp/
??? src/
?   ??? domain/              # Business logic (no dependencies)
?   ?   ??? entities/        # Domain entities
?   ?   ??? value_objects/   # Immutable value objects
?   ?   ??? services/        # Domain services
?   ?   ??? ports/           # Interfaces (contracts)
?   ??? application/         # Use cases (orchestration)
?   ?   ??? use_cases/
?   ??? infrastructure/      # External adapters
?   ?   ??? adapters/        # CodeMod, pricing APIs
?   ?   ??? repositories/    # Persistence
?   ?   ??? dependency_injection/
?   ??? presentation/        # React components (UI only)
?   ?   ??? components/
?   ??? agentic/            # Agentic layer
?       ??? agents/         # Autonomous agents
?       ??? orchestration/  # Multi-agent coordination
??? public/
??? build/                   # Production build
```

## ?? How to Use

### Using Use Cases

```javascript
import { getContainer } from './infrastructure/dependency_injection/Container.js';

const container = getContainer();

// Assess workload
const assessment = await container.assessWorkloadUseCase.execute({
  workloadId: 'workload_123',
  includeCodeMod: true
});

// Generate migration plan
const plan = await container.generateMigrationPlanUseCase.execute({
  workloadIds: ['workload_123'],
  useCodeMod: true
});

// Calculate TCO
const tco = await container.calculateTCOUseCase.execute({
  onPremise: { hardware: 1000, ... },
  gcp: { compute: 5, ... },
  timeframe: 36
});
```

### Using Agentic Workflows

```javascript
import { getAgenticContainer } from './agentic/dependency_injection/AgenticContainer.js';

const container = getAgenticContainer();

// Execute autonomous assessment
const result = await container.assessmentAgent.execute({
  workloadId: 'workload_123',
  useAIEnhancement: true
});

// Execute complete workflow
const workflow = await container.orchestrator.executeMigrationWorkflow({
  workloadIds: ['w1', 'w2'],
  costInputs: { /* ... */ }
});
```

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed usage examples.

## ??? Technology Stack

- **React 19** - UI framework
- **Bootstrap 5** - Styling
- **Chart.js** - Data visualization
- **Clean Architecture** - Architecture pattern
- **Domain-Driven Design** - Domain modeling
- **Jest** - Testing framework

## ?? License

[Add your license here]

## ?? Contributing

[Add contribution guidelines here]

## ?? Support

[Add support information here]

---

**Built with Clean Architecture principles for enterprise-grade reliability and maintainability.**

**XToGCP - The Premier AWS/Azure to GCP Migration Tool** ??
