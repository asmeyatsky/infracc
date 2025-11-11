/**
 * Configuration Manager
 * 
 * Manages application configuration with fallback hierarchy:
 * 1. Secret Manager (production)
 * 2. Environment variables (development)
 * 3. Default values
 */

import { createSecretManagerClient, checkSecretManagerAvailability } from './secretManager.js';

class ConfigManager {
  constructor() {
    this.secretManager = null;
    this.useSecretManager = false;
    this.configCache = {};
    this.initialized = false;
  }

  /**
   * Initialize configuration manager
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Check if Secret Manager is available
      const availability = await checkSecretManagerAvailability();
      
      if (availability.available && availability.configured) {
        this.secretManager = createSecretManagerClient();
        this.useSecretManager = true;
        console.log('Using Secret Manager for configuration');
      } else {
        console.log('Using environment variables for configuration');
        this.useSecretManager = false;
      }
    } catch (error) {
      console.warn('Failed to initialize Secret Manager, using environment variables:', error);
      this.useSecretManager = false;
    }

    this.initialized = true;
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key
   * @param {string} defaultValue - Default value if not found
   * @returns {Promise<string>} Configuration value
   */
  async getConfig(key, defaultValue = '') {
    await this.initialize();

    // Check cache first
    if (this.configCache[key]) {
      return this.configCache[key];
    }

    let value = defaultValue;

    try {
      if (this.useSecretManager && this.secretManager) {
        // Try Secret Manager first
        try {
          const secretName = this._getSecretName(key);
          value = await this.secretManager.getSecret(secretName);
        } catch (error) {
          console.warn(`Secret ${key} not found in Secret Manager, trying environment variable`);
        }
      }

      // Fallback to environment variable
      if (!value || value === defaultValue) {
        const envKey = this._getEnvKey(key);
        value = process.env[envKey] || defaultValue;
      }

      // Cache the value
      this.configCache[key] = value;
    } catch (error) {
      console.error(`Error getting config ${key}:`, error);
      value = defaultValue;
    }

    return value;
  }

  /**
   * Get Gemini API key
   */
  async getGeminiApiKey() {
    return await this.getConfig('gemini-api-key', process.env.REACT_APP_GEMINI_API_KEY || '');
  }

  /**
   * Get GCP API key
   */
  async getGcpApiKey() {
    return await this.getConfig('gcp-api-key', process.env.REACT_APP_GCP_API_KEY || '');
  }

  /**
   * Get GCP Project ID
   */
  async getGcpProjectId() {
    return await this.getConfig('gcp-project-id', process.env.REACT_APP_GCP_PROJECT_ID || '');
  }

  /**
   * Get all configuration values
   */
  async getAllConfig() {
    await this.initialize();

    const configKeys = [
      'gemini-api-key',
      'gcp-api-key',
      'gcp-project-id',
      'gcp-pricing-backend',
      'gcp-billing-backend',
      'gcp-recommender-backend',
      'secret-manager-backend',
    ];

    const config = {};
    await Promise.all(
      configKeys.map(async (key) => {
        config[key] = await this.getConfig(key);
      })
    );

    return config;
  }

  /**
   * Clear configuration cache
   */
  clearCache() {
    this.configCache = {};
    if (this.secretManager) {
      this.secretManager.clearCache();
    }
  }

  /**
   * Convert config key to secret name
   * @private
   */
  _getSecretName(key) {
    // Secret names are already in kebab-case format, return as-is
    return key;
  }

  /**
   * Convert config key to environment variable name
   * @private
   */
  _getEnvKey(key) {
    // Convert kebab-case to UPPER_SNAKE_CASE with REACT_APP_ prefix
    return `REACT_APP_${key.toUpperCase().replace(/-/g, '_')}`;
  }
}

// Singleton instance
let configManagerInstance = null;

/**
 * Get configuration manager instance
 */
export function getConfigManager() {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager();
  }
  return configManagerInstance;
}

export default ConfigManager;
