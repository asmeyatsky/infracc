/**
 * Technical Configuration Agent (Code-Mod)
 * AI-powered agent for analyzing and modernizing application code
 */

export class CodeModAgent {
  constructor() {
    this.supportedLanguages = ['java', 'python', 'nodejs', 'go', 'csharp', 'php'];
    this.transformations = {
      containerization: {
        name: 'Containerization',
        description: 'Convert application to container-based deployment',
        patterns: ['Dockerfile', 'docker-compose.yml', 'kubernetes manifests'],
      },
      cloudNative: {
        name: 'Cloud-Native Refactoring',
        description: 'Refactor for cloud-native architecture',
        patterns: ['12-factor app', 'microservices', 'serverless'],
      },
      apiModernization: {
        name: 'API Modernization',
        description: 'Update APIs for cloud services',
        patterns: ['GCP SDK', 'Cloud APIs', 'gRPC'],
      },
      configManagement: {
        name: 'Configuration Management',
        description: 'Externalize configuration for cloud deployment',
        patterns: ['Environment variables', 'Secret Manager', 'Config Maps'],
      },
      observability: {
        name: 'Observability',
        description: 'Add monitoring and logging',
        patterns: ['Cloud Logging', 'Cloud Monitoring', 'OpenTelemetry'],
      },
    };
  }

  /**
   * Execute code analysis and modernization
   */
  async execute(input, options = {}) {
    const { application, codebase = null, transformationType = 'containerization' } = input;

    if (!application) {
      throw new Error('No application specified for code modernization');
    }

    // Phase 1: Analyze codebase
    const analysis = await this.analyzeCodebase(application, codebase);

    // Phase 2: Identify modernization opportunities
    const opportunities = this.identifyOpportunities(analysis);

    // Phase 3: Generate transformation plan
    const transformationPlan = this.generateTransformationPlan(
      analysis,
      opportunities,
      transformationType
    );

    // Phase 4: Generate code artifacts
    const artifacts = await this.generateArtifacts(application, transformationPlan);

    // Phase 5: Create migration guide
    const migrationGuide = this.createMigrationGuide(transformationPlan, artifacts);

    return {
      status: 'success',
      application: application.name,
      analysis,
      opportunities,
      transformationPlan,
      artifacts,
      migrationGuide,
      estimatedEffort: this.estimateEffort(transformationPlan),
    };
  }

  /**
   * Analyze application codebase
   */
  async analyzeCodebase(application, codebase) {
    // Simulate code analysis
    return new Promise((resolve) => {
      setTimeout(() => {
        const language = application.platform?.toLowerCase() || 'unknown';
        const isSupported = this.supportedLanguages.includes(language);

        const analysis = {
          language,
          isSupported,
          framework: this.detectFramework(language, application),
          dependencies: this.analyzeDependencies(application),
          architecture: this.analyzeArchitecture(application),
          cloudReadiness: this.assessCloudReadiness(application),
          codeQuality: this.assessCodeQuality(application),
          securityIssues: this.identifySecurityIssues(application),
        };

        resolve(analysis);
      }, 1000);
    });
  }

  /**
   * Detect application framework
   */
  detectFramework(language, application) {
    const frameworks = {
      java: ['Spring Boot', 'Quarkus', 'Micronaut'],
      python: ['Django', 'Flask', 'FastAPI'],
      nodejs: ['Express', 'NestJS', 'Next.js'],
      go: ['Gin', 'Echo', 'Fiber'],
      csharp: ['.NET Core', 'ASP.NET'],
    };

    const detectedFrameworks = frameworks[language] || ['Unknown'];
    return {
      name: detectedFrameworks[0], // In production, would actually detect
      version: '3.x',
      cloudCompatible: true,
    };
  }

