/**
 * Google Cloud CodeMod Adapter
 * 
 * Architectural Intent:
 * - Infrastructure layer implementation of CodeModPort
 * - Handles all CodeMod API interactions
 * - Converts between domain models and CodeMod API formats
 * - Isolated from domain layer
 * - Enhanced with caching, retry logic, and better error handling
 */

import { CodeModPort, CodeModAnalysisRequest, CodeModAnalysisResult } from '../../domain/ports/CodeModPort.js';

/**
 * Google Cloud CodeMod Adapter
 * 
 * Implementation Notes:
 * - Integrates with Google Cloud CodeMod API
 * - Falls back to mock data if API unavailable
 * - Handles API errors gracefully
 * - Includes caching for performance
 * - Retry logic for transient failures
 * - Enhanced error messages
 */
export class CodeModAdapter extends CodeModPort {
  /**
   * @param {Object} config
   * @param {string} config.apiKey - CodeMod API key (optional)
   * @param {string} config.baseUrl - CodeMod API base URL
   * @param {boolean} config.useMock - Whether to use mock data
   * @param {number} config.maxRetries - Maximum retry attempts (default: 3)
   * @param {number} config.retryDelay - Delay between retries in ms (default: 1000)
   * @param {number} config.cacheTTL - Cache TTL in ms (default: 3600000 = 1 hour)
   */
  constructor(config = {}) {
    super();
    this.apiKey = config.apiKey || process.env.REACT_APP_CODEMOD_API_KEY;
    this.baseUrl = config.baseUrl || 'https://codemod.googleapis.com/v1';
    this.useMock = config.useMock || !this.apiKey;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.cacheTTL = config.cacheTTL || 3600000; // 1 hour
    
    // In-memory cache for API responses
    this._cache = new Map();
    this._availabilityChecked = false;
    this._isAvailable = false;
  }

  /**
   * Analyze source code for cloud service usage
   * @param {CodeModAnalysisRequest} request 
   * @returns {Promise<CodeModAnalysisResult>}
   */
  async analyzeCode(request) {
    if (!(request instanceof CodeModAnalysisRequest)) {
      throw new Error('Invalid request type');
    }

    // Check cache first
    const cacheKey = this._getCacheKey('analyze', request);
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.useMock) {
      const result = this._mockAnalysis(request);
      this._saveToCache(cacheKey, result);
      return result;
    }

