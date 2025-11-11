/**
 * Onboarding Agent
 * 
 * Intelligent Onboarding Agent with visible processing
 * Conversational AI that guides users through the discovery phase
 */

import { BaseAgent } from '../core/BaseAgent.js';

export class OnboardingAgent extends BaseAgent {
  constructor(dependencies = {}) {
    super('OnboardingAgent', 'Onboarding Agent', dependencies);
    this.conversationState = {
      step: 0,
      responses: {},
      profile: null,
    };
    this.questions = [
      {
        id: 'business_goal',
        question: "What is your primary business goal for this cloud migration?",
        type: 'multiple_choice',
        options: ['Cost reduction', 'Improve scalability', 'Enhance security', 'Modernize applications', 'Disaster recovery', 'All of the above'],
        followUp: true,
      },
      {
        id: 'current_environment',
        question: "Describe your current on-premise environment:",
        type: 'checkbox',
        options: ['Virtual machines (VMware, Hyper-V)', 'Physical servers', 'Databases (SQL, NoSQL)', 'Legacy applications', 'Containerized workloads', 'Hybrid cloud setup'],
      },
      {
        id: 'workload_count',
        question: "Approximately how many workloads do you plan to migrate?",
        type: 'range',
        options: ['1-10', '11-50', '51-200', '200-500', '500+'],
      },
      {
        id: 'timeline',
        question: "What is your desired timeline for migration?",
        type: 'multiple_choice',
        options: ['0-3 months', '3-6 months', '6-12 months', '12+ months', 'Flexible/phased approach'],
      },
      {
        id: 'security_requirements',
        question: "What are your security and compliance requirements?",
        type: 'checkbox',
        options: ['HIPAA', 'PCI-DSS', 'SOC 2', 'ISO 27001', 'GDPR', 'FedRAMP', 'None/Standard'],
      },
      {
        id: 'technical_expertise',
        question: "What is your team's cloud expertise level?",
        type: 'multiple_choice',
        options: ['Beginner - Limited cloud experience', 'Intermediate - Some cloud projects', 'Advanced - Multiple cloud deployments', 'Expert - Cloud-native organization'],
      },
      {
        id: 'budget_priority',
        question: "What is your budget priority?",
        type: 'multiple_choice',
        options: ['Minimize upfront costs', 'Minimize ongoing costs', 'Balanced approach', 'Performance over cost'],
      },
    ];
    this.initialize();
  }

  /**
   * Execute the onboarding conversation with visible processing
   */
  async execute(input, options = {}) {
    const { interactive = true } = options;

    try {
      if (interactive) {
        await this.executeStep('Preparing onboarding questions', async () => {
          this.think('Analyzing user needs and preparing personalized questions');
          await new Promise(resolve => setTimeout(resolve, 300));
        }, 10);

        return {
          questions: this.questions,
          currentStep: this.conversationState.step,
          totalSteps: this.questions.length,
        };
      } else {
        return await this.processResponses(input);
      }
    } catch (error) {
      this.setError(error);
      throw error;
    }
  }

  /**
   * Process user response and move to next question with visible processing
   */
  async processResponse(questionId, response) {
    try {
      await this.executeStep(`Processing response for: ${questionId}`, async () => {
        this.think(`Analyzing response: ${JSON.stringify(response)}`);
        this.conversationState.responses[questionId] = response;
        this.conversationState.step++;
        await new Promise(resolve => setTimeout(resolve, 200));
      }, Math.round((this.conversationState.step / this.questions.length) * 100));

      // Check if we have all responses
      if (this.conversationState.step >= this.questions.length) {
        return await this.generateProfile();
      }

      const progress = Math.round((this.conversationState.step / this.questions.length) * 100);
      this.updateStatus({ progress, message: `Question ${this.conversationState.step + 1} of ${this.questions.length}` });

      return {
        nextQuestion: this.questions[this.conversationState.step],
        progress,
      };
    } catch (error) {
      this.setError(error);
      throw error;
    }
  }

  /**
   * Process all responses at once with visible processing
   */
  async processResponses(responses) {
    try {
      await this.executeStep('Processing all responses', async () => {
        this.think('Analyzing all onboarding responses');
        this.conversationState.responses = responses;
        await new Promise(resolve => setTimeout(resolve, 300));
      }, 50);

      return await this.generateProfile();
    } catch (error) {
      this.setError(error);
      throw error;
    }
  }

  /**
   * Generate migration profile based on responses with visible processing
   */
  async generateProfile() {
    try {
      const responses = this.conversationState.responses;

      // Step 1: Calculate complexity
      const complexity = await this.executeStep('Calculating migration complexity', async () => {
        this.think('Analyzing workload count, environment types, and compliance requirements');
        await new Promise(resolve => setTimeout(resolve, 200));
        return this.calculateComplexity(responses);
      }, 60);

      // Step 2: Calculate urgency and risk
      const urgency = await this.executeStep('Assessing timeline urgency', async () => {
        this.think('Evaluating timeline constraints and risk factors');
        await new Promise(resolve => setTimeout(resolve, 150));
        return this.calculateUrgency(responses);
      }, 75);

      const riskLevel = await this.executeStep('Calculating risk level', async () => {
        this.think('Analyzing technical expertise, timeline, and security requirements');
        await new Promise(resolve => setTimeout(resolve, 150));
        return this.calculateRiskLevel(responses);
      }, 85);

      // Step 3: Generate recommendations
      const recommendations = await this.executeStep('Generating recommendations', async () => {
        this.think('Creating personalized migration recommendations');
        await new Promise(resolve => setTimeout(resolve, 200));
        return this.generateRecommendations(responses);
      }, 95);

      // Step 4: Finalize profile
      await this.executeStep('Finalizing migration profile', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      }, 100);

      const profile = {
        migrationProfile: {
          businessGoal: responses.business_goal,
          complexity,
          urgency,
          riskLevel,
          recommendedApproach: this.recommendApproach(responses),
        },
        environment: {
          workloadTypes: responses.current_environment,
          estimatedWorkloads: responses.workload_count,
          currentState: this.assessCurrentState(responses),
        },
        constraints: {
          timeline: responses.timeline,
          budget: responses.budget_priority,
          security: responses.security_requirements,
          teamExpertise: responses.technical_expertise,
        },
        recommendations,
        nextSteps: this.generateNextSteps(responses),
      };

      this.conversationState.profile = profile;
      const result = {
        status: 'completed',
        profile,
        summary: this.generateSummary(profile),
      };

      this.setCompleted(result);
      return result;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  }

