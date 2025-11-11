/**
 * Architecture Diagram Parser
 * Analyzes architecture diagrams using OCR and pattern recognition
 */

// Component detection patterns
const COMPONENT_PATTERNS = {
  // Compute/VMs
  compute: [
    { keywords: ['ec2', 'instance', 'vm', 'virtual machine', 'compute', 'server'], type: 'compute' },
    { keywords: ['app server', 'application server', 'web server'], type: 'compute' },
    { keywords: ['api server', 'backend'], type: 'compute' },
  ],
  
  // Databases
  database: [
    { keywords: ['rds', 'database', 'db', 'sql', 'mysql', 'postgres', 'oracle'], type: 'database' },
    { keywords: ['dynamodb', 'nosql', 'mongodb', 'cassandra'], type: 'database' },
    { keywords: ['redshift', 'data warehouse', 'bigquery'], type: 'database' },
    { keywords: ['redis', 'cache', 'memcached'], type: 'database' },
  ],
  
  // Storage
  storage: [
    { keywords: ['s3', 'bucket', 'storage', 'blob', 'object storage'], type: 'storage' },
    { keywords: ['efs', 'file storage', 'file system'], type: 'storage' },
    { keywords: ['glacier', 'archive', 'cold storage'], type: 'storage' },
  ],
  
  // Networking
  networking: [
    { keywords: ['load balancer', 'lb', 'alb', 'nlb', 'elb'], type: 'loadbalancer' },
    { keywords: ['cdn', 'cloudfront', 'edge'], type: 'cdn' },
    { keywords: ['vpc', 'network', 'subnet'], type: 'network' },
    { keywords: ['gateway', 'api gateway'], type: 'gateway' },
  ],
  
  // Serverless
  serverless: [
    { keywords: ['lambda', 'function', 'serverless'], type: 'function' },
    { keywords: ['cloud functions', 'cloud function'], type: 'function' },
  ],
  
  // Containers/Kubernetes
  containers: [
    { keywords: ['kubernetes', 'k8s', 'eks', 'gke', 'aks'], type: 'kubernetes' },
    { keywords: ['container', 'docker', 'pod'], type: 'container' },
    { keywords: ['ecs', 'fargate'], type: 'container' },
  ],
  
  // Messaging
  messaging: [
    { keywords: ['sqs', 'queue', 'message queue'], type: 'queue' },
    { keywords: ['sns', 'pub/sub', 'pubsub'], type: 'pubsub' },
    { keywords: ['eventbridge', 'event'], type: 'event' },
  ],
};

// GCP Service Mapping
const GCP_SERVICE_MAP = {
  compute: 'Compute Engine',
  vm: 'Compute Engine',
  instance: 'Compute Engine',
  database: 'Cloud SQL',
  db: 'Cloud SQL',
  nosql: 'Firestore',
  dynamodb: 'Firestore',
  mongodb: 'MongoDB Atlas',
  datawarehouse: 'BigQuery',
  redshift: 'BigQuery',
  cache: 'Memorystore',
  redis: 'Memorystore',
  storage: 'Cloud Storage',
  bucket: 'Cloud Storage',
  filesystem: 'Filestore',
  loadbalancer: 'Cloud Load Balancing',
  lb: 'Cloud Load Balancing',
  cdn: 'Cloud CDN',
  function: 'Cloud Functions',
  serverless: 'Cloud Functions',
  kubernetes: 'Google Kubernetes Engine (GKE)',
  container: 'Cloud Run',
  queue: 'Cloud Tasks',
  pubsub: 'Pub/Sub',
  event: 'Eventarc',
};

/**
 * Analyze architecture diagram using OCR/Vision API
 * @param {ArrayBuffer} imageData - Image file data
 * @param {string} mimeType - Image MIME type
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeArchitectureDiagram(imageData, mimeType = 'image/png') {
  try {
    // Try to use Google Cloud Vision API if available
    if (process.env.REACT_APP_GOOGLE_VISION_API_KEY) {
      return await analyzeWithVisionAPI(imageData, mimeType);
    }
    
    // Fallback to client-side OCR (Tesseract.js)
    return await analyzeWithOCR(imageData, mimeType);
  } catch (error) {
    console.error('Error analyzing architecture:', error);
    // Fallback to pattern-based detection
    return await analyzeWithPatterns(imageData, mimeType);
  }
}

/**
 * Analyze using Google Cloud Vision API
 */
