/**
 * Assistant Agent
 * 
 * Real-time AI Assistant Agent with visible processing
 * Context-aware conversational assistant for migration guidance
 */

import { BaseAgent } from '../core/BaseAgent.js';

export class AssistantAgent extends BaseAgent {
  constructor(dependencies = {}) {
    super('AssistantAgent', 'Assistant Agent', dependencies);
    this.apiConfig = dependencies.apiConfig || {};
    this.conversationHistory = [];
    this.context = {
      currentPhase: null,
      userRole: null,
      projectData: null,
      discoveredAssets: [],
      migrationPlan: null,
    };
    this.knowledgeBase = {
      gcp: {
        compute: ['Compute Engine', 'GKE', 'Cloud Run', 'App Engine'],
        storage: ['Cloud Storage', 'Persistent Disk', 'Filestore'],
        database: ['Cloud SQL', 'Firestore', 'Bigtable', 'Spanner'],
        networking: ['VPC', 'Cloud Load Balancing', 'Cloud CDN'],
        security: ['IAM', 'Secret Manager', 'Cloud Armor'],
        monitoring: ['Cloud Monitoring', 'Cloud Logging', 'Cloud Trace'],
      },
      migration: {
        strategies: ['rehost', 'replatform', 'refactor', 'repurchase', 'retire', 'retain'],
        phases: ['assess', 'plan', 'deploy', 'optimize'],
        tools: ['Migration Centre', 'Migrate for Compute Engine', 'Database Migration Service'],
      },
      bestPractices: {
        security: ['Use IAM roles', 'Enable VPC Service Controls', 'Implement least privilege'],
        cost: ['Use committed use discounts', 'Right-size instances', 'Use preemptible VMs'],
        reliability: ['Multi-region deployment', 'Implement health checks', 'Use managed services'],
      },
    };
    this.faq = this.buildFAQ();
    this.initialize();
  }

  /**
   * Execute assistant query with visible processing
   */
  async execute(input, options = {}) {
    const { query, conversationId = null, streaming = false } = input;

    if (!query) {
      return { status: 'error', message: 'No query provided' };
    }

    try {
      // Step 1: Classify query
      const classification = await this.executeStep('Classifying query', async () => {
        this.think(`Analyzing query: "${query.substring(0, 50)}..."`);
        await new Promise(resolve => setTimeout(resolve, 200));
        return this.classifyQuery(query);
      }, 20);

      // Step 2: Update context if provided
      if (options.context) {
        await this.executeStep('Updating context', async () => {
          this.think('Updating assistant context with project information');
          this.updateContext(options.context);
          await new Promise(resolve => setTimeout(resolve, 100));
        }, 30);
      }

      // Step 3: Generate response based on classification
      let response;
      switch (classification.type) {
        case 'faq':
          response = await this.executeStep('Handling FAQ query', async () => {
            this.think('Retrieving FAQ answer');
            await new Promise(resolve => setTimeout(resolve, 200));
            return this.handleFAQ(query, classification);
          }, 50);
          break;
        case 'technical':
          response = await this.executeStep('Handling technical query', async () => {
            this.think('Generating technical guidance');
            await new Promise(resolve => setTimeout(resolve, 300));
            return await this.handleTechnicalQuery(query, classification);
          }, 60);
          break;
        case 'guidance':
          response = await this.executeStep('Handling guidance query', async () => {
            this.think('Providing migration guidance');
            await new Promise(resolve => setTimeout(resolve, 300));
            return await this.handleGuidanceQuery(query, classification);
          }, 70);
          break;
        case 'status':
          response = await this.executeStep('Handling status query', async () => {
            this.think('Retrieving project status');
            await new Promise(resolve => setTimeout(resolve, 150));
            return this.handleStatusQuery(query);
          }, 50);
          break;
        case 'troubleshooting':
          response = await this.executeStep('Handling troubleshooting query', async () => {
            this.think('Diagnosing issue');
            await new Promise(resolve => setTimeout(resolve, 400));
            return await this.handleTroubleshooting(query, classification);
          }, 80);
          break;
        default:
          response = await this.executeStep('Handling general query', async () => {
            this.think('Generating general response');
            await new Promise(resolve => setTimeout(resolve, 200));
            return await this.handleGeneralQuery(query);
          }, 50);
      }

      // Step 4: Generate suggestions and related topics
      await this.executeStep('Generating suggestions', async () => {
        this.think('Creating follow-up suggestions');
        await new Promise(resolve => setTimeout(resolve, 150));
      }, 95);

      // Step 5: Finalize response
      await this.executeStep('Finalizing response', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      }, 100);

      const result = {
        status: 'success',
        response,
        classification,
        suggestions: this.generateSuggestions(classification),
        relatedTopics: this.getRelatedTopics(classification),
        conversationId,
      };

      // Add to conversation history
      this.conversationHistory.push({
        timestamp: new Date().toISOString(),
        query,
        response: result,
        classification,
      });

      this.setCompleted(result);
      return result;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  }

  updateContext(newContext) {
    this.context = { ...this.context, ...newContext };
  }