    // Retry logic for API calls
    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Request-ID': this._generateRequestId()
          },
          body: JSON.stringify({
            sourceCode: request.sourceCode,
            sourceProvider: request.sourceProvider,
            serviceType: request.serviceType,
            filePaths: request.filePaths
          }),
          // Add timeout
          signal: AbortSignal.timeout(30000) // 30 seconds
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`CodeMod API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const result = this._mapApiResponseToResult(data);
        
        // Cache successful response
        this._saveToCache(cacheKey, result);
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry on 4xx errors (client errors)
        if (error.message.includes('(4')) {
          console.warn('CodeMod API client error (not retrying):', error);
          break;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await this._sleep(delay);
          console.warn(`CodeMod API call failed, retrying (${attempt + 1}/${this.maxRetries})...`, error);
        }
      }
    }

    // All retries failed, use mock
    console.warn('CodeMod API call failed after retries, using mock:', lastError);
    const mockResult = this._mockAnalysis(request);
    this._saveToCache(cacheKey, mockResult);
    return mockResult;
  }

  /**
   * Generate migration plan from CodeMod analysis
   * @param {CodeModAnalysisResult} analysisResult 
   * @returns {Promise<Object>}
   */
  async generateMigrationPlan(analysisResult) {
    if (!(analysisResult instanceof CodeModAnalysisResult)) {
      throw new Error('Invalid analysis result type');
    }

    // Extract service mappings and generate plan
    const plan = {
      serviceMappings: analysisResult.serviceMappings,
      codeChanges: analysisResult.codeChanges,
      dependencies: analysisResult.dependencies,
      estimatedEffort: this._estimateEffort(analysisResult.complexityScore),
      recommendations: analysisResult.recommendations
    };

    return plan;
  }

  /**
   * Get service mappings for source provider
   * @param {string} sourceProvider 
   * @param {string} serviceType 
   * @returns {Promise<Object>}
   */
  async getServiceMappings(sourceProvider, serviceType) {
    // Check cache first
    const cacheKey = `mapping_${sourceProvider}_${serviceType}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.useMock) {
      const result = this._mockServiceMapping(sourceProvider, serviceType);
      this._saveToCache(cacheKey, result);
      return result;
    }

    // Retry logic
    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(
          `${this.baseUrl}/mappings/${sourceProvider}/${serviceType}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'X-Request-ID': this._generateRequestId()
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`CodeMod API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const result = this._mapMappingResponse(data);
        
        // Cache successful response
        this._saveToCache(cacheKey, result);
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry on 4xx errors
        if (error.message.includes('(4')) {
          console.warn('CodeMod mapping API client error (not retrying):', error);
          break;
        }
        
        // Wait before retry
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await this._sleep(delay);
        }
      }
    }

    // All retries failed, use mock
    console.warn('CodeMod mapping API failed after retries, using mock:', lastError);
    const mockResult = this._mockServiceMapping(sourceProvider, serviceType);
    this._saveToCache(cacheKey, mockResult);
    return mockResult;
  }

  /**
   * Check if CodeMod service is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    if (this.useMock) {
      return true; // Mock is always available
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Map API response to CodeModAnalysisResult
   * @private
   */
  _mapApiResponseToResult(apiData) {
    return new CodeModAnalysisResult({
      serviceMappings: apiData.serviceMappings || {},
      codeChanges: apiData.codeChanges || [],
      dependencies: apiData.dependencies || [],
      complexityScore: apiData.complexityScore || 5,
      recommendations: apiData.recommendations || []
    });
  }

  /**
   * Map mapping API response
   * @private
   */
  _mapMappingResponse(apiData) {
    return {
      gcpService: apiData.gcpService,
      gcpApi: apiData.gcpApi,
      strategy: apiData.strategy,
      effort: apiData.effort,
      notes: apiData.notes,
      considerations: apiData.considerations || []
    };
  }

  /**
   * Mock analysis for testing/fallback
   * @private
   */
  _mockAnalysis(request) {
    // Generate mock service mappings based on service type
    const serviceMappings = this._generateMockMappings(request.serviceType, request.sourceProvider);
    
    return new CodeModAnalysisResult({
      serviceMappings,
      codeChanges: [
        {
          type: 'service_call_replacement',
          description: `Replace ${request.serviceType} calls with GCP equivalent`,
          file: 'example.js',
          line: 1
        }
      ],
      dependencies: [],
      complexityScore: 5,
      recommendations: [
        'Review service mappings and update code accordingly',
        'Test migration in staging environment first'
      ]
    });
  }

  /**
   * Mock service mapping
   * @private
   */
  _mockServiceMapping(sourceProvider, serviceType) {
    const mappings = {
      aws: {
        'EC2': {
          gcpService: 'Compute Engine',
          gcpApi: 'compute.googleapis.com',
          strategy: 'rehost',
          effort: 'low',
          notes: 'Direct VM migration',
          considerations: ['Instance sizing', 'Network configuration']
        },
        'S3': {
          gcpService: 'Cloud Storage',
          gcpApi: 'storage.googleapis.com',
          strategy: 'rehost',
          effort: 'low',
          notes: 'Bucket migration',
          considerations: ['Bucket naming', 'Access controls']
        },
        'Lambda': {
          gcpService: 'Cloud Functions',
          gcpApi: 'cloudfunctions.googleapis.com',
          strategy: 'replatform',
          effort: 'medium',
          notes: 'Function runtime differences',
          considerations: ['Event structure', 'Timeout limits']
        }
      },
      azure: {
        'Virtual Machines': {
          gcpService: 'Compute Engine',
          gcpApi: 'compute.googleapis.com',
          strategy: 'rehost',
          effort: 'low',
          notes: 'Direct VM migration',
          considerations: ['VM sizing', 'Disk configuration']
        },
        'Blob Storage': {
          gcpService: 'Cloud Storage',
          gcpApi: 'storage.googleapis.com',
          strategy: 'rehost',
          effort: 'low',
          notes: 'Blob container migration',
          considerations: ['Container naming', 'Access policies']
        },
        'Functions': {
          gcpService: 'Cloud Functions',
          gcpApi: 'cloudfunctions.googleapis.com',
          strategy: 'replatform',
          effort: 'medium',
          notes: 'Function runtime differences',
          considerations: ['Binding differences', 'Trigger configuration']
        }
      }
    };

    const providerMappings = mappings[sourceProvider] || {};
    return providerMappings[serviceType] || {
      gcpService: 'Unknown',
      gcpApi: '',
      strategy: 'rehost',
      effort: 'medium',
      notes: 'No mapping found',
      considerations: []
    };
  }

  /**
   * Generate mock mappings
   * @private
   */
  _generateMockMappings(serviceType, sourceProvider) {
    const mapping = this._mockServiceMapping(sourceProvider, serviceType);
    return {
      [serviceType]: mapping
    };
  }

  /**
   * Estimate effort from complexity score
   * @private
   */
  _estimateEffort(complexityScore) {
    if (complexityScore <= 3) return 'low';
    if (complexityScore <= 7) return 'medium';
    return 'high';
  }
}

export default CodeModAdapter;