async function analyzeWithVisionAPI(imageData, mimeType, apiKey) {
  const base64Image = arrayBufferToBase64(imageData);
  
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              { type: 'TEXT_DETECTION', maxResults: 50 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 50 },
              { type: 'LABEL_DETECTION', maxResults: 50 },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Vision API error: ${response.statusText}. ${errorData.error?.message || ''}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Vision API error: ${data.error.message}`);
  }
  
  const annotations = data.responses[0];

  return {
    text: extractText(annotations.textAnnotations),
    labels: extractLabels(annotations.labelAnnotations),
    objects: extractObjects(annotations.localizedObjectAnnotations),
    source: 'google-vision-api',
    success: true,
  };
}

/**
 * Analyze using client-side OCR (Tesseract.js)
 * Note: Requires tesseract.js library
 */
async function analyzeWithOCR(imageData, mimeType) {
  // Check if Tesseract.js is available
  if (typeof window !== 'undefined' && window.Tesseract) {
    const { data } = await window.Tesseract.recognize(imageData, 'eng', {
      logger: m => console.log(m),
    });

    return {
      text: data.text,
      words: data.words,
      lines: data.lines,
      source: 'tesseract-ocr',
    };
  }

  // If Tesseract.js not available, use pattern-based detection
  throw new Error('Tesseract.js not available');
}

/**
 * Fallback pattern-based detection
 */
async function analyzeWithPatterns(imageData, mimeType) {
  // This is a simplified detection - in production, you'd use actual image processing
  // For now, we'll return a structure that can be enhanced with manual input
  
  return {
    text: '',
    detectedShapes: [],
    source: 'pattern-detection',
    note: 'Advanced detection requires Vision API or OCR. Please manually verify detected components.',
  };
}

/**
 * Detect components from analysis results
 * @param {Object} analysis - Analysis results
 * @returns {Array} Detected components
 */
export function detectComponents(analysis) {
  const components = [];
  const detectedText = (analysis.text || '').toLowerCase();
  const allLabels = [
    ...(analysis.labels || []),
    ...(analysis.objects || []),
    ...(detectedText.split(/\s+/)),
  ];

  // Process each pattern
  for (const [category, patterns] of Object.entries(COMPONENT_PATTERNS)) {
    for (const pattern of patterns) {
      for (const keyword of pattern.keywords) {
        // Check if keyword appears in text or labels
        const matches = allLabels.filter(label => 
          typeof label === 'string' ? label.toLowerCase().includes(keyword) : false
        );

        if (matches.length > 0 || detectedText.includes(keyword)) {
          // Extract component details
          const component = {
            name: extractComponentName(keyword, detectedText),
            type: pattern.type,
            gcpService: GCP_SERVICE_MAP[pattern.type] || 'Custom Service',
            quantity: extractQuantity(keyword, detectedText),
            ...extractSpecs(keyword, detectedText),
            confidence: matches.length > 0 ? 0.8 : 0.5,
          };

          // Avoid duplicates
          if (!components.find(c => c.name === component.name && c.type === component.type)) {
            components.push(component);
          }
        }
      }
    }
  }

  // If no components detected, provide default suggestions
  if (components.length === 0) {
    return getDefaultComponents();
  }

  return components;
}

/**
 * Extract component name from text
 */
function extractComponentName(keyword, text) {
  // Try to find labeled names in the text
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes(keyword)) {
      // Extract potential name (words before keyword)
      const parts = line.split(/\s+/);
      const keywordIndex = parts.findIndex(p => p.toLowerCase().includes(keyword));
      if (keywordIndex > 0) {
        return parts.slice(0, keywordIndex).join(' ') || keyword;
      }
      return keyword;
    }
  }
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

/**
 * Extract quantity from text
 */
function extractQuantity(keyword, text) {
  // Look for numbers near the keyword
  const regex = new RegExp(`(${keyword}).*?(\\d+)`, 'i');
  const match = text.match(regex);
  if (match && match[2]) {
    const quantity = parseInt(match[2]);
    if (quantity > 0 && quantity < 100) {
      return quantity;
    }
  }
  return 1; // Default
}

/**
 * Extract specs (CPU, memory, size) from text
 */
function extractSpecs(keyword, text) {
  const specs = {};
  
  // Extract CPU
  const cpuMatch = text.match(/(\d+)\s*(?:cpu|core|vCPU|vcpu)/i);
  if (cpuMatch) {
    specs.cpu = parseInt(cpuMatch[1]);
  }
  
  // Extract Memory
  const memMatch = text.match(/(\d+)\s*(?:gb|gb ram|memory|ram)/i);
  if (memMatch) {
    specs.memory = parseInt(memMatch[1]);
  }
  
  // Extract Storage Size
  const sizeMatch = text.match(/(\d+)\s*(?:gb|tb|gb storage|storage)/i);
  if (sizeMatch) {
    const size = parseInt(sizeMatch[1]);
    specs.size = sizeMatch[2]?.toLowerCase().includes('tb') ? size * 1024 : size;
  }
  
  return specs;
}

/**
 * Extract text from Vision API annotations
 */
function extractText(textAnnotations) {
  if (!textAnnotations || textAnnotations.length === 0) return '';
  return textAnnotations.map(ann => ann.description).join('\n');
}

/**
 * Extract labels from Vision API annotations
 */
function extractLabels(labelAnnotations) {
  if (!labelAnnotations) return [];
  return labelAnnotations.map(label => label.description);
}

/**
 * Extract objects from Vision API annotations
 */
function extractObjects(objectAnnotations) {
  if (!objectAnnotations) return [];
  return objectAnnotations.map(obj => obj.name);
}

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Default components when detection fails
 */
function getDefaultComponents() {
  return [
    {
      name: 'Web Server',
      type: 'compute',
      gcpService: 'Compute Engine',
      quantity: 2,
      cpu: 2,
      memory: 4,
      confidence: 0.3,
    },
    {
      name: 'Database',
      type: 'database',
      gcpService: 'Cloud SQL',
      quantity: 1,
      size: 100,
      confidence: 0.3,
    },
    {
      name: 'Storage',
      type: 'storage',
      gcpService: 'Cloud Storage',
      quantity: 1,
      size: 1000,
      confidence: 0.3,
    },
  ];
}

/**
 * Enhanced component detection with manual override
 * Allows users to manually add/edit detected components
 */
export function enhanceComponents(components, manualOverrides = []) {
  // Merge manual overrides
  const enhanced = [...components];
  
  for (const override of manualOverrides) {
    const existingIndex = enhanced.findIndex(
      c => c.name === override.name && c.type === override.type
    );
    
    if (existingIndex >= 0) {
      // Update existing
      enhanced[existingIndex] = { ...enhanced[existingIndex], ...override };
    } else {
      // Add new
      enhanced.push({
        ...override,
        gcpService: GCP_SERVICE_MAP[override.type] || 'Custom Service',
      });
    }
  }
  
  return enhanced;
}
