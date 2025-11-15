/**
 * GCP API Integration Framework
 *
 * This module provides integration with Google Cloud Platform APIs for:
 * - Live cost data retrieval
 * - Resource inventory and discovery
 * - Recommendations API
 * - Billing exports
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. Enable Required APIs in GCP Console:
 *    - Cloud Resource Manager API
 *    - Cloud Billing API
 *    - Compute Engine API
 *    - Recommender API
 *    - Cloud Asset Inventory API
 *
 * 2. Create Service Account:
 *    gcloud iam service-accounts create migration-accelerator \
 *      --display-name="Migration Accelerator Service Account"
 *
 * 3. Grant Required Roles:
 *    gcloud projects add-iam-policy-binding PROJECT_ID \
 *      --member="serviceAccount:migration-accelerator@PROJECT_ID.iam.gserviceaccount.com" \
 *      --role="roles/compute.viewer"
 *
 *    gcloud organizations add-iam-policy-binding ORG_ID \
 *      --member="serviceAccount:migration-accelerator@PROJECT_ID.iam.gserviceaccount.com" \
 *      --role="roles/recommender.viewer"
 *
 *    gcloud organizations add-iam-policy-binding ORG_ID \
 *      --member="serviceAccount:migration-accelerator@PROJECT_ID.iam.gserviceaccount.com" \
 *      --role="roles/billing.viewer"
 *
 * 4. Create and Download Service Account Key:
 *    gcloud iam service-accounts keys create key.json \
 *      --iam-account=migration-accelerator@PROJECT_ID.iam.gserviceaccount.com
 *
 * 5. Set Environment Variables:
 *    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
 *    export GCP_PROJECT_ID="your-project-id"
 *    export GCP_BILLING_ACCOUNT="your-billing-account"
 *
 * 6. Install Google Cloud Client Libraries:
 *    npm install @google-cloud/compute @google-cloud/billing @google-cloud/recommender
 *
 * BACKEND REQUIREMENTS:
 * This integration requires a backend API server (Node.js/Python/Go) to:
 * - Authenticate with GCP using service account credentials
 * - Proxy API requests to avoid CORS issues
 * - Cache responses for performance
 * - Handle rate limiting and pagination
 *
 * Example Backend Structure:
 *
 * backend/
 * ├── api/
 * │   ├── billing.js         # Billing API endpoints
 * │   ├── compute.js         # Compute inventory endpoints
 * │   ├── recommendations.js # Recommendations endpoints
 * │   └── inventory.js       # Asset inventory endpoints
 * ├── middleware/
 * │   ├── auth.js            # Authentication middleware
 * │   └── cache.js           # Response caching
 * ├── services/
 * │   └── gcp.js             # GCP client initialization
 * └── server.js              # Express/Fastify server
 */

// Configuration
const GCP_CONFIG = {
  apiEndpoint: process.env.REACT_APP_GCP_API_ENDPOINT || 'http://localhost:3002/api',
  projectId: process.env.REACT_APP_GCP_PROJECT_ID,
  billingAccount: process.env.REACT_APP_GCP_BILLING_ACCOUNT,
};

/**
 * Fetch live cost data from Cloud Billing API
 *
 * @param {string} billingAccount - GCP Billing Account ID
 * @param {Date} startDate - Start date for cost query
 * @param {Date} endDate - End date for cost query
 * @returns {Promise<Array>} - Array of cost entries
 */
export const fetchLiveCosts = async (billingAccount, startDate, endDate) => {
  try {
    const response = await fetch(`${GCP_CONFIG.apiEndpoint}/billing/costs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billingAccount,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch costs: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching live costs:', error);
    throw error;
  }
};

/**
 * Discover compute instances across projects
 *
 * @param {Array<string>} projectIds - List of GCP project IDs
 * @returns {Promise<Array>} - Array of compute instances
 */
export const discoverComputeInstances = async (projectIds) => {
  try {
    const response = await fetch(`${GCP_CONFIG.apiEndpoint}/compute/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectIds }),
    });

    if (!response.ok) {
      throw new Error(`Failed to discover instances: ${response.statusText}`);
    }

    const instances = await response.json();

    // Transform to workload format
    return instances.map(instance => ({
      id: Date.now() + Math.random(),
      name: instance.name,
      type: 'vm',
      os: instance.machineType.includes('windows') ? 'windows' : 'linux',
      cpu: instance.machineType.split('-').pop() || 2,
      memory: instance.memoryMb / 1024 || 8,
      storage: instance.disksSizeGb?.reduce((sum, disk) => sum + disk, 0) || 100,
      monthlyTraffic: 0, // Would need to query from monitoring/metrics
      dependencies: '', // Would need to analyze from VPC/firewall rules
      zone: instance.zone,
      project: instance.project,
    }));
  } catch (error) {
    console.error('Error discovering compute instances:', error);
    throw error;
  }
};

