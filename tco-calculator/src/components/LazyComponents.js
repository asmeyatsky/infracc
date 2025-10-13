import { lazy } from 'react';

// Lazy load all heavy components
export const DiscoveryTool = lazy(() => import('../DiscoveryTool'));
export const MigrationStrategy = lazy(() => import('../MigrationStrategy'));
export const DependencyMap = lazy(() => import('../DependencyMap'));
export const LandingZoneBuilder = lazy(() => import('../LandingZoneBuilder'));
export const TerraformGenerator = lazy(() => import('../TerraformGenerator'));
export const CostDashboard = lazy(() => import('../CostDashboard'));
export const ResourceOptimization = lazy(() => import('../ResourceOptimization'));
export const PolicyCompliance = lazy(() => import('../PolicyCompliance'));
export const WavePlanner = lazy(() => import('../WavePlanner'));
export const AdvancedAnalytics = lazy(() => import('../AdvancedAnalytics'));
export const TcoChart = lazy(() => import('../TcoChart'));
