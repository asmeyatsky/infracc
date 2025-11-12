/**
 * Assessment Agent
 * 
 * Architectural Intent:
 * - Agentic layer wrapper around AssessWorkloadUseCase
 * - Adds AI capabilities to assessment
 * - Autonomous workload assessment with visible processing
 * - Uses Clean Architecture use cases
 */

import { BaseAgent } from '../core/BaseAgent.js';
import { AssessWorkloadUseCase } from '../../application/use_cases/AssessWorkloadUseCase.js';
import { WorkloadAssessmentService } from '../../domain/services/WorkloadAssessmentService.js';

/**
 * Assessment Agent
 * 
 * Autonomous agent that assesses workloads with AI enhancements
 * Uses Clean Architecture use cases internally
 * Emits events for visible processing
 */
export class AssessmentAgent extends BaseAgent {
  /**
   * @param {Object} dependencies
   * @param {AssessWorkloadUseCase} dependencies.assessWorkloadUseCase
   * @param {WorkloadAssessmentService} dependencies.assessmentService
   * @param {Object} dependencies.aiConfig - AI configuration (optional)
   */
  constructor(dependencies) {
    super('AssessmentAgent', 'Assessment Agent', dependencies);
    this.assessWorkloadUseCase = dependencies.assessWorkloadUseCase;
    this.assessmentService = dependencies.assessmentService;
    this.aiConfig = dependencies.aiConfig || {};
    this.assessmentHistory = [];
    this.initialize();
  }

  /**
   * Execute autonomous workload assessment with visible processing
   * @param {Object} input
   * @param {string} input.workloadId - Workload ID
   * @param {boolean} input.useAIEnhancement - Use AI for enhanced analysis
   * @returns {Promise<Object>} Enhanced assessment with AI insights
   */
  async execute(input) {
    const { workloadId, useAIEnhancement = true } = input;

    try {
      // Step 1: Analyze workload structure
      await this.executeStep('Analyzing workload structure', async () => {
        this.think(`Examining workload ${workloadId} configuration and dependencies`);
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate processing
      }, 20);

      // Step 2: Execute use case (Clean Architecture)
      const assessment = await this.executeStep('Executing assessment use case', async () => {
        return await this.assessWorkloadUseCase.execute({
          workloadId,
          includeCodeMod: false // CodeMod removed
        });
      }, 50);

      // Step 3: Enhance with AI if enabled
      let result = assessment;
      if (useAIEnhancement) {
        result = await this.executeStep('Generating AI insights', async () => {
          this.think('Analyzing complexity patterns and risk factors');
          const aiInsights = await this._generateAIInsights(assessment);
          await new Promise(resolve => setTimeout(resolve, 400)); // Simulate AI processing
          return this._enhanceAssessment(assessment, aiInsights);
        }, 80);
      }

      // Step 4: Finalize
      await this.executeStep('Finalizing assessment', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      }, 100);

      this.setCompleted(result);
      return result;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  }