/**
 * Fetch cost optimization recommendations
 *
 * @param {string} projectId - GCP Project ID
 * @returns {Promise<Array>} - Array of recommendations
 */
export const fetchRecommendations = async (projectId) => {
  try {
    const response = await fetch(`${GCP_CONFIG.apiEndpoint}/recommendations/${projectId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
    }

    const recommendations = await response.json();

    // Transform to application format
    return recommendations.map(rec => ({
      id: rec.name,
      category: rec.recommenderSubtype,
      title: rec.description,
      impact: `$${rec.primaryImpact?.costProjection?.cost?.units || 0}/month`,
      priority: rec.priority,
      resource: rec.content?.overview?.resourceName || 'Unknown',
    }));
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
};

/**
 * Export billing data to BigQuery
 *
 * @param {string} billingAccount - GCP Billing Account ID
 * @param {string} datasetId - BigQuery dataset ID
 * @returns {Promise<Object>} - Export configuration
 */
export const setupBillingExport = async (billingAccount, datasetId) => {
  try {
    const response = await fetch(`${GCP_CONFIG.apiEndpoint}/billing/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billingAccount,
        datasetId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to setup billing export: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error setting up billing export:', error);
    throw error;
  }
};

/**
 * Query Cloud Asset Inventory for full resource inventory
 *
 * @param {string} scope - Organization or project scope (e.g., "organizations/123456")
 * @param {Array<string>} assetTypes - Types of assets to query
 * @returns {Promise<Array>} - Array of assets
 */
export const queryAssetInventory = async (scope, assetTypes = []) => {
  try {
    const response = await fetch(`${GCP_CONFIG.apiEndpoint}/inventory/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope,
        assetTypes: assetTypes.length > 0 ? assetTypes : [
          'compute.googleapis.com/Instance',
          'compute.googleapis.com/Disk',
          'storage.googleapis.com/Bucket',
          'sqladmin.googleapis.com/Instance',
          'container.googleapis.com/Cluster',
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to query asset inventory: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error querying asset inventory:', error);
    throw error;
  }
};

/**
 * Validate GCP API connectivity and credentials
 *
 * @returns {Promise<Object>} - Validation result with status and details
 */
export const validateGCPConnection = async () => {
  try {
    const response = await fetch(`${GCP_CONFIG.apiEndpoint}/validate`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return {
        status: 'error',
        message: 'Backend API is not accessible',
        connected: false,
      };
    }

    const result = await response.json();
    return {
      status: 'success',
      message: 'GCP API integration is working',
      connected: true,
      projectId: result.projectId,
      enabledAPIs: result.enabledAPIs,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      connected: false,
    };
  }
};

// Demo/Mock data for development and testing
export const MOCK_LIVE_COSTS = [
  { service: 'Compute Engine', cost: 1250.00, currency: 'USD', month: '2025-09' },
  { service: 'Cloud Storage', cost: 450.00, currency: 'USD', month: '2025-09' },
  { service: 'Cloud SQL', cost: 780.00, currency: 'USD', month: '2025-09' },
  { service: 'Networking', cost: 320.00, currency: 'USD', month: '2025-09' },
];

export const MOCK_RECOMMENDATIONS = [
  {
    id: 'rec-1',
    category: 'STOP_VM',
    title: 'Stop idle VM instances',
    impact: '$234/month',
    priority: 'HIGH',
    resource: 'projects/my-project/zones/us-central1-a/instances/idle-vm-1',
  },
  {
    id: 'rec-2',
    category: 'SNAPSHOT_AND_DELETE_DISK',
    title: 'Snapshot and delete unused disks',
    impact: '$45/month',
    priority: 'MEDIUM',
    resource: 'projects/my-project/zones/us-west1-b/disks/unused-disk-1',
  },
  {
    id: 'rec-3',
    category: 'CHANGE_MACHINE_TYPE',
    title: 'Downsize over-provisioned VMs',
    impact: '$156/month',
    priority: 'HIGH',
    resource: 'projects/my-project/zones/europe-west1-d/instances/oversized-vm',
  },
];

export default {
  fetchLiveCosts,
  discoverComputeInstances,
  fetchRecommendations,
  setupBillingExport,
  queryAssetInventory,
  validateGCPConnection,
  MOCK_LIVE_COSTS,
  MOCK_RECOMMENDATIONS,
};
