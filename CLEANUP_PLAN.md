# Cleanup & UX/UI Overhaul Plan

## 🔍 Current State Analysis

### Duplicate Components Identified:

1. **Discovery Components:**
   - `DiscoveryTool.js` (old)
   - `EnhancedDiscoveryTool.js` (new)
   - **Keep:** EnhancedDiscoveryTool (agentic)

2. **Assessment Components:**
   - `Assessment.js` (old)
   - `EnhancedAssessment.js` (new)
   - **Keep:** EnhancedAssessment (agentic)

3. **Migration Strategy Components:**
   - `MigrationStrategy.js` (old)
   - `EnhancedMigrationStrategy.js` (new)
   - **Keep:** EnhancedMigrationStrategy (agentic)

4. **TCO Calculator Components:**
   - `ImprovedTcoCalculator.js` (old)
   - `EnhancedTcoCalculator.js` (old)
   - `EnhancedTCOCalculator.js` (new)
   - **Keep:** EnhancedTCOCalculator (agentic)

5. **Workflow Components:**
   - `AgenticWorkflow.js` (old)
   - `AgenticWorkflowView.js` (new)
   - **Keep:** AgenticWorkflowView (newest)

## 🎯 Unified Architecture Plan

### Single Coherent Flow:

```
1. Onboarding (OnboardingAgent)
   ↓
2. Discovery (DiscoveryAgent)
   ↓
3. Assessment (AssessmentAgent)
   ↓
4. Strategy & Planning (PlanningAgent + StrategyAgent)
   ↓
5. Cost Analysis (CostAnalysisAgent)
   ↓
6. Code Analysis (CodeModAgent) - Optional
   ↓
7. Execution & Monitoring (Orchestrator)
```

### Unified Component Structure:

```
src/
├── components/
│   ├── unified/
│   │   ├── OnboardingFlow.js
│   │   ├── DiscoveryFlow.js
│   │   ├── AssessmentFlow.js
│   │   ├── StrategyFlow.js
│   │   ├── CostAnalysisFlow.js
│   │   └── AgentDashboard.js
│   └── shared/
│       ├── Layout.js
│       ├── Navigation.js
│       ├── StatusIndicator.js
│       └── ProgressBar.js
├── test-data/
│   ├── workloads.json
│   ├── assessments.json
│   ├── strategies.json
│   └── costs.json
└── styles/
    └── unified.css
```

## 🎨 UX/UI Design Principles

1. **Single Page Application Flow** - Linear progression through steps
2. **Agent-First Design** - Agents visible at all times
3. **Real-time Feedback** - Live status updates
4. **Progressive Disclosure** - Show details on demand
5. **Consistent Design Language** - Unified color scheme, typography, spacing

## 📊 Test Data Structure

- Realistic workload data
- Complete assessment results
- Migration strategies
- Cost scenarios
- Agent execution logs
