/**
 * Google Cloud Secret Manager Integration
 * 
 * Securely retrieves API keys and secrets from Google Cloud Secret Manager
 * 
 * Setup:
 * 1. Enable Secret Manager API: gcloud services enable secretmanager.googleapis.com
 * 2. Create secrets: gcloud secrets create SECRET_NAME --data-file=-
 * 3. Grant access: gcloud secrets add-iam-policy-binding SECRET_NAME --member="serviceAccount:SA@PROJECT.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
 */

const SECRET_MANAGER_CONFIG = {
  // Secret Manager API endpoint
  apiEndpoint: 'https://secretmanager.googleapis.com/v1',
  
  // Project ID
  projectId: process.env.REACT_APP_GCP_PROJECT_ID || '',
  
  // Backend proxy endpoint (required due to CORS and authentication)
  backendEndpoint: process.env.REACT_APP_SECRET_MANAGER_BACKEND || 'http://localhost:3001/api/secrets',
  
  // Cache settings
  cacheTimeout: 300000, // 5 minutes (secrets should be cached but refreshed regularly)
  useCache: true,
};

// In-memory cache for secrets
const secretCache = new Map();

/**
 * Google Cloud Secret Manager Client
 */
class SecretManagerClient {
  constructor(config = {}) {
    this.projectId = config.projectId || SECRET_MANAGER_CONFIG.projectId;
    this.backendEndpoint = config.backendEndpoint || SECRET_MANAGER_CONFIG.backendEndpoint;
  }

  /**
   * Get secret value
   * @param {string} secretName - Secret name (without project path)
   * @param {string} version - Secret version ('latest' by default)
   * @returns {Promise<string>} Secret value
   */
  async getSecret(secretName, version = 'latest') {
    const cacheKey = `secret-${secretName}-${version}`;
    
    // Check cache
    if (SECRET_MANAGER_CONFIG.useCache && secretCache.has(cacheKey)) {
      const cached = secretCache.get(cacheKey);
      if (Date.now() - cached.timestamp < SECRET_MANAGER_CONFIG.cacheTimeout) {
        return cached.value;
      }
    }

    try {
      // Use backend proxy to access Secret Manager
      const response = await fetch(`${this.backendEndpoint}/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secretName,
          version,
          projectId: this.projectId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Secret Manager API error: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      const secretValue = data.payload?.data || data.secretValue;
      
      if (!secretValue) {
        throw new Error('Secret value not found in response');
      }

      // Decode base64 if needed
      let decodedValue;
      try {
        decodedValue = atob(secretValue);
      } catch (e) {
        // If not base64, use as-is
        decodedValue = secretValue;
      }

      // Cache the result
      if (SECRET_MANAGER_CONFIG.useCache) {
        secretCache.set(cacheKey, {
          value: decodedValue,
          timestamp: Date.now(),
        });
      }

      return decodedValue;
    } catch (error) {
      console.error(`Error fetching secret ${secretName}:`, error);
      throw error;
    }
  }

  /**
   * Get Gemini API key from Secret Manager
   * @returns {Promise<string>} Gemini API key
   */
  async getGeminiApiKey() {
    return await this.getSecret('gemini-api-key');
  }

  /**
   * Get GCP API key from Secret Manager
   * @returns {Promise<string>} GCP API key
   */
  async getGcpApiKey() {
    return await this.getSecret('gcp-api-key');
  }

  /**
   * Get multiple secrets at once
   * @param {string[]} secretNames - Array of secret names
   * @returns {Promise<Object>} Object with secret names as keys and values as values
   */
  async getSecrets(secretNames) {
    const secrets = {};
    await Promise.all(
      secretNames.map(async (name) => {
        try {
          secrets[name] = await this.getSecret(name);
        } catch (error) {
          console.error(`Failed to get secret ${name}:`, error);
          secrets[name] = null;
        }
      })
    );
    return secrets;
  }

  /**
   * Clear secret cache
   */
  clearCache() {
    secretCache.clear();
  }

  /**
   * Clear specific secret from cache
   * @param {string} secretName - Secret name
   */
  clearSecretCache(secretName) {
    for (const key of secretCache.keys()) {
      if (key.includes(secretName)) {
        secretCache.delete(key);
      }
    }
  }
}

/**
 * Check if Secret Manager is available
 */
export async function checkSecretManagerAvailability() {
  try {
    const backendEndpoint = SECRET_MANAGER_CONFIG.backendEndpoint;
    const response = await fetch(`${backendEndpoint}/health`, {
      method: 'GET',
    });
    return {
      available: response.ok,
      configured: !!SECRET_MANAGER_CONFIG.projectId,
      backendEndpoint,
    };
  } catch (error) {
    return {
      available: false,
      configured: !!SECRET_MANAGER_CONFIG.projectId,
      backendEndpoint: SECRET_MANAGER_CONFIG.backendEndpoint,
      error: error.message,
    };
  }
}

/**
 * Create Secret Manager client
 */
export function createSecretManagerClient(config = {}) {
  return new SecretManagerClient(config);
}

export default SecretManagerClient;
