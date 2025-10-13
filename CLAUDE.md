# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains the **Google Cloud Infrastructure Modernization Accelerator Suite** - a comprehensive web application for cloud migration assessment, planning, and operations. The suite implements all **3 Pillars** from the PRD:

### **Pillar 1: Assess** ✅
1. **Discovery Tool** - Infrastructure inventory and workload discovery
2. **Dependency Visualization Map** - Interactive network graph showing workload relationships
3. **Migration Strategy Recommender** - 6 R's framework-based migration recommendations
4. **Multi-Cloud TCO Calculator** - Cost comparisons between on-premise infrastructure and AWS, Azure, and GCP

### **Pillar 2: Mobilize** ✅
5. **Landing Zone Builder** - 5-step wizard for GCP infrastructure configuration
6. **Terraform Generator** - Production-ready IaC templates (7 modules: main, projects, network, compute, storage, monitoring, security)

### **Pillar 3: Operate** ✅
7. **Cost Dashboard** - Real-time multi-cloud cost monitoring with forecasting and budget alerts
8. **Resource Optimization** - AI-powered recommendations across 8 categories (right-sizing, consolidation, pricing, etc.)
9. **Policy Compliance** - Governance dashboard with 20+ rules across 5 policy categories

### **Cross-Cutting Features** ✅
10. **Project Manager** - Save/load/demo/import/export functionality with localStorage persistence
11. **Auto-save** - Automatic project saving every 2 seconds
12. **Demo Mode** - Pre-configured e-commerce platform with 16 workloads

## Project Structure

- `/tco-calculator` - Main React application directory
  - **Pillar 1:** `/src/DiscoveryTool.js`, `/src/DependencyMap.js`, `/src/MigrationStrategy.js`
  - **Pillar 2:** `/src/LandingZoneBuilder.js`, `/src/TerraformGenerator.js`
  - **Pillar 3:** `/src/CostDashboard.js`, `/src/ResourceOptimization.js`, `/src/PolicyCompliance.js`
  - **Core:** `/src/App.js` - Main container with 6-tab navigation (Discovery, Strategy, Landing Zone, Terraform, FinOps, TCO Calculator)
  - **Utilities:** `/src/ProjectManager.js`, `/src/utils/storage.js`, `/src/utils/demoData.js`
  - `/public` - Static assets and index.html
  - `/build` - Production build (213.36 KB gzipped)
- `/infracc.pdf` - Product Requirements Document (PRD)

## Common Commands

All commands should be run from the `tco-calculator` directory:

**Development:**
- `npm start` - Start development server (opens on http://localhost:3000)
- `npm test` - Run tests in interactive watch mode
- `npm run build` - Create production build in `/build` folder

**Testing:**
- Tests use React Testing Library and Jest
- Test files follow the `*.test.js` naming convention

## Application Architecture

**State Management:**
- The application uses React hooks (`useState`) for state management
- Main state objects:
  - `activeTab`: controls which tool is displayed ('discovery', 'strategy', 'tco')
  - `discoveredWorkloads`: array of workloads discovered via Discovery Tool
  - `onPremise`: tracks 7 cost categories (hardware, software, maintenance, labor, power, cooling, datacenter)
  - `aws`: tracks 5 AWS service categories (ec2, s3, rds, vpc, cloudwatch)
  - `azure`: tracks 5 Azure service categories (virtualMachines, blobStorage, sqlDatabase, networking, monitoring)
  - `gcp`: tracks 5 GCP service categories (compute, storage, networking, database, monitoring)
  - `migration`: tracks 4 one-time migration costs (assessment, tools, training, consulting)
  - `timeframe`: analysis period in months (12-60 months via slider)
  - `tco`: calculated total costs including onPremise, aws, azure, gcp, migrationCost, totalAws, totalAzure, totalGcp
  - `roi`: object containing ROI percentages for each cloud provider (aws, azure, gcp)

**UI Framework:**
- Bootstrap 5.3.8 for responsive layout and styling
- Bootstrap nav-pills for tab navigation
- Chart.js v4 with react-chartjs-2 for data visualization
- Three main tabs: Discovery, Migration Strategy, TCO Calculator
- Four-column card layout for cloud provider inputs (On-Premise, AWS, Azure, GCP) with `col-lg-3` grid
- Migration costs in separate centered section with `col-lg-8 offset-lg-2`
- Bootstrap accordion for expandable migration recommendations
- Responsive design supporting mobile, tablet, and desktop
- Cloud provider cards use brand colors: AWS (#FF9900), Azure (#0078D4), GCP (#4285F4)

**Discovery Tool Features:**
- Manual workload entry with detailed specifications (CPU, memory, storage, traffic)
- Workload type classification (VM, database, storage, application, container)
- Dependency tracking for each workload
- Summary table of all discovered workloads
- Automatic navigation to strategy tab after discovery

**Migration Strategy Features:**
- Rule-based 6 R's recommendation engine (Rehost, Replatform, Refactor, Repurchase, Retire, Retain)
- Strategy distribution summary with percentages
- Expandable accordion for detailed recommendations per workload
- GCP service mapping for each workload type
- Effort level indicators (Low, Medium, High)
- Reference guide for all 6 R's strategies

**Cost Calculation Logic:**
- Monthly costs calculated for on-premise, AWS, Azure, and GCP (tco-calculator/src/App.js:104-177)
- TCO calculated over timeframe: `monthlyCost * timeframe`
- Migration costs are one-time and shared across all cloud providers
- ROI calculated separately for each provider: `(onPremiseTCO - totalCloudTCO) / totalCloudTCO * 100`
- Multi-dataset chart shows recurring costs vs total costs (with migration) for all platforms
- Automatic "best option" recommendation based on highest ROI

**Data Export:**
- JSON export functionality generates comprehensive multi-cloud report
- Export includes all cloud providers with monthly breakdowns and TCO calculations
- Separate ROI and savings metrics for AWS, Azure, and GCP
- File naming: `multicloud-tco-analysis-YYYY-MM-DD.json`

## Key Implementation Details

- Chart.js v4 configuration with proper registration of components (CategoryScale, LinearScale, BarElement, etc.)
- Modern Chart.js options API with `plugins.title`, `plugins.legend`, `plugins.tooltip`
- Multi-dataset chart with two data series: recurring costs and total costs with migration
- Grouped bar chart showing all four platforms (On-Premise, AWS, Azure, GCP) side-by-side
- Currency formatting throughout using `toLocaleString('en-US')` with 2 decimal places
- Conditional rendering of results section (only shows after any calculation)
- Smart "best option" recommendation algorithm that finds cloud provider with highest ROI
- Comparison table with color-coded rows matching brand colors
- All inputs default to 0 and use `parseFloat` with fallback to prevent NaN errors
- Timeframe slider updates label dynamically showing months and years
- Separate event handlers for each cloud provider: `handleAwsChange`, `handleAzureChange`, `handleGcpChange`