  /**
   * Analyze application dependencies
   */
  analyzeDependencies(application) {
    // Mock dependency analysis
    return {
      total: 45,
      outdated: 12,
      vulnerable: 3,
      cloudIncompatible: 2,
      criticalUpdates: [
        { name: 'log4j', current: '2.14.0', recommended: '2.17.1', reason: 'Security vulnerability' },
        { name: 'spring-cloud', current: '2.x', recommended: '3.x', reason: 'Cloud compatibility' },
      ],
      replacements: [
        {
          current: 'javax.persistence',
          replacement: 'jakarta.persistence',
          reason: 'Jakarta EE migration',
        },
      ],
    };
  }

  /**
   * Analyze application architecture
   */
  analyzeArchitecture(application) {
    return {
      style: 'monolithic', // or 'microservices', 'serverless'
      layers: ['presentation', 'business', 'data'],
      stateful: true,
      sessionManagement: 'in-memory',
      fileStorage: 'local',
      database: application.dependencies?.includes('db-001') ? 'relational' : 'none',
      cache: 'none',
      messageQueue: 'none',
      recommendations: [
        'Externalize session state to Redis/Memorystore',
        'Move file storage to Cloud Storage',
        'Consider breaking into microservices for better scalability',
      ],
    };
  }

  /**
   * Assess cloud readiness
   */
  assessCloudReadiness(application) {
    let score = 50;
    const issues = [];
    const recommendations = [];

    // Check for cloud-friendly patterns
    if (application.platform === 'Java') {
      score += 10;
      recommendations.push('Java applications work well with GKE');
    }

    // Check for cloud anti-patterns
    if (!application.compatibility?.gcpReady) {
      score -= 20;
      issues.push('Application requires modernization for cloud deployment');
    }

    // Check dependencies
    if (application.dependencies?.length > 5) {
      score -= 10;
      issues.push('Complex dependencies may complicate containerization');
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      rating: score >= 70 ? 'Ready' : score >= 40 ? 'Needs Work' : 'Significant Effort Required',
      issues,
      recommendations,
    };
  }

  /**
   * Assess code quality
   */
  assessCodeQuality(application) {
    return {
      score: 72,
      rating: 'Good',
      metrics: {
        maintainability: 75,
        testCoverage: 68,
        codeSmells: 23,
        technicalDebt: '15 days',
      },
      recommendations: [
        'Increase test coverage to 80%+',
        'Refactor high-complexity methods',
        'Address code duplication',
      ],
    };
  }

  /**
   * Identify security issues
   */
  identifySecurityIssues(application) {
    return [
      {
        severity: 'high',
        type: 'vulnerable_dependency',
        description: 'Outdated log4j version with known CVE',
        remediation: 'Update to log4j 2.17.1 or later',
      },
      {
        severity: 'medium',
        type: 'hardcoded_credentials',
        description: 'Database credentials in configuration files',
        remediation: 'Use Secret Manager for credentials',
      },
      {
        severity: 'low',
        type: 'http_communication',
        description: 'Some internal communication uses HTTP instead of HTTPS',
        remediation: 'Enable TLS for all inter-service communication',
      },
    ];
  }

