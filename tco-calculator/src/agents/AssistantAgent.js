/**
 * Real-time AI Assistant Agent (Amazon Q style)
 * Context-aware conversational assistant for migration guidance
 */

export class AssistantAgent {
  constructor(apiConfig = {}) {
    this.apiConfig = apiConfig;
    this.conversationHistory = [];
    this.context = {
      currentPhase: null, // onboarding, discovery, planning, migration, optimization
      userRole: null, // executive, it_manager, technical_architect
      projectData: null,
      discoveredAssets: [],
      migrationPlan: null,
    };

    // Knowledge base categories
    this.knowledgeBase = {
      gcp: {
        compute: ['Compute Engine', 'GKE', 'Cloud Run', 'App Engine'],
        storage: ['Cloud Storage', 'Persistent Disk', 'Filestore'],
        database: ['Cloud SQL', 'Firestore', 'Bigtable', 'Spanner'],
        networking: ['VPC', 'Cloud Load Balancing', 'Cloud CDN', 'Cloud Interconnect'],
        security: ['IAM', 'Secret Manager', 'Cloud Armor', 'Security Command Center'],
        monitoring: ['Cloud Monitoring', 'Cloud Logging', 'Cloud Trace', 'Error Reporting'],
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

    // Common questions and answers
    this.faq = this.buildFAQ();
  }

  /**
   * Execute assistant query
   */
  async execute(input, options = {}) {
    const { query, conversationId = null, streaming = false } = input;

    if (!query) {
      return {
        status: 'error',
        message: 'No query provided',
      };
    }

    // Update context if provided
    if (options.context) {
      this.updateContext(options.context);
    }

    // Classify the query
    const classification = this.classifyQuery(query);

    // Generate response based on classification
    let response;
    switch (classification.type) {
      case 'faq':
        response = this.handleFAQ(query, classification);
        break;
      case 'technical':
        response = await this.handleTechnicalQuery(query, classification);
        break;
      case 'guidance':
        response = await this.handleGuidanceQuery(query, classification);
        break;
      case 'status':
        response = this.handleStatusQuery(query);
        break;
      case 'troubleshooting':
        response = await this.handleTroubleshooting(query, classification);
        break;
      default:
        response = await this.handleGeneralQuery(query);
    }

    // Add to conversation history
    this.conversationHistory.push({
      timestamp: new Date().toISOString(),
      query,
      response,
      classification,
    });

    return {
      status: 'success',
      response,
      classification,
      suggestions: this.generateSuggestions(classification),
      relatedTopics: this.getRelatedTopics(classification),
      conversationId,
    };
  }

  /**
   * Update assistant context
   */
  updateContext(newContext) {
    this.context = {
      ...this.context,
      ...newContext,
    };
  }

  /**
   * Classify user query
   */
  classifyQuery(query) {
    const lowerQuery = query.toLowerCase();

    // FAQ patterns
    const faqPatterns = [
      { pattern: /what is|what are|tell me about|explain/i, type: 'faq', category: 'definition' },
      { pattern: /how much|cost|pricing|price/i, type: 'faq', category: 'cost' },
      { pattern: /how long|timeline|duration/i, type: 'faq', category: 'timeline' },
    ];

    // Technical patterns
    const technicalPatterns = [
      { pattern: /configure|setup|install|deploy/i, type: 'technical', category: 'howto' },
      { pattern: /code|script|yaml|terraform/i, type: 'technical', category: 'code' },
      { pattern: /api|sdk|client library/i, type: 'technical', category: 'api' },
    ];

    // Guidance patterns
    const guidancePatterns = [
      { pattern: /should i|recommend|best|suggest/i, type: 'guidance', category: 'recommendation' },
      { pattern: /strategy|approach|method/i, type: 'guidance', category: 'strategy' },
      { pattern: /next step|what now|proceed/i, type: 'guidance', category: 'next_steps' },
    ];

    // Status patterns
    const statusPatterns = [
      { pattern: /status|progress|where are we/i, type: 'status', category: 'project_status' },
      { pattern: /discovered|found|identified/i, type: 'status', category: 'discovery_results' },
    ];

    // Troubleshooting patterns
    const troubleshootingPatterns = [
      { pattern: /error|fail|not working|issue|problem/i, type: 'troubleshooting', category: 'error' },
      { pattern: /why|reason|cause/i, type: 'troubleshooting', category: 'diagnosis' },
    ];

    // Check patterns in order
    for (const { pattern, type, category } of [
      ...troubleshootingPatterns,
      ...statusPatterns,
      ...guidancePatterns,
      ...technicalPatterns,
      ...faqPatterns,
    ]) {
      if (pattern.test(lowerQuery)) {
        return {
          type,
          category,
          confidence: 'high',
          keywords: this.extractKeywords(query),
        };
      }
    }

    return {
      type: 'general',
      category: 'conversation',
      confidence: 'medium',
      keywords: this.extractKeywords(query),
    };
  }

  /**
   * Extract keywords from query
   */
  extractKeywords(query) {
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were', 'how', 'what', 'when', 'where', 'why'];
    const words = query.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Handle FAQ questions
   */
  handleFAQ(query, classification) {
    const keywords = classification.keywords;

    // Check for GCP service questions
    for (const [category, services] of Object.entries(this.knowledgeBase.gcp)) {
      for (const service of services) {
        if (query.toLowerCase().includes(service.toLowerCase())) {
          return this.getServiceInfo(service, category);
        }
      }
    }

    // Check predefined FAQs
    const matchedFAQ = this.findMatchingFAQ(query);
    if (matchedFAQ) {
      return {
        answer: matchedFAQ.answer,
        source: 'FAQ',
        confidence: 'high',
      };
    }

    // General response
    return {
      answer: "I'd be happy to help with that. Could you provide more specific details about what you'd like to know?",
      source: 'general',
      confidence: 'low',
    };
  }

  /**
   * Handle technical queries
   */
  async handleTechnicalQuery(query, classification) {
    const keywords = classification.keywords;

    // Check for specific GCP services
    if (keywords.some(k => ['compute', 'vm', 'instance'].includes(k))) {
      return {
        answer: this.getComputeEngineGuidance(),
        codeExamples: this.getComputeEngineExamples(),
        source: 'technical_docs',
        confidence: 'high',
      };
    }

    if (keywords.some(k => ['kubernetes', 'gke', 'container'].includes(k))) {
      return {
        answer: this.getGKEGuidance(),
        codeExamples: this.getGKEExamples(),
        source: 'technical_docs',
        confidence: 'high',
      };
    }

    if (keywords.some(k => ['database', 'sql', 'postgres', 'mysql'].includes(k))) {
      return {
        answer: this.getDatabaseGuidance(),
        codeExamples: this.getDatabaseExamples(),
        source: 'technical_docs',
        confidence: 'high',
      };
    }

    // Terraform-related
    if (keywords.some(k => ['terraform', 'iac', 'infrastructure'].includes(k))) {
      return {
        answer: this.getTerraformGuidance(),
        codeExamples: this.getTerraformExamples(),
        source: 'technical_docs',
        confidence: 'high',
      };
    }

    return {
      answer: "For technical implementation details, please refer to the Google Cloud documentation or ask me about a specific service (Compute Engine, GKE, Cloud SQL, etc.)",
      source: 'general',
      confidence: 'medium',
    };
  }

  /**
   * Handle guidance queries
   */
  async handleGuidanceQuery(query, classification) {
    const keywords = classification.keywords;

    // Context-aware recommendations
    if (this.context.projectData) {
      if (classification.category === 'recommendation') {
        return this.generatePersonalizedRecommendation();
      }

      if (classification.category === 'next_steps') {
        return this.generateNextSteps();
      }

      if (classification.category === 'strategy') {
        return this.generateStrategyGuidance();
      }
    }

    // General guidance
    return {
      answer: this.getGeneralGuidance(keywords),
      source: 'best_practices',
      confidence: 'medium',
    };
  }

  /**
   * Handle status queries
   */
  handleStatusQuery(query) {
    if (!this.context.projectData) {
      return {
        answer: "No project data available yet. Have you completed the onboarding questionnaire?",
        source: 'status',
        confidence: 'high',
      };
    }

    const status = {
      currentPhase: this.context.currentPhase || 'Not started',
      assetsDiscovered: this.context.discoveredAssets?.length || 0,
      migrationPlanReady: !!this.context.migrationPlan,
    };

    let answer = `**Project Status:**\n\n`;
    answer += `- **Current Phase:** ${status.currentPhase}\n`;
    answer += `- **Assets Discovered:** ${status.assetsDiscovered}\n`;
    answer += `- **Migration Plan:** ${status.migrationPlanReady ? 'Ready' : 'Not yet created'}\n`;

    if (this.context.migrationPlan) {
      answer += `\n**Migration Progress:**\n`;
      answer += `- Total Waves: ${this.context.migrationPlan.waves?.length || 0}\n`;
      answer += `- Estimated Timeline: ${this.context.migrationPlan.timeline?.totalWeeks || 'TBD'} weeks\n`;
      answer += `- Estimated Cost: $${this.context.migrationPlan.costEstimate?.total?.toLocaleString() || 'TBD'}\n`;
    }

    return {
      answer,
      source: 'project_status',
      confidence: 'high',
      data: status,
    };
  }

  /**
   * Handle troubleshooting
   */
  async handleTroubleshooting(query, classification) {
    const keywords = classification.keywords;

    // Common error patterns
    const troubleshootingGuides = {
      connectivity: {
        keywords: ['connect', 'connection', 'network', 'timeout'],
        answer: `**Connectivity Troubleshooting:**

1. **Check Network Configuration:**
   - Verify VPC firewall rules allow required ports
   - Check Cloud NAT configuration for outbound connectivity
   - Verify subnet IP ranges don't conflict

2. **Verify Service Status:**
   - Check service health in Console
   - Review Cloud Monitoring dashboards
   - Check for any service outages

3. **Test Connectivity:**
   \`\`\`bash
   # Test from Cloud Shell
   gcloud compute ssh [INSTANCE_NAME] --zone [ZONE]
   curl -v https://[YOUR-SERVICE]
   \`\`\``,
        actions: [
          'Review firewall rules',
          'Check IAM permissions',
          'Verify DNS resolution',
        ],
      },
      performance: {
        keywords: ['slow', 'performance', 'latency', 'timeout'],
        answer: `**Performance Troubleshooting:**

1. **Check Resource Utilization:**
   - CPU, memory, disk usage
   - Network throughput
   - Database connection pool

2. **Review Cloud Monitoring:**
   - Check for metrics spikes
   - Review log entries for errors
   - Analyze request traces

3. **Optimization Steps:**
   - Enable caching (Cloud CDN)
   - Right-size instances
   - Use managed services
   - Implement connection pooling`,
        actions: [
          'Enable Cloud Monitoring',
          'Review instance sizes',
          'Check database query performance',
        ],
      },
      permission: {
        keywords: ['permission', 'denied', 'access', 'forbidden', 'unauthorized'],
        answer: `**Permission Troubleshooting:**

1. **Check IAM Roles:**
   \`\`\`bash
   gcloud projects get-iam-policy [PROJECT_ID]
   \`\`\`

2. **Verify Service Account:**
   - Ensure service account has necessary roles
   - Check if service account is enabled
   - Verify key is not expired

3. **Review Resource Policies:**
   - Check organization policies
   - Verify VPC-SC perimeters
   - Review resource-level IAM`,
        actions: [
          'Grant required IAM roles',
          'Create service account if needed',
          'Review audit logs for denied access',
        ],
      },
    };

    // Find matching troubleshooting guide
    for (const [key, guide] of Object.entries(troubleshootingGuides)) {
      if (guide.keywords.some(kw => keywords.includes(kw))) {
        return {
          answer: guide.answer,
          actionableSteps: guide.actions,
          source: 'troubleshooting',
          confidence: 'high',
        };
      }
    }

    return {
      answer: "I need more details about the issue. Can you describe:\n1. What were you trying to do?\n2. What error message did you see?\n3. When did this start happening?",
      source: 'troubleshooting',
      confidence: 'low',
    };
  }

  /**
   * Handle general queries
   */
  async handleGeneralQuery(query) {
    return {
      answer: "I'm here to help with your Google Cloud migration. I can assist with:\n\n" +
              "- **Technical guidance** on GCP services\n" +
              "- **Migration strategy** recommendations\n" +
              "- **Troubleshooting** issues\n" +
              "- **Cost optimization** tips\n" +
              "- **Best practices** for cloud architecture\n\n" +
              "What would you like to know more about?",
      source: 'general',
      confidence: 'medium',
    };
  }

  /**
   * Generate follow-up suggestions
   */
  generateSuggestions(classification) {
    const suggestions = {
      faq: [
        "What are the phases of cloud migration?",
        "How much will my migration cost?",
        "What is the 6 R's migration strategy?",
      ],
      technical: [
        "Show me how to set up Cloud SQL",
        "Generate Terraform for GKE cluster",
        "How do I configure VPC networking?",
      ],
      guidance: [
        "What's the next step in my migration?",
        "Should I use Compute Engine or GKE?",
        "How can I optimize costs?",
      ],
      status: [
        "Show me the migration timeline",
        "What risks have been identified?",
        "How many assets are ready to migrate?",
      ],
      troubleshooting: [
        "My VM can't connect to Cloud SQL",
        "Why is my application slow?",
        "How do I fix permission denied errors?",
      ],
    };

    return suggestions[classification.type] || suggestions.faq;
  }

  /**
   * Get related topics
   */
  getRelatedTopics(classification) {
    const related = {
      compute: ['Compute Engine', 'GKE', 'Cloud Run', 'Instance groups'],
      database: ['Cloud SQL', 'Database Migration Service', 'Backups', 'Replication'],
      networking: ['VPC', 'Load Balancing', 'Cloud CDN', 'Firewall rules'],
      security: ['IAM', 'Secret Manager', 'Cloud Armor', 'VPC-SC'],
      cost: ['Committed use discounts', 'Sustained use discounts', 'Preemptible VMs', 'Budget alerts'],
    };

    // Match keywords to topics
    for (const [topic, items] of Object.entries(related)) {
      if (classification.keywords.includes(topic)) {
        return items;
      }
    }

    return ['Migration strategies', 'Best practices', 'Cost optimization'];
  }

  /**
   * Build FAQ database
   */
  buildFAQ() {
    return [
      {
        question: "What are the 6 R's of cloud migration?",
        answer: `The 6 R's are migration strategies:

1. **Rehost (Lift and Shift)** - Move as-is to cloud
2. **Replatform** - Make minimal cloud optimizations
3. **Refactor** - Redesign for cloud-native
4. **Repurchase** - Move to SaaS
5. **Retire** - Decommission unused applications
6. **Retain** - Keep on-premises for now

Your optimal strategy depends on your specific requirements and constraints.`,
        keywords: ['6 rs', 'strategies', 'migration strategies'],
      },
      {
        question: "How long does a cloud migration take?",
        answer: `Migration timeline varies based on:

- **Number of workloads:** 1-10 workloads: 2-4 months, 50+ workloads: 6-12 months
- **Complexity:** Simple rehost: weeks, Refactoring: months
- **Team size and expertise**
- **Business constraints**

Our assessment will provide a customized timeline for your organization.`,
        keywords: ['timeline', 'duration', 'how long'],
      },
      {
        question: "What is Google Cloud Migration Centre?",
        answer: `Google Cloud Migration Centre is a unified platform that helps you:

- **Discover** your on-premises assets automatically
- **Assess** cloud readiness and compatibility
- **Plan** your migration with AI-powered recommendations
- **Track** progress throughout the migration

It provides a centralized view of your entire migration journey.`,
        keywords: ['migration centre', 'migration center', 'discovery tool'],
      },
    ];
  }

  /**
   * Find matching FAQ
   */
  findMatchingFAQ(query) {
    const lowerQuery = query.toLowerCase();

    for (const faq of this.faq) {
      if (faq.keywords.some(keyword => lowerQuery.includes(keyword))) {
        return faq;
      }
      if (lowerQuery.includes(faq.question.toLowerCase())) {
        return faq;
      }
    }

    return null;
  }

  /**
   * Get service information
   */
  getServiceInfo(service, category) {
    const serviceInfo = {
      'Compute Engine': {
        description: 'Infrastructure as a Service (IaaS) for running virtual machines',
        useCases: ['Lift and shift migrations', 'Custom configurations', 'Windows workloads'],
        pricing: 'Pay per second, sustained use discounts, committed use discounts',
      },
      'GKE': {
        description: 'Managed Kubernetes service for containerized applications',
        useCases: ['Microservices', 'Cloud-native apps', 'Container orchestration'],
        pricing: 'Cluster management fee + compute resources',
      },
      'Cloud SQL': {
        description: 'Fully managed relational database service (MySQL, PostgreSQL, SQL Server)',
        useCases: ['Managed databases', 'Automated backups', 'High availability'],
        pricing: 'Based on instance type, storage, and network egress',
      },
    };

    const info = serviceInfo[service];
    if (info) {
      return {
        answer: `**${service}**\n\n${info.description}\n\n` +
                `**Common Use Cases:**\n${info.useCases.map(u => `- ${u}`).join('\n')}\n\n` +
                `**Pricing:** ${info.pricing}`,
        source: 'service_catalog',
        confidence: 'high',
      };
    }

    return {
      answer: `${service} is a Google Cloud ${category} service. Would you like specific information about pricing, use cases, or implementation?`,
      source: 'service_catalog',
      confidence: 'medium',
    };
  }

  // Guidance generators
  getComputeEngineGuidance() {
    return `**Compute Engine Migration Guidance:**

1. **Choose Instance Type:**
   - General purpose: N2, N2D, N1
   - Compute-optimized: C2, C2D
   - Memory-optimized: M2, M1

2. **Sizing Recommendations:**
   - Use rightsizing recommendations from Migration Centre
   - Start conservative, scale up if needed
   - Consider sustained use discounts (30% automatic discount)

3. **Migration Process:**
   - Use Migrate for Compute Engine
   - Or manual: export VM image, upload to Cloud Storage, create image, launch instance`;
  }

  getComputeEngineExamples() {
    return {
      terraform: `resource "google_compute_instance" "default" {
  name         = "my-instance"
  machine_type = "n2-standard-4"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }
}`,
      gcloud: `gcloud compute instances create my-instance \\
  --machine-type=n2-standard-4 \\
  --zone=us-central1-a \\
  --image-family=debian-11 \\
  --image-project=debian-cloud`,
    };
  }

  getGKEGuidance() {
    return `**GKE Migration Guidance:**

1. **Cluster Setup:**
   - Use Autopilot for hands-off management
   - Or Standard mode for more control

2. **Containerization:**
   - Create Dockerfile for application
   - Build and push to Artifact Registry
   - Create Kubernetes manifests

3. **Best Practices:**
   - Use managed node pools
   - Enable GKE monitoring
   - Implement health checks
   - Use ConfigMaps and Secrets`;
  }

  getGKEExamples() {
    return {
      terraform: `resource "google_container_cluster" "primary" {
  name     = "my-gke-cluster"
  location = "us-central1"

  initial_node_count = 3

  node_config {
    machine_type = "n2-standard-4"
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}`,
      kubectl: `kubectl apply -f deployment.yaml
kubectl expose deployment my-app --type=LoadBalancer --port=80`,
    };
  }

  getDatabaseGuidance() {
    return `**Cloud SQL Migration Guidance:**

1. **Choose Edition:**
   - Cloud SQL Enterprise: High availability, 99.99% SLA
   - Cloud SQL Standard: Good for dev/test

2. **Migration Methods:**
   - Database Migration Service (recommended)
   - Manual: mysqldump/pg_dump + import
   - Replication for minimal downtime

3. **Optimization:**
   - Enable high availability
   - Set up automated backups
   - Configure read replicas for read-heavy workloads`;
  }

  getDatabaseExamples() {
    return {
      terraform: `resource "google_sql_database_instance" "main" {
  name             = "my-database"
  database_version = "MYSQL_8_0"
  region           = "us-central1"

  settings {
    tier = "db-n1-standard-2"

    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }
  }
}`,
    };
  }

  getTerraformGuidance() {
    return `**Terraform for GCP:**

1. **Setup:**
   - Configure provider
   - Enable required APIs
   - Set up state backend

2. **Best Practices:**
   - Use modules for reusability
   - Separate environments (dev, staging, prod)
   - Use terraform workspaces
   - Store state in Cloud Storage

3. **Migration Workflow:**
   - Generate Terraform from existing resources
   - Or write Terraform from scratch
   - Plan, review, apply`;
  }

  getTerraformExamples() {
    return {
      provider: `terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "prod"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}`,
    };
  }

  generatePersonalizedRecommendation() {
    return {
      answer: `Based on your project profile, here are my recommendations:

**Immediate Actions:**
1. Complete discovery of all assets
2. Prioritize cloud-ready workloads for pilot migration
3. Identify quick wins for early ROI

**Strategic Recommendations:**
1. Use phased approach starting with non-critical systems
2. Invest in team training on GCP fundamentals
3. Set up proper monitoring and cost controls from day one

**Risk Mitigation:**
1. Test migration process with pilot workload
2. Document rollback procedures
3. Plan for parallel running during cutover`,
      source: 'personalized',
      confidence: 'high',
    };
  }

  generateNextSteps() {
    if (!this.context.currentPhase) {
      return {
        answer: "**Next Steps:**\n\n1. Complete onboarding questionnaire\n2. Run discovery agent\n3. Review assessment results\n4. Approve migration strategy",
        source: 'next_steps',
        confidence: 'high',
      };
    }

    const nextSteps = {
      onboarding: "Run discovery agent to scan your environment",
      discovery: "Review discovered assets and run assessment",
      planning: "Review and approve migration plan",
      migration: "Execute first wave of migration",
      optimization: "Review performance and optimize costs",
    };

    return {
      answer: `**Next Step:** ${nextSteps[this.context.currentPhase] || 'Continue with current phase'}`,
      source: 'next_steps',
      confidence: 'high',
    };
  }

  generateStrategyGuidance() {
    return {
      answer: `**Migration Strategy Guidance:**

For your organization, I recommend:

1. **Start with Pilot Wave:**
   - Select 2-3 non-critical workloads
   - Validate migration process
   - Build team confidence

2. **Phased Approach:**
   - Wave 1: Dev/test environments
   - Wave 2: Non-critical production
   - Wave 3: Critical systems
   - Wave 4: Legacy modernization

3. **Success Metrics:**
   - Migration timeline adherence
   - Budget variance
   - Application performance
   - Team satisfaction`,
      source: 'strategy',
      confidence: 'high',
    };
  }

  getGeneralGuidance(keywords) {
    return "I'd be happy to provide guidance. What specific aspect would you like help with? For example:\n" +
           "- Choosing between GCP services\n" +
           "- Migration strategy recommendations\n" +
           "- Cost optimization tips\n" +
           "- Best practices for security";
  }

  /**
   * Get conversation history
   */
  getConversationHistory() {
    return this.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }
}

export default AssistantAgent;
