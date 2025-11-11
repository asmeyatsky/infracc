/**
 * Google Cloud CodeMod Port (Interface)
 * 
 * Architectural Intent:
 * - Defines contract for Google Cloud CodeMod integration
 * - Infrastructure layer will implement this interface
 * - Keeps domain layer independent of CodeMod implementation details
 * - Enables testing with mocks
 */

/**
 * CodeMod Analysis Request
 */
export class CodeModAnalysisRequest {
  /**
   * @param {Object} params
   * @param {string} params.sourceCode - Source code to analyze
   * @param {string} params.sourceProvider - Source cloud provider ('aws' or 'azure')
   * @param {string} params.serviceType - Service type being analyzed
   * @param {string[]} params.filePaths - File paths to analyze
   */
  constructor(params) {
    this.sourceCode = params.sourceCode;
    this.sourceProvider = params.sourceProvider;
    this.serviceType = params.serviceType;
    this.filePaths = params.filePaths || [];
  }
}

/**
 * CodeMod Analysis Result
 */
export class CodeModAnalysisResult {
  /**
   * @param {Object} params
   * @param {Object} params.serviceMappings - Detected service mappings
   * @param {Object[]} params.codeChanges - Required code changes
   * @param {Object[]} params.dependencies - Dependencies to migrate
   * @param {number} params.complexityScore - Migration complexity score
   * @param {string[]} params.recommendations - CodeMod recommendations
   */
  constructor(params) {
    this.serviceMappings = params.serviceMappings || {};
    this.codeChanges = params.codeChanges || [];
    this.dependencies = params.dependencies || [];
    this.complexityScore = params.complexityScore || 5;
    this.recommendations = params.recommendations || [];
  }
}

/**
 * CodeMod Port Interface
 * 
 * All CodeMod interactions go through this interface
 * Implementations must be in infrastructure layer
 */
export class CodeModPort {
  /**
   * Analyze source code for cloud service usage
   * @param {CodeModAnalysisRequest} request - Analysis request
   * @returns {Promise<CodeModAnalysisResult>} Analysis results
   * @abstract
   */
  async analyzeCode(request) {
    throw new Error('CodeModPort.analyzeCode must be implemented');
  }

  /**
   * Generate migration plan from CodeMod analysis
   * @param {CodeModAnalysisResult} analysisResult - Analysis results
   * @returns {Promise<Object>} Migration plan
   * @abstract
   */
  async generateMigrationPlan(analysisResult) {
    throw new Error('CodeModPort.generateMigrationPlan must be implemented');
  }

  /**
   * Get service mappings for source provider
   * @param {string} sourceProvider - Source cloud provider
   * @param {string} serviceType - Service type
   * @returns {Promise<Object>} Service mappings
   * @abstract
   */
  async getServiceMappings(sourceProvider, serviceType) {
    throw new Error('CodeModPort.getServiceMappings must be implemented');
  }

  /**
   * Check if CodeMod service is available
   * @returns {Promise<boolean>} True if available
   * @abstract
   */
  async isAvailable() {
    throw new Error('CodeModPort.isAvailable must be implemented');
  }
}

export default CodeModPort;