  /**
   * Identify modernization opportunities
   */
  identifyOpportunities(analysis) {
    const opportunities = [];

    // Containerization opportunity
    if (analysis.architecture.style === 'monolithic') {
      opportunities.push({
        type: 'containerization',
        priority: 'high',
        effort: 'medium',
        benefit: 'high',
        description: 'Containerize application for deployment on GKE',
        steps: [
          'Create Dockerfile',
          'Build and test container image',
          'Create Kubernetes manifests',
          'Set up CI/CD pipeline',
        ],
        estimatedTime: '2-3 weeks',
      });
    }

    // Configuration externalization
    if (analysis.architecture.sessionManagement === 'in-memory' ||
        analysis.architecture.fileStorage === 'local') {
      opportunities.push({
        type: 'configManagement',
        priority: 'high',
        effort: 'low',
        benefit: 'high',
        description: 'Externalize configuration and state management',
        steps: [
          'Move config to environment variables',
          'Use Secret Manager for credentials',
          'Migrate file storage to Cloud Storage',
          'Use Memorystore for session state',
        ],
        estimatedTime: '1-2 weeks',
      });
    }

    // Microservices decomposition
    if (analysis.architecture.style === 'monolithic' &&
        analysis.architecture.layers.length >= 3) {
      opportunities.push({
        type: 'cloudNative',
        priority: 'medium',
        effort: 'high',
        benefit: 'high',
        description: 'Consider microservices architecture for better scalability',
        steps: [
          'Identify bounded contexts',
          'Define service boundaries',
          'Extract services iteratively',
          'Implement API gateway',
          'Set up service mesh',
        ],
        estimatedTime: '8-12 weeks',
      });
    }

    // Observability
    opportunities.push({
      type: 'observability',
      priority: 'high',
      effort: 'low',
      benefit: 'high',
      description: 'Add comprehensive observability',
      steps: [
        'Integrate Cloud Logging',
        'Add Cloud Monitoring metrics',
        'Implement distributed tracing',
        'Create dashboards and alerts',
      ],
      estimatedTime: '1 week',
    });

    // API modernization
    if (analysis.framework.name === 'Spring Boot' || analysis.language === 'java') {
      opportunities.push({
        type: 'apiModernization',
        priority: 'medium',
        effort: 'medium',
        benefit: 'medium',
        description: 'Modernize APIs for cloud services',
        steps: [
          'Replace legacy clients with GCP SDK',
          'Implement gRPC for inter-service communication',
          'Add API versioning',
          'Document with OpenAPI/Swagger',
        ],
        estimatedTime: '2-4 weeks',
      });
    }

    return opportunities;
  }

  /**
   * Generate transformation plan
   */
  generateTransformationPlan(analysis, opportunities, transformationType) {
    // Focus on the specified transformation type
    const primaryOpportunity = opportunities.find(o => o.type === transformationType) ||
                                opportunities[0];

    const plan = {
      transformation: this.transformations[transformationType],
      phases: [],
      prerequisites: [],
      deliverables: [],
      risks: [],
    };

    // Generate phase-specific plan based on transformation type
    switch (transformationType) {
      case 'containerization':
        plan.phases = this.generateContainerizationPhases(analysis);
        plan.prerequisites = [
          'Docker installed on development machines',
          'GCP Artifact Registry configured',
          'GKE cluster provisioned',
        ];
        plan.deliverables = [
          'Dockerfile',
          'docker-compose.yml (for local development)',
          'Kubernetes manifests (deployment, service, ingress)',
          'CI/CD pipeline configuration',
          'Container security scanning setup',
        ];
        plan.risks = [
          {
            risk: 'Container image size too large',
            mitigation: 'Use multi-stage builds, alpine base images',
          },
          {
            risk: 'State management issues',
            mitigation: 'Externalize state to Cloud SQL, Memorystore',
          },
        ];
        break;

      case 'cloudNative':
        plan.phases = this.generateCloudNativePhases(analysis);
        plan.prerequisites = [
          'Microservices architecture design approved',
          'Service mesh (Istio/Anthos) selected',
          'API gateway configured',
        ];
        plan.deliverables = [
          'Service boundary definitions',
          'Microservices codebase',
          'API contracts (OpenAPI specs)',
          'Service mesh configuration',
          'Inter-service authentication setup',
        ];
        plan.risks = [
          {
            risk: 'Increased operational complexity',
            mitigation: 'Use managed services, implement observability',
          },
          {
            risk: 'Data consistency challenges',
            mitigation: 'Implement saga pattern, eventual consistency',
          },
        ];
        break;

      case 'observability':
        plan.phases = this.generateObservabilityPhases(analysis);
        plan.prerequisites = [
          'Cloud Logging API enabled',
          'Cloud Monitoring workspace created',
          'Log aggregation strategy defined',
        ];
        plan.deliverables = [
          'Structured logging implementation',
          'Custom metrics and dashboards',
          'Distributed tracing setup',
          'Alert policies and notifications',
          'SLO/SLI definitions',
        ];
        break;

      default:
        plan.phases = [
          {
            phase: 1,
            name: 'Assessment',
            duration: '1 week',
            activities: ['Code analysis', 'Dependency review', 'Architecture documentation'],
          },
          {
            phase: 2,
            name: 'Planning',
            duration: '1 week',
            activities: ['Design modernization approach', 'Create transformation backlog'],
          },
          {
            phase: 3,
            name: 'Implementation',
            duration: '4-6 weeks',
            activities: ['Code refactoring', 'Testing', 'Documentation'],
          },
          {
            phase: 4,
            name: 'Validation',
            duration: '2 weeks',
            activities: ['Integration testing', 'Performance testing', 'Security review'],
          },
        ];
    }

    return plan;
  }

