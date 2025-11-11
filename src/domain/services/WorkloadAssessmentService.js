/**
 * Workload Assessment Domain Service
 * 
 * Architectural Intent:
 * - Encapsulates business logic for workload assessment
 * - Coordinates infrastructure and application assessment
 * - No dependencies on infrastructure layer
 * - Pure business logic only
 */

import { Assessment, AssessmentType } from '../entities/Assessment.js';
import { Workload } from '../entities/Workload.js';

/**
 * Workload Assessment Domain Service
 * 
 * Key Design Decisions:
 * 1. Assessment logic is centralized here to maintain consistency
 * 2. Complexity scoring follows standardized business rules
 * 3. Risk factors are identified based on workload characteristics
 * 4. Service is stateless - all state is in entities
 */
export class WorkloadAssessmentService {
  /**
   * Assess workload complexity
   * @param {Workload} workload - Workload to assess
   * @returns {number} Complexity score (1-10)
   */
  assessComplexity(workload) {
    if (!(workload instanceof Workload)) {
      throw new Error('Workload instance required');
    }
    
    let score = 5; // Base complexity
    
    // Large workloads are more complex
    if (workload.isLargeWorkload()) {
      score += 2;
    }
    
    // Dependencies increase complexity
    if (workload.hasDependencies()) {
      score += workload.dependencies.length * 0.5;
    }
    
    // Windows workloads may have higher complexity
    if (workload.isWindowsWorkload()) {
      score += 1;
    }
    
    // Containerized workloads typically have lower complexity
    if (workload.isContainerized()) {
      score -= 1;
    }
    
    // High cost indicates complexity
    if (workload.monthlyCost.amount > 5000) {
      score += 1;
    }
    
    return Math.max(1, Math.min(10, Math.round(score)));
  }

  /**
   * Identify risk factors for workload
   * @param {Workload} workload - Workload to assess
   * @returns {string[]} Array of risk factor identifiers
   */
  identifyRiskFactors(workload) {
    if (!(workload instanceof Workload)) {
      throw new Error('Workload instance required');
    }
    
    const risks = [];
    
    if (workload.isLargeWorkload()) {
      risks.push('LARGE_WORKLOAD');
    }
    
    if (workload.hasDependencies()) {
      risks.push('DEPENDENCIES');
    }
    
    if (workload.isWindowsWorkload()) {
      risks.push('WINDOWS_OS');
    }
    
    if (workload.monthlyCost.amount > 10000) {
      risks.push('HIGH_COST');
    }
    
    if (workload.monthlyTraffic > 1000) {
      risks.push('HIGH_TRAFFIC');
    }
    
    if (workload.type.requiresStateManagement()) {
      risks.push('STATE_MANAGEMENT');
    }
    
    return risks;
  }

  /**
   * Generate assessment recommendations
   * @param {Workload} workload - Workload to assess
   * @param {number} complexityScore - Calculated complexity score
   * @param {string[]} riskFactors - Identified risk factors
   * @returns {string[]} Array of recommendations
   */
  generateRecommendations(workload, complexityScore, riskFactors) {
    if (!(workload instanceof Workload)) {
      throw new Error('Workload instance required');
    }
    
    const recommendations = [];
    
    if (complexityScore >= 8) {
      recommendations.push('Consider phased migration approach with extensive testing');
    }
    
    if (riskFactors.includes('DEPENDENCIES')) {
      recommendations.push('Map and migrate dependencies first to reduce migration risk');
    }
    
    if (riskFactors.includes('LARGE_WORKLOAD')) {
      recommendations.push('Consider right-sizing during migration to optimize costs');
    }
    
    if (workload.type.canBeContainerized() && !workload.isContainerized()) {
      recommendations.push('Consider containerization for better portability');
    }
    
    if (riskFactors.includes('HIGH_TRAFFIC')) {
      recommendations.push('Plan for data transfer costs and bandwidth requirements');
    }
    
    if (riskFactors.includes('STATE_MANAGEMENT')) {
      recommendations.push('Ensure proper backup and migration strategy for stateful data');
    }
    
    return recommendations;
  }

  /**
   * Perform infrastructure assessment
   * @param {Workload} workload - Workload to assess
   * @returns {Object} Infrastructure assessment data
   */
  performInfrastructureAssessment(workload) {
    if (!(workload instanceof Workload)) {
      throw new Error('Workload instance required');
    }
    
    const complexityScore = this.assessComplexity(workload);
    const riskFactors = this.identifyRiskFactors(workload);
    const recommendations = this.generateRecommendations(workload, complexityScore, riskFactors);
    
    return {
      cpu: workload.cpu,
      memory: workload.memory,
      storage: workload.storage,
      os: workload.os,
      region: workload.region,
      complexityScore,
      riskFactors,
      recommendations,
      estimatedMigrationTime: this._estimateMigrationTime(complexityScore),
      resourceCompatibility: this._assessResourceCompatibility(workload)
    };
  }

  /**
   * Estimate migration time based on complexity
   * @private
   */
  _estimateMigrationTime(complexityScore) {
    const baseTime = 2; // weeks
    const complexityMultiplier = complexityScore / 5;
    return Math.round(baseTime * complexityMultiplier);
  }

  /**
   * Assess resource compatibility with GCP
   * @private
   */
  _assessResourceCompatibility(workload) {
    const compatibility = {
      cpu: 'compatible',
      memory: 'compatible',
      storage: 'compatible',
      os: workload.isWindowsWorkload() ? 'needs_verification' : 'compatible'
    };
    
    if (workload.cpu > 96) {
      compatibility.cpu = 'needs_verification';
    }
    
    if (workload.memory > 624) {
      compatibility.memory = 'needs_verification';
    }
    
    return compatibility;
  }

  /**
   * Create comprehensive assessment
   * @param {Workload} workload - Workload to assess
   * @param {Object} infrastructureData - Infrastructure assessment data
   * @param {Object} applicationData - Application assessment data (optional)
   * @param {Object} codeModResults - CodeMod analysis results (optional)
   * @returns {Assessment}
   */
  createAssessment(workload, infrastructureData, applicationData = null, codeModResults = null) {
    if (!(workload instanceof Workload)) {
      throw new Error('Workload instance required');
    }
    
    const complexityScore = this.assessComplexity(workload);
    const riskFactors = this.identifyRiskFactors(workload);
    const recommendations = this.generateRecommendations(workload, complexityScore, riskFactors);
    
    const assessmentType = applicationData && infrastructureData 
      ? AssessmentType.COMPREHENSIVE 
      : applicationData 
        ? AssessmentType.APPLICATION 
        : AssessmentType.INFRASTRUCTURE;
    
    return new Assessment({
      workloadId: workload.id,
      type: assessmentType,
      infrastructureAssessment: infrastructureData,
      applicationAssessment: applicationData,
      codeModResults: codeModResults,
      complexityScore,
      riskFactors,
      recommendations
    });
  }
}

export default WorkloadAssessmentService;