  classifyQuery(query) {
    const lowerQuery = query.toLowerCase();
    if (/what is|what are|tell me about|explain/i.test(lowerQuery)) {
      return { type: 'faq', category: 'definition', confidence: 'high', keywords: this.extractKeywords(query) };
    }
    if (/configure|setup|install|deploy/i.test(lowerQuery)) {
      return { type: 'technical', category: 'howto', confidence: 'high', keywords: this.extractKeywords(query) };
    }
    if (/should i|recommend|best|suggest/i.test(lowerQuery)) {
      return { type: 'guidance', category: 'recommendation', confidence: 'high', keywords: this.extractKeywords(query) };
    }
    if (/status|progress|where are we/i.test(lowerQuery)) {
      return { type: 'status', category: 'project_status', confidence: 'high', keywords: this.extractKeywords(query) };
    }
    if (/error|fail|not working|issue|problem/i.test(lowerQuery)) {
      return { type: 'troubleshooting', category: 'error', confidence: 'high', keywords: this.extractKeywords(query) };
    }
    return { type: 'general', category: 'conversation', confidence: 'medium', keywords: this.extractKeywords(query) };
  }

  extractKeywords(query) {
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were', 'how', 'what', 'when', 'where', 'why'];
    return query.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
  }

  handleFAQ(query, classification) {
    const keywords = classification.keywords;
    for (const [category, services] of Object.entries(this.knowledgeBase.gcp)) {
      for (const service of services) {
        if (query.toLowerCase().includes(service.toLowerCase())) {
          return {
            answer: `${service} is a Google Cloud service for ${category}. Would you like more details?`,
            source: 'FAQ',
            confidence: 'high',
          };
        }
      }
    }
    const matchedFAQ = this.findMatchingFAQ(query);
    if (matchedFAQ) {
      return { answer: matchedFAQ.answer, source: 'FAQ', confidence: 'high' };
    }
    return {
      answer: "I'd be happy to help with that. Could you provide more specific details?",
      source: 'general',
      confidence: 'low',
    };
  }

  async handleTechnicalQuery(query, classification) {
    const keywords = classification.keywords;
    if (keywords.some(k => ['compute', 'vm', 'instance'].includes(k))) {
      return {
        answer: 'Compute Engine provides scalable virtual machines. Use gcloud or Terraform to create instances.',
        codeExamples: ['gcloud compute instances create my-instance --zone=us-central1-a'],
        source: 'technical_docs',
        confidence: 'high',
      };
    }
    if (keywords.some(k => ['kubernetes', 'gke', 'container'].includes(k))) {
      return {
        answer: 'GKE provides managed Kubernetes. Deploy containers using kubectl or Cloud Build.',
        codeExamples: ['gcloud container clusters create my-cluster --zone=us-central1-a'],
        source: 'technical_docs',
        confidence: 'high',
      };
    }
    return {
      answer: 'For technical implementation details, please refer to Google Cloud documentation.',
      source: 'general',
      confidence: 'medium',
    };
  }

  async handleGuidanceQuery(query, classification) {
    if (this.context.projectData) {
      return {
        answer: 'Based on your project, I recommend starting with workload discovery and assessment.',
        source: 'context_aware',
        confidence: 'high',
      };
    }
    return {
      answer: 'I recommend starting with the Discovery phase to identify your workloads.',
      source: 'general',
      confidence: 'medium',
    };
  }

  handleStatusQuery(query) {
    if (this.context.discoveredAssets?.length > 0) {
      return {
        answer: `You have ${this.context.discoveredAssets.length} discovered assets. Ready for assessment phase.`,
        source: 'context',
        confidence: 'high',
      };
    }
    return {
      answer: 'No project data available. Start with Discovery to begin migration planning.',
      source: 'general',
      confidence: 'medium',
    };
  }

  async handleTroubleshooting(query, classification) {
    return {
      answer: 'Based on your query, I recommend checking the error logs and verifying configuration.',
      source: 'troubleshooting',
      confidence: 'medium',
      suggestions: ['Check Cloud Logging', 'Verify IAM permissions', 'Review error messages'],
    };
  }

  async handleGeneralQuery(query) {
    return {
      answer: 'I can help with migration planning, technical questions, and guidance. What would you like to know?',
      source: 'general',
      confidence: 'low',
    };
  }

  findMatchingFAQ(query) {
    return this.faq.find(faq => query.toLowerCase().includes(faq.question.toLowerCase()));
  }

  buildFAQ() {
    return [
      { question: 'What is GCP?', answer: 'Google Cloud Platform is a suite of cloud computing services.' },
      { question: 'How do I migrate to GCP?', answer: 'Start with Discovery, then Assessment, Planning, and Execution phases.' },
      { question: 'What is the cost?', answer: 'Costs vary based on services used. Use the TCO Calculator for estimates.' },
    ];
  }

  generateSuggestions(classification) {
    return ['Learn more about GCP services', 'Check migration best practices', 'Review cost optimization tips'];
  }

  getRelatedTopics(classification) {
    return ['Migration strategies', 'GCP services', 'Cost optimization'];
  }
}

export default AssistantAgent;