  /**
   * Generate containerization phases
   */
  generateContainerizationPhases(analysis) {
    return [
      {
        phase: 1,
        name: 'Dockerfile Creation',
        duration: '3-5 days',
        activities: [
          'Create Dockerfile with multi-stage build',
          'Optimize base image selection',
          'Configure build arguments and environment variables',
          'Test local container build',
        ],
        outputs: ['Dockerfile', '.dockerignore'],
      },
      {
        phase: 2,
        name: 'Container Registry Setup',
        duration: '1-2 days',
        activities: [
          'Configure Artifact Registry',
          'Set up image scanning',
          'Configure access controls',
          'Create CI/CD integration',
        ],
        outputs: ['Registry configuration', 'IAM policies'],
      },
      {
        phase: 3,
        name: 'Kubernetes Manifests',
        duration: '5-7 days',
        activities: [
          'Create Deployment manifest',
          'Configure Service and Ingress',
          'Set up ConfigMaps and Secrets',
          'Define resource limits and requests',
          'Configure health checks',
        ],
        outputs: ['k8s manifests', 'Helm charts (optional)'],
      },
      {
        phase: 4,
        name: 'Testing & Validation',
        duration: '3-5 days',
        activities: [
          'Test in development GKE cluster',
          'Validate networking and connectivity',
          'Performance testing',
          'Security scanning',
        ],
        outputs: ['Test reports', 'Security scan results'],
      },
      {
        phase: 5,
        name: 'CI/CD Pipeline',
        duration: '3-5 days',
        activities: [
          'Set up Cloud Build triggers',
          'Configure automated testing',
          'Implement deployment automation',
          'Set up rollback procedures',
        ],
        outputs: ['cloudbuild.yaml', 'Deployment pipeline'],
      },
    ];
  }

  /**
   * Generate cloud-native refactoring phases
   */
  generateCloudNativePhases(analysis) {
    return [
      {
        phase: 1,
        name: 'Domain Analysis',
        duration: '1-2 weeks',
        activities: [
          'Identify bounded contexts',
          'Define service boundaries',
          'Map data ownership',
          'Design API contracts',
        ],
      },
      {
        phase: 2,
        name: 'Service Extraction',
        duration: '4-6 weeks',
        activities: [
          'Extract first service (strangler pattern)',
          'Implement API gateway',
          'Set up inter-service communication',
          'Migrate data',
        ],
      },
      {
        phase: 3,
        name: 'Iterative Decomposition',
        duration: '8-12 weeks',
        activities: [
          'Extract remaining services',
          'Implement service mesh',
          'Add circuit breakers and retry logic',
          'Set up distributed tracing',
        ],
      },
    ];
  }

