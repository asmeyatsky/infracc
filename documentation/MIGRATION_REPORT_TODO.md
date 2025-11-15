# Migration Assessment Report - Comprehensive TODO

## Overview
Transform the accelerator to produce a valuable assessment and migration estimate report from AWS billing data, focusing on aggregated summaries rather than individual workload details.

## Current State ✅
- **Discovery Agent**: Working - produces deduplicated workloads and sums costs correctly
- **Assessment Agent**: Working - assesses workloads and calculates complexity
- **Strategy Agent**: Working - generates migration plans (wave assignment needs fixing)

## Required Deliverables

### 1. Data Aggregation & Summarization
- [ ] **ReportDataAggregator Service** (`src/domain/services/ReportDataAggregator.js`)
  - Aggregate workloads by complexity ranges (Low 1-3, Medium 4-6, High 7-10)
  - Group by AWS service (EC2, EKS, RDS, S3, Lambda, etc.)
  - Group by AWS region
  - Calculate totals: count, total cost, average complexity per group
  - Map AWS services to GCP equivalents using existing service mapping

### 2. Technology Summary Component
- [ ] **TechnologySummary Component** (`src/components/report/TechnologySummary.js`)
  - Display AWS services breakdown table:
    - Service name (EC2, EKS, RDS, S3, etc.)
    - Count of workloads
    - Total monthly cost
    - Average complexity score
    - Target GCP service
    - Migration strategy (Rehost/Replatform/Refactor)
  - Show top 10-15 services by cost
  - Include "Other" category for remaining services

### 3. Regional Breakdown Component
- [ ] **RegionalBreakdown Component** (`src/components/report/RegionalBreakdown.js`)
  - Display regions table:
    - AWS region name
    - Count of workloads
    - Total monthly cost
    - Average complexity
    - Top 3 services in region
  - Show all regions with workloads
  - Sort by total cost (descending)

### 4. GCP Cost Estimation Enhancement
- [ ] **GCPCostEstimator Service** (`src/domain/services/GCPCostEstimator.js`)
  - For each AWS→GCP service mapping:
    - Calculate on-demand GCP cost
    - Calculate 1-year Committed Use Discount (CUD) cost (~20-30% discount)
    - Calculate 3-year CUD cost (~40-50% discount)
  - Use existing GCP pricing data and enhance with CUD calculations
  - Handle Compute Engine, GKE, Cloud SQL, Cloud Storage, Cloud Functions, etc.

### 5. Cost Comparison Component
- [ ] **CostComparison Component** (`src/components/report/CostComparison.js`)
  - Side-by-side comparison table:
    - AWS Service → GCP Service
    - AWS Monthly Cost
    - GCP On-Demand Cost
    - GCP 1-Year CUD Cost
    - GCP 3-Year CUD Cost
    - Savings with 1-Year CUD
    - Savings with 3-Year CUD
  - Show total costs at bottom
  - Highlight best pricing option

### 6. Report Summary View
- [ ] **ReportSummaryView Component** (`src/components/report/ReportSummaryView.js`)
  - Executive Summary section:
    - Total workloads discovered
    - Total AWS monthly cost
    - Total GCP estimated costs (on-demand, 1-year CUD, 3-year CUD)
    - Potential savings
    - Complexity distribution (pie/bar chart)
    - Readiness distribution (pie/bar chart)
  - Technology Summary section
  - Regional Breakdown section
  - Cost Comparison section
  - Migration Recommendations section (based on complexity and wave planning)
  - PDF Download button

### 7. PDF Report Generator
- [ ] **Enhanced PDFReportGenerator** (`src/utils/reportPdfGenerator.js`)
  - Cover page with project name, date, total cost summary
  - Table of contents
  - Executive Summary (1-2 pages)
    - Key metrics
    - Complexity distribution chart (export Chart.js to image)
    - Readiness distribution chart
    - Cost comparison summary
  - Technology Breakdown (2-3 pages)
    - AWS services table with GCP mappings
    - Cost comparison per service
  - Regional Analysis (1-2 pages)
    - Regional breakdown table
    - Regional cost distribution chart
  - GCP Cost Estimates (2-3 pages)
    - Detailed cost comparison table
    - CUD savings analysis
  - Migration Recommendations (1-2 pages)
    - Wave planning summary
    - Migration strategy distribution
    - Risk factors summary
    - Timeline estimates
  - Appendices (optional)
    - Service mapping reference
    - Complexity scoring methodology

### 8. Integration Points
- [ ] **Update MigrationFlow** (`src/components/unified/MigrationFlow.js`)
  - Add new step: "Report" (step 4, after Strategy)
  - Show ReportSummaryView after Strategy completes
  - Pass aggregated data to ReportSummaryView
  - Ensure all required data (workloads, assessments, strategies) is available

