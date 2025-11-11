/**
 * Google Gemini AI Integration
 * 
 * Uses Google's Gemini Pro API for AI-powered features:
 * - Migration strategy recommendations
 * - Cost optimization insights
 * - Workload assessment analysis
 * - Natural language assistance
 */

import { getConfigManager } from './configManager.js';

const GEMINI_CONFIG = {
  apiKey: '', // Will be loaded from ConfigManager
  apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
  fallbackModel: 'gemini-pro',
  temperature: 0.7,
  maxTokens: 2048,
};

/**
 * Gemini AI Client
 */
class GeminiClient {
  constructor(config = {}) {
    this.configManager = getConfigManager();
    this.apiKey = config.apiKey || '';
    this.apiEndpoint = config.apiEndpoint || GEMINI_CONFIG.apiEndpoint;
    this.temperature = config.temperature || GEMINI_CONFIG.temperature;
    this.maxTokens = config.maxTokens || GEMINI_CONFIG.maxTokens;
    this._apiKeyPromise = null; // Cache the promise to avoid multiple calls
  }

  /**
   * Get API key (from Secret Manager or env var)
   * @private
   */
  async _getApiKey() {
    if (this.apiKey) {
      return this.apiKey;
    }

    if (!this._apiKeyPromise) {
      this._apiKeyPromise = this.configManager.getGeminiApiKey();
    }

    this.apiKey = await this._apiKeyPromise;
    return this.apiKey;
  }

  /**
   * Generate content using Gemini
   * @param {string} prompt - Input prompt
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Generated content
   */
  async generateContent(prompt, options = {}) {
    // Get API key from Secret Manager or env var
    const apiKey = await this._getApiKey();
    
    if (!apiKey) {
      console.warn('Gemini API key not configured, using fallback');
      return this._fallbackResponse(prompt);
    }

    try {
      const response = await fetch(
        `${this.apiEndpoint}?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: options.temperature || this.temperature,
              maxOutputTokens: options.maxTokens || this.maxTokens,
              topP: options.topP || 0.95,
              topK: options.topK || 40,
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              }
            ]
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return this._fallbackResponse(prompt);
    }
  }

  /**
   * Generate migration strategy recommendations
   * @param {Object} workloadData - Workload information
   * @returns {Promise<string>} AI-generated recommendations
   */
  async generateMigrationStrategy(workloadData) {
    const prompt = `As a cloud migration expert, analyze this workload and recommend the best migration strategy using the 6 R's framework (Rehost, Replatform, Refactor, Repurchase, Retire, Retain).

Workload Details:
- Name: ${workloadData.name}
- Type: ${workloadData.type}
- Service: ${workloadData.service}
- CPU: ${workloadData.cpu} cores
- Memory: ${workloadData.memory} GB
- Storage: ${workloadData.storage} GB
- Monthly Cost: $${workloadData.monthlyCost}
- Dependencies: ${workloadData.dependencies?.join(', ') || 'None'}

Provide:
1. Recommended migration strategy (6 R's)
2. Effort level (Low/Medium/High)
3. Estimated migration timeline
4. Key considerations and risks
5. GCP service recommendations`;

    return await this.generateContent(prompt);
  }

  /**
   * Generate cost optimization recommendations
   * @param {Object} costData - Cost analysis data
   * @returns {Promise<string>} AI-generated optimization recommendations
   */
  async generateCostOptimization(costData) {
    const prompt = `As a cloud cost optimization expert, analyze these costs and provide optimization recommendations.

Current Costs:
- AWS Monthly: $${costData.aws || 0}
- Azure Monthly: $${costData.azure || 0}
- GCP Monthly: $${costData.gcp || 0}
- On-Premise Monthly: $${costData.onPremise || 0}

Provide:
1. Cost optimization opportunities
2. Right-sizing recommendations
3. Reserved instance analysis
4. Storage optimization suggestions
5. Estimated savings potential`;

    return await this.generateContent(prompt);
  }

  /**
   * Analyze workload assessment
   * @param {Object} assessmentData - Assessment results
   * @returns {Promise<string>} AI-generated analysis
   */
  async analyzeAssessment(assessmentData) {
    const prompt = `As a cloud migration assessment expert, analyze this workload assessment and provide insights.

Assessment Results:
- Readiness Score: ${assessmentData.readinessScore || 'N/A'}/10
- Complexity Score: ${assessmentData.complexityScore || 'N/A'}/10
- Risk Level: ${assessmentData.riskLevel || 'Unknown'}
- Migration Effort: ${assessmentData.effort || 'Unknown'}

Provide:
1. Key findings and insights
2. Risk factors and mitigation strategies
3. Migration readiness assessment
4. Recommendations for improvement
5. Next steps`;

    return await this.generateContent(prompt);
  }

  /**
   * Natural language assistance
   * @param {string} question - User question
   * @param {Object} context - Context about the migration
   * @returns {Promise<string>} AI-generated answer
   */
  async answerQuestion(question, context = {}) {
    const contextPrompt = context.workloads 
      ? `Context: Analyzing ${context.workloads.length} workloads for migration to Google Cloud Platform.`
      : 'Context: Cloud migration to Google Cloud Platform.';

    const prompt = `${contextPrompt}

Question: ${question}

Provide a helpful, accurate answer about cloud migration, Google Cloud Platform services, or migration strategies.`;

    return await this.generateContent(prompt);
  }

  /**
   * Fallback response when API is unavailable
   * @private
   */
  _fallbackResponse(prompt) {
    return 'AI analysis is currently unavailable. Please ensure Gemini API key is configured in environment variables (REACT_APP_GEMINI_API_KEY).';
  }
}

/**
 * Check if Gemini API is available
 */
export async function checkGeminiAvailability() {
  const configManager = getConfigManager();
  const apiKey = await configManager.getGeminiApiKey();
  return {
    available: !!apiKey,
    configured: !!apiKey,
    endpoint: GEMINI_CONFIG.apiEndpoint,
    source: apiKey ? (process.env.REACT_APP_GEMINI_API_KEY ? 'environment' : 'secret-manager') : 'none',
  };
}

/**
 * Create Gemini client instance
 */
export function createGeminiClient(config = {}) {
  return new GeminiClient(config);
}

export default GeminiClient;