  /**
   * Generate observability implementation phases
   */
  generateObservabilityPhases(analysis) {
    return [
      {
        phase: 1,
        name: 'Logging Setup',
        duration: '2-3 days',
        activities: [
          'Integrate Cloud Logging SDK',
          'Implement structured logging',
          'Configure log levels',
          'Set up log-based metrics',
        ],
      },
      {
        phase: 2,
        name: 'Metrics & Monitoring',
        duration: '3-5 days',
        activities: [
          'Define custom metrics',
          'Create monitoring dashboards',
          'Set up alert policies',
          'Configure notification channels',
        ],
      },
      {
        phase: 3,
        name: 'Distributed Tracing',
        duration: '3-5 days',
        activities: [
          'Integrate OpenTelemetry',
          'Configure trace sampling',
          'Set up Cloud Trace',
          'Create trace analysis dashboards',
        ],
      },
    ];
  }

  /**
   * Generate code artifacts
   */
  async generateArtifacts(application, transformationPlan) {
    const artifacts = {};

    // Generate Dockerfile
    artifacts.dockerfile = this.generateDockerfile(application);

    // Generate docker-compose for local development
    artifacts.dockerCompose = this.generateDockerCompose(application);

    // Generate Kubernetes manifests
    artifacts.kubernetesManifests = this.generateKubernetesManifests(application);

    // Generate Cloud Build configuration
    artifacts.cloudBuild = this.generateCloudBuildConfig(application);

    // Generate configuration files
    artifacts.configuration = this.generateConfiguration(application);

    return artifacts;
  }

  /**
   * Generate Dockerfile
   */
  generateDockerfile(application) {
    const language = application.platform?.toLowerCase() || 'unknown';
    let dockerfile = '';

    switch (language) {
      case 'java':
        dockerfile = `# Multi-stage build for Java application
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
`;
        break;

      case 'python':
        dockerfile = `# Multi-stage build for Python application
FROM python:3.11-slim AS base
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=base /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY . .
EXPOSE 8080
CMD ["python", "app.py"]
`;
        break;

      case 'nodejs':
        dockerfile = `# Multi-stage build for Node.js application
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
`;
        break;

      default:
        dockerfile = `# Generic Dockerfile - customize for your application
FROM ubuntu:22.04
WORKDIR /app
COPY . .
EXPOSE 8080
CMD ["./start.sh"]
`;
    }

    return dockerfile;
  }

  /**
   * Generate docker-compose.yml
   */
  generateDockerCompose(application) {
    return `version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=development
      - DB_HOST=db
      - REDIS_HOST=redis
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=changeme
    volumes:
      - db_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  db_data:
  redis_data:
`;
  }

  /**
   * Generate Kubernetes manifests
   */
  generateKubernetesManifests(application) {
    return {
      deployment: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${application.name || 'app'}
  labels:
    app: ${application.name || 'app'}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${application.name || 'app'}
  template:
    metadata:
      labels:
        app: ${application.name || 'app'}
    spec:
      containers:
      - name: ${application.name || 'app'}
        image: gcr.io/PROJECT_ID/${application.name || 'app'}:latest
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: db-host
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
`,
      service: `apiVersion: v1
kind: Service
metadata:
  name: ${application.name || 'app'}-service
spec:
  type: ClusterIP
  selector:
    app: ${application.name || 'app'}
  ports:
  - port: 80
    targetPort: 8080
`,
      ingress: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${application.name || 'app'}-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - ${application.name || 'app'}.example.com
    secretName: ${application.name || 'app'}-tls
  rules:
  - host: ${application.name || 'app'}.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${application.name || 'app'}-service
            port:
              number: 80
`,
      configMap: `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  db-host: "postgres-service"
  redis-host: "redis-service"
  log-level: "info"
`,
    };
  }

  /**
   * Generate Cloud Build configuration
   */
  generateCloudBuildConfig(application) {
    return `steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/${application.name || 'app'}:$SHORT_SHA', '.']

  # Push the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/${application.name || 'app'}:$SHORT_SHA']

  # Deploy to GKE
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
    - run
    - --filename=k8s/
    - --image=gcr.io/$PROJECT_ID/${application.name || 'app'}:$SHORT_SHA
    - --location=us-central1-a
    - --cluster=production-cluster

images:
  - 'gcr.io/$PROJECT_ID/${application.name || 'app'}:$SHORT_SHA'

options:
  logging: CLOUD_LOGGING_ONLY
`;
  }

