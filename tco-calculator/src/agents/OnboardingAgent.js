/**
 * Intelligent Onboarding Agent
 * Conversational AI that guides users through the discovery phase
 */

export class OnboardingAgent {
  constructor() {
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
        options: [
          'Cost reduction',
          'Improve scalability',
          'Enhance security',
          'Modernize applications',
          'Disaster recovery',
          'All of the above',
        ],
        followUp: true,
      },
      {
        id: 'current_environment',
        question: "Describe your current on-premise environment:",
        type: 'checkbox',
        options: [
          'Virtual machines (VMware, Hyper-V)',
          'Physical servers',
          'Databases (SQL, NoSQL)',
          'Legacy applications',
          'Containerized workloads',
          'Hybrid cloud setup',
        ],
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
        options: [
          '0-3 months',
          '3-6 months',
          '6-12 months',
          '12+ months',
          'Flexible/phased approach',
        ],
      },
      {
        id: 'security_requirements',
        question: "What are your security and compliance requirements?",
        type: 'checkbox',
        options: [
          'HIPAA',
          'PCI-DSS',
          'SOC 2',
          'ISO 27001',
          'GDPR',
          'FedRAMP',
          'None/Standard',
        ],
      },
      {
        id: 'technical_expertise',
        question: "What is your team's cloud expertise level?",
        type: 'multiple_choice',
        options: [
          'Beginner - Limited cloud experience',
          'Intermediate - Some cloud projects',
          'Advanced - Multiple cloud deployments',
          'Expert - Cloud-native organization',
        ],
      },
      {
        id: 'budget_priority',
        question: "What is your budget priority?",
        type: 'multiple_choice',
        options: [
          'Minimize upfront costs',
          'Minimize ongoing costs',
          'Balanced approach',
          'Performance over cost',
        ],
      },
    ];
  }

  /**
   * Execute the onboarding conversation
   */
  async execute(input, options = {}) {
    const { interactive = true } = options;

    if (interactive) {
      // Return conversation flow for interactive UI
      return {
        questions: this.questions,
        currentStep: this.conversationState.step,
        totalSteps: this.questions.length,
      };
    } else {
      // Process bulk responses
      return this.processResponses(input);
    }
  }

  /**
   * Process user response and move to next question
   */
  async processResponse(questionId, response) {
    this.conversationState.responses[questionId] = response;
    this.conversationState.step++;

    // Check if we have all responses
    if (this.conversationState.step >= this.questions.length) {
      return this.generateProfile();
    }

    return {
      nextQuestion: this.questions[this.conversationState.step],
      progress: (this.conversationState.step / this.questions.length) * 100,
    };
  }

  /**
   * Process all responses at once
   */
  async processResponses(responses) {
    this.conversationState.responses = responses;
    return this.generateProfile();
  }

  /**
   * Generate migration profile based on responses
   */
  async generateProfile() {
    const responses = this.conversationState.responses;

    // Analyze responses to create a migration profile
    const profile = {
      migrationProfile: {
        businessGoal: responses.business_goal,
        complexity: this.calculateComplexity(responses),
        urgency: this.calculateUrgency(responses),
        riskLevel: this.calculateRiskLevel(responses),
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
      recommendations: this.generateRecommendations(responses),
      nextSteps: this.generateNextSteps(responses),
    };

    this.conversationState.profile = profile;

    return {
      status: 'completed',
      profile,
      summary: this.generateSummary(profile),
    };
  }

  /**
   * Calculate migration complexity
   */
  calculateComplexity(responses) {
    let complexity = 0;

    // More workloads = higher complexity
    const workloadMapping = {
      '1-10': 1,
      '11-50': 2,
      '51-200': 3,
      '200-500': 4,
      '500+': 5,
    };
    complexity += workloadMapping[responses.workload_count] || 2;

    // More environment types = higher complexity
    if (responses.current_environment) {
      complexity += responses.current_environment.length * 0.5;
    }

    // Compliance requirements add complexity
    if (responses.security_requirements && responses.security_requirements.length > 2) {
      complexity += 2;
    }

    if (complexity <= 3) return 'Low';
    if (complexity <= 6) return 'Medium';
    return 'High';
  }

  /**
   * Calculate timeline urgency
   */
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

  /**
   * Calculate risk level
   */
  calculateRiskLevel(responses) {
    let risk = 0;

    // Tight timeline = higher risk
    if (responses.timeline && responses.timeline.includes('0-3')) {
      risk += 3;
    }

    // Low expertise = higher risk
    if (responses.technical_expertise && responses.technical_expertise.includes('Beginner')) {
      risk += 2;
    }

    // Many security requirements = higher risk
    if (responses.security_requirements && responses.security_requirements.length > 3) {
      risk += 2;
    }

    if (risk <= 2) return 'Low';
    if (risk <= 4) return 'Medium';
    return 'High';
  }

  /**
   * Recommend migration approach
   */
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

  /**
   * Assess current state
   */
  assessCurrentState(responses) {
    return {
      modernization: responses.current_environment?.includes('Containerized workloads') ? 'Advanced' : 'Traditional',
      cloudReadiness: responses.technical_expertise?.includes('Expert') ? 'High' : 'Medium',
    };
  }

  /**
   * Generate recommendations
   */
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

  /**
   * Generate next steps
   */
  generateNextSteps(responses) {
    return [
      {
        step: 1,
        action: 'Run Automated Discovery',
        description: 'Scan your on-premise environment using Google Cloud Migration Centre',
        agent: 'discovery',
      },
      {
        step: 2,
        action: 'Review Assessment Report',
        description: 'Analyze workload compatibility and migration readiness',
        agent: 'assessment',
      },
      {
        step: 3,
        action: 'Create Migration Strategy',
        description: 'Develop detailed migration plan with timelines and dependencies',
        agent: 'strategy',
      },
    ];
  }

  /**
   * Generate executive summary
   */
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

  /**
   * Reset conversation state
   */
  reset() {
    this.conversationState = {
      step: 0,
      responses: {},
      profile: null,
    };
  }
}

export default OnboardingAgent;