- [ ] **Update Assessment Display** (`src/components/unified/MigrationFlow.js`)
  - Keep existing charts (complexity, readiness)
  - Add technology summary preview
  - Add regional breakdown preview

- [ ] **Update Strategy Display** (`src/components/unified/MigrationFlow.js`)
  - Show wave distribution chart
  - Show migration strategy distribution chart
  - Add summary statistics

### 9. Data Flow & State Management
- [ ] **Create ReportDataContext** (`src/context/ReportDataContext.js`)
  - Store aggregated data
  - Provide aggregation functions
  - Cache aggregated results

- [ ] **Enhance WorkloadRepository** (`src/infrastructure/repositories/WorkloadRepository.js`)
  - Add methods for aggregation queries:
    - `aggregateByService()`
    - `aggregateByRegion()`
    - `aggregateByComplexity()`
    - `getServiceMapping()`

### 10. GCP Pricing Integration
- [ ] **Enhance GCP Pricing API** (`src/utils/realPricingAPI.js` or new file)
  - Add CUD pricing calculations:
    - 1-year CUD: ~25% discount on compute
    - 3-year CUD: ~45% discount on compute
    - Storage CUD: varies by service
  - Add methods for:
    - `getGCPComputePricing(instanceType, region, commitment)`
    - `getGCPStoragePricing(storageClass, region, commitment)`
    - `getGCPDatabasePricing(dbType, region, commitment)`
  - Use existing `googleCloudPricingAPI.js` if available

### 11. Service Mapping Enhancement
- [ ] **Enhance Service Mapping** (`src/utils/serviceMapping.js`)
  - Ensure all AWS services from CUR are mapped
  - Add cost estimation hints (e.g., "typically 10-20% cheaper")
  - Add migration effort estimates
  - Add complexity indicators

### 12. Wave Planning Fix
- [ ] **Fix Wave Assignment** (`src/application/use_cases/PlanMigrationWavesUseCase.js`)
  - ✅ Already improved - verify it distributes properly
  - Add logging to debug distribution
  - Consider cost-based wave assignment (high-cost workloads → Wave 3)

### 13. Chart Export for PDF
- [ ] **Chart Export Utility** (`src/utils/chartExport.js`)
  - Convert Chart.js charts to images (canvas to image)
  - Support Bar, Pie, Doughnut charts
  - Export at high resolution for PDF

### 14. Testing & Validation
- [ ] **Test with real CUR data**
  - Verify all AWS services are recognized
  - Verify cost aggregation is accurate
  - Verify GCP cost estimates are reasonable
  - Verify PDF generation works with large datasets

- [ ] **Performance Optimization**
  - Ensure aggregation is fast (< 2 seconds for 20K workloads)
  - Lazy load charts
  - Cache aggregated data

## Questions for User

1. **PDF Report Structure**: Should it be a single comprehensive report or multiple focused reports (Executive Summary, Detailed Analysis, Cost Comparison)?

2. **Cost Estimates**: Should we use:
   - Real-time GCP pricing API (requires backend)?
   - Static pricing tables (faster, but may be outdated)?
   - Hybrid approach (static with API fallback)?

3. **Migration Estimates**: Should the report include:
   - Effort estimates (person-weeks)?
   - Timeline estimates (months)?
   - Resource requirements?

4. **Service Detail Level**: For the technology summary, should we:
   - Show all AWS services individually?
   - Group related services (e.g., "Compute: EC2, EKS, Lambda")?
   - Show top N services + "Other" category?

5. **Regional Detail**: Should regional breakdown show:
   - All regions?
   - Only regions with > X% of total cost?
   - Top N regions + "Other"?

6. **CUD Assumptions**: For CUD calculations, should we assume:
   - All workloads eligible for CUD?
   - Only certain workload types (e.g., compute only)?
   - User-configurable percentage?

## Implementation Priority

### Phase 1: Core Aggregation (High Priority)
1. ReportDataAggregator service
2. Technology Summary component
3. Regional Breakdown component
4. Report Summary View

### Phase 2: Cost Estimation (High Priority)
5. GCP Cost Estimator service
6. Cost Comparison component
7. CUD pricing calculations

### Phase 3: PDF Generation (High Priority)
8. Enhanced PDF Report Generator
9. Chart export utility
10. PDF download integration

### Phase 4: Polish & Integration (Medium Priority)
11. Update MigrationFlow integration
12. Fix wave assignment
13. Performance optimization
14. Testing & validation

## Estimated Effort
- Phase 1: 4-6 hours
- Phase 2: 3-4 hours
- Phase 3: 4-5 hours
- Phase 4: 2-3 hours
**Total: ~13-18 hours**