  /**
   * Generate configuration files
   */
  generateConfiguration(application) {
    return {
      env: `# Environment configuration
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Database
DB_HOST=\${DB_HOST}
DB_PORT=5432
DB_NAME=\${DB_NAME}
DB_USER=\${DB_USER}
DB_PASSWORD=\${DB_PASSWORD}

# GCP
GCP_PROJECT_ID=\${GCP_PROJECT_ID}
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json

# Cloud Services
CLOUD_STORAGE_BUCKET=\${BUCKET_NAME}
PUBSUB_TOPIC=\${TOPIC_NAME}
`,
      readme: `# ${application.name || 'Application'} - Cloud Deployment

## Prerequisites
- Docker installed
- GCP project with GKE enabled
- kubectl configured

## Local Development
\`\`\`bash
docker-compose up
\`\`\`

## Deploy to GKE
\`\`\`bash
# Build and push image
docker build -t gcr.io/PROJECT_ID/app:v1 .
docker push gcr.io/PROJECT_ID/app:v1

# Deploy to Kubernetes
kubectl apply -f k8s/
\`\`\`

## CI/CD
Push to main branch triggers automatic deployment via Cloud Build.
`,
    };
  }

  /**
   * Create migration guide
   */
  createMigrationGuide(transformationPlan, artifacts) {
    return {
      overview: `This guide walks through the ${transformationPlan.transformation.name} process for your application.`,
      prerequisites: transformationPlan.prerequisites,
      steps: transformationPlan.phases.map((phase, index) => ({
        step: index + 1,
        name: phase.name,
        duration: phase.duration,
        instructions: phase.activities,
        artifacts: phase.outputs || [],
      })),
      testingChecklist: [
        'Local container build succeeds',
        'Container runs locally',
        'Application accessible on expected port',
        'Health checks pass',
        'Dependencies connect successfully',
        'Logs output correctly',
        'Environment variables loaded',
        'Secrets accessed securely',
      ],
      rollbackProcedure: [
        'Identify issue and decide to rollback',
        'kubectl rollout undo deployment/app-name',
        'Verify previous version is running',
        'Check application health',
        'Notify stakeholders',
        'Root cause analysis',
      ],
      troubleshooting: [
        {
          issue: 'Container fails to start',
          causes: ['Missing dependencies', 'Incorrect entrypoint', 'Port already in use'],
          solutions: ['Check logs', 'Verify Dockerfile', 'Use different port'],
        },
        {
          issue: 'Application cannot connect to database',
          causes: ['Wrong credentials', 'Network policy blocking', 'DB not ready'],
          solutions: ['Check secrets', 'Verify network policies', 'Add init containers'],
        },
      ],
    };
  }

  /**
   * Estimate transformation effort
   */
  estimateEffort(transformationPlan) {
    let totalWeeks = 0;

    transformationPlan.phases.forEach(phase => {
      // Parse duration (e.g., "3-5 days" -> average 4 days -> ~0.8 weeks)
      const durationStr = phase.duration || '1 week';
      const match = durationStr.match(/(\d+)-?(\d+)?/);
      if (match) {
        const min = parseInt(match[1]);
        const max = match[2] ? parseInt(match[2]) : min;
        const avg = (min + max) / 2;

        if (durationStr.includes('day')) {
          totalWeeks += avg / 5;
        } else if (durationStr.includes('week')) {
          totalWeeks += avg;
        }
      }
    });

    return {
      weeks: Math.round(totalWeeks),
      developers: 2,
      totalEffort: Math.round(totalWeeks * 2 * 40), // hours
      cost: Math.round(totalWeeks * 2 * 40 * 150), // $150/hour
    };
  }
}

export default CodeModAgent;