  /**
   * Assess multiple workloads autonomously with visible processing
   * @param {Object} input
   * @param {string[]} input.workloadIds - Array of workload IDs
   * @param {boolean} input.parallel - Assess in parallel
   * @returns {Promise<Object>} Batch assessment results
   */
  async assessBatch(input) {
    const { workloadIds, parallel = true } = input;

    this.setExecuting('Batch Assessment', 0, `Assessing ${workloadIds.length} workloads`);
    this.think(`Starting batch assessment of ${workloadIds.length} workloads`);

    if (parallel) {
      // Assess workloads in parallel with batching to avoid memory issues
      // Process in chunks of 1000 to prevent browser crashes with large datasets
      const BATCH_SIZE = 1000;
      let completed = 0;
      const total = workloadIds.length;
      const assessments = [];

      console.log(`AssessmentAgent: Processing ${total.toLocaleString()} workloads in batches of ${BATCH_SIZE}`);

      // Process workloads in batches
      for (let i = 0; i < workloadIds.length; i += BATCH_SIZE) {
        const batch = workloadIds.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(workloadIds.length / BATCH_SIZE);
        
        // Only log every 10 batches or first/last batch to avoid console spam
        if (batchNumber === 1 || batchNumber === totalBatches || batchNumber % 10 === 0) {
          console.log(`AssessmentAgent: Processing batch ${batchNumber}/${totalBatches} (${batch.length.toLocaleString()} workloads)`);
        }
        
        this.setExecuting(
          'Batch Assessment',
          Math.round((i / total) * 100),
          `Processing batch ${batchNumber}/${totalBatches}: ${batch.length.toLocaleString()} workloads`
        );

        // Process batch in parallel
        const batchAssessments = await Promise.all(
          batch.map((workloadId, batchIndex) => {
            const globalIndex = i + batchIndex + 1;
            this.emit('workload-started', { workloadId, index: globalIndex, total });
            
            return this.execute({ 
              workloadId, 
              useAIEnhancement: true
            })
              .then(result => {
                completed++;
                const progress = Math.round((completed / total) * 100);
                this.updateStatus({ progress, message: `Completed ${completed.toLocaleString()}/${total.toLocaleString()} workloads` });
                this.emit('workload-completed', { workloadId, index: globalIndex, total, result });
                return result;
              })
              .catch(error => {
                completed++;
                const progress = Math.round((completed / total) * 100);
                this.updateStatus({ progress });
                this.emit('workload-error', { workloadId, error: error.message });
                return {
                  workloadId,
                  error: error.message,
                  success: false
                };
              });
          })
        );

        // Add batch results to overall assessments
        Array.prototype.push.apply(assessments, batchAssessments);
        
        // Yield to event loop between batches to prevent blocking
        if (i + BATCH_SIZE < workloadIds.length) {
          await new Promise(resolve => setTimeout(resolve, 10)); // Small delay between batches
        }
      }

      console.log(`AssessmentAgent: Completed processing ${assessments.length.toLocaleString()} assessments`);

      const summary = this._generateBatchSummary(assessments);
      this.setCompleted({ results: assessments, summary });
      
      return {
        results: assessments,
        summary,
        completedAt: new Date().toISOString()
      };
    } else {
      // Assess sequentially with visible progress
      const assessments = [];
      for (let i = 0; i < workloadIds.length; i++) {
        const workloadId = workloadIds[i];
        const progress = Math.round(((i + 1) / workloadIds.length) * 100);
        
        this.setExecuting(
          `Assessing workload ${i + 1}/${workloadIds.length}`,
          progress,
          `Processing: ${workloadId}`
        );
        this.emit('workload-started', { workloadId, index: i + 1, total: workloadIds.length });

        try {
          const assessment = await this.execute({
            workloadId,
            useAIEnhancement: true,
            includeCodeMod: true
          });
          assessments.push(assessment);
          this.emit('workload-completed', { workloadId, index: i + 1, total: workloadIds.length, result: assessment });
        } catch (error) {
          assessments.push({
            workloadId,
            error: error.message,
            success: false
          });
          this.emit('workload-error', { workloadId, error: error.message });
        }
      }

      const summary = this._generateBatchSummary(assessments);
      this.setCompleted({ results: assessments, summary });

      return {
        results: assessments,
        summary,
        completedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Generate AI insights for assessment
   * @private
   */
  async _generateAIInsights(assessment) {
    // In production, this would call an AI service (Claude, GPT, etc.)
    // For now, using rule-based enhancements
    
    const insights = {
      recommendations: [],
      optimizationOpportunities: [],
      riskMitigation: [],
      estimatedSavings: null
    };

    // Analyze complexity
    if (assessment.complexityScore >= 8) {
      insights.recommendations.push({
        type: 'complexity_reduction',
        priority: 'high',
        suggestion: 'Consider breaking down this workload into smaller components for easier migration'
      });
    }

    // Analyze risk factors
    if (assessment.riskFactors.length >= 3) {
      insights.riskMitigation.push({
        type: 'high_risk',
        action: 'Implement comprehensive testing strategy before migration',
        estimatedEffort: '2-3 weeks'
      });
    }

    // Analyze readiness
    const readiness = assessment.getReadinessScore();
    if (readiness < 50) {
      insights.optimizationOpportunities.push({
        type: 'readiness_improvement',
        suggestion: 'Perform detailed dependency analysis to improve readiness score',
        potentialImprovement: `${100 - readiness}%`
      });
    }

    return insights;
  }

  /**
   * Enhance assessment with AI insights
   * @private
   */
  _enhanceAssessment(assessment, aiInsights) {
    return {
      ...assessment.toJSON(),
      aiInsights,
      enhancedAt: new Date().toISOString(),
      agentVersion: '1.0'
    };
  }

  /**
   * Generate batch summary
   * @private
   */
  _generateBatchSummary(assessments) {
    const successful = assessments.filter(a => !a.error);
    const failed = assessments.filter(a => a.error);

    const avgComplexity = successful.reduce((sum, a) => 
      sum + (a.complexityScore || 0), 0) / (successful.length || 1);

    const avgReadiness = successful.reduce((sum, a) => 
      sum + (a.getReadinessScore?.() || 0), 0) / (successful.length || 1);

    return {
      total: assessments.length,
      successful: successful.length,
      failed: failed.length,
      averageComplexity: Math.round(avgComplexity * 10) / 10,
      averageReadiness: Math.round(avgReadiness * 10) / 10,
      highRiskCount: successful.filter(a => a.hasHighRisk?.()).length
    };
  }

  /**
   * Learn from assessment history
   * @param {Object} assessment - Previous assessment
   */
  learnFromAssessment(assessment) {
    this.assessmentHistory.push({
      assessment,
      timestamp: new Date().toISOString()
    });

    // Keep last 100 assessments
    if (this.assessmentHistory.length > 100) {
      this.assessmentHistory.shift();
    }
  }

  /**
   * Get recommendations based on history
   */
  getLearnedRecommendations() {
    if (this.assessmentHistory.length === 0) {
      return [];
    }

    // Analyze patterns from history
    const patterns = this._analyzePatterns();
    return patterns.recommendations;
  }

  /**
   * Analyze patterns from history
   * @private
   */
  _analyzePatterns() {
    // Simple pattern analysis
    // In production, would use ML/AI for pattern recognition
    
    const highComplexityCount = this.assessmentHistory.filter(
      h => h.assessment.complexityScore >= 8
    ).length;

    const recommendations = [];

    if (highComplexityCount > this.assessmentHistory.length * 0.5) {
      recommendations.push({
        type: 'pattern_identified',
        insight: 'High percentage of complex workloads detected',
        suggestion: 'Consider phased migration approach with extended timelines'
      });
    }

    return { recommendations };
  }
}

export default AssessmentAgent;