  calculateComplexity(responses) {
    let complexity = 0;
    const workloadMapping = { '1-10': 1, '11-50': 2, '51-200': 3, '200-500': 4, '500+': 5 };
    complexity += workloadMapping[responses.workload_count] || 2;
    if (responses.current_environment) {
      complexity += responses.current_environment.length * 0.5;
    }
    if (responses.security_requirements && responses.security_requirements.length > 2) {
      complexity += 2;
    }
    if (complexity <= 3) return 'Low';
    if (complexity <= 6) return 'Medium';
    return 'High';
  }

  calculateUrgency(responses) {
    const timelineMapping = {
      '0-3 months': 'Critical',
      '3-6 months': 'High',
      '6-12 months': 'Medium',
      '12+ months': 'Low',
      'Flexible/phased approach': 'Low',
    };
    return timelineMapping[responses.timeline] || 'Medium';
  }

  calculateRiskLevel(responses) {
    let risk = 0;
    if (responses.timeline && responses.timeline.includes('0-3')) risk += 3;
    if (responses.technical_expertise && responses.technical_expertise.includes('Beginner')) risk += 2;
    if (responses.security_requirements && responses.security_requirements.length > 3) risk += 2;
    if (risk <= 2) return 'Low';
    if (risk <= 4) return 'Medium';
    return 'High';
  }

  recommendApproach(responses) {
    const complexity = this.calculateComplexity(responses);
    const urgency = this.calculateUrgency(responses);

    if (urgency === 'Critical' || complexity === 'Low') {
      return {
        strategy: 'Lift and Shift (Rehost)',
        reason: 'Quick migration with minimal changes, ideal for time constraints or simple workloads',
        phases: ['Assessment', 'Rehost', 'Optimize'],
      };
    }

    if (complexity === 'Medium') {
      return {
        strategy: 'Hybrid Approach',
        reason: 'Lift and shift for some workloads, re-platform for others',
        phases: ['Assessment', 'Prioritize', 'Migrate in Waves', 'Modernize'],
      };
    }

    return {
      strategy: 'Cloud-Native Modernization',
      reason: 'Comprehensive refactoring for maximum cloud benefits',
      phases: ['Assessment', 'Pilot', 'Refactor', 'Migrate', 'Optimize'],
    };
  }

  assessCurrentState(responses) {
    return {
      modernization: responses.current_environment?.includes('Containerized workloads') ? 'Advanced' : 'Traditional',
      cloudReadiness: responses.technical_expertise?.includes('Expert') ? 'High' : 'Medium',
    };
  }

  generateRecommendations(responses) {
    const recommendations = [];
    if (responses.technical_expertise?.includes('Beginner')) {
      recommendations.push({
        category: 'Training',
        priority: 'High',
        recommendation: 'Invest in GCP training for your team before migration',
      });
    }
    if (responses.security_requirements && responses.security_requirements.length > 0) {
      recommendations.push({
        category: 'Security',
        priority: 'Critical',
        recommendation: 'Engage compliance specialists for ' + responses.security_requirements.join(', '),
      });
    }
    if (responses.workload_count === '500+') {
      recommendations.push({
        category: 'Tooling',
        priority: 'High',
        recommendation: 'Use automated migration tools and consider phased approach',
      });
    }
    return recommendations;
  }

  generateNextSteps(responses) {
    return [
      { step: 1, action: 'Run Automated Discovery', description: 'Scan your on-premise environment using Google Cloud Migration Centre', agent: 'discovery' },
      { step: 2, action: 'Review Assessment Report', description: 'Analyze workload compatibility and migration readiness', agent: 'assessment' },
      { step: 3, action: 'Create Migration Strategy', description: 'Develop detailed migration plan with timelines and dependencies', agent: 'strategy' },
    ];
  }

  generateSummary(profile) {
    return `Migration Assessment Summary:

Complexity: ${profile.migrationProfile.complexity}
Recommended Approach: ${profile.migrationProfile.recommendedApproach.strategy}
Risk Level: ${profile.migrationProfile.riskLevel}
Urgency: ${profile.migrationProfile.urgency}

Key Recommendations:
${profile.recommendations.map(r => `- ${r.recommendation}`).join('\n')}

Next Steps:
${profile.nextSteps.map(s => `${s.step}. ${s.action}`).join('\n')}`;
  }

  reset() {
    this.conversationState = { step: 0, responses: {}, profile: null };
    this.setIdle();
  }
}

export default OnboardingAgent;
