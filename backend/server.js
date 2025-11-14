const express = require('express');
const cors = require('cors');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Secret Manager endpoints
app.get('/api/secrets/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/secrets/get', async (req, res) => {
  try {
    const { secretName, version = 'latest', projectId } = req.body;
    
    if (!secretName || !projectId) {
      return res.status(400).json({ 
        error: 'Missing required fields: secretName and projectId' 
      });
    }

    const client = new SecretManagerServiceClient();
    const name = `projects/${projectId}/secrets/${secretName}/versions/${version}`;
    const [secret] = await client.accessSecretVersion({ name });
    const payload = secret.payload.data.toString();
    
    res.json({ payload: { data: payload } });
  } catch (error) {
    console.error('Error accessing secret:', error);
    res.status(500).json({ error: error.message });
  }
});

// GCP Pricing API proxy endpoints
app.get('/api/gcp/pricing/compute', async (req, res) => {
  try {
    const { region, machineType } = req.query;
    // This is a proxy endpoint - implement actual GCP Pricing API call here
    res.json({ 
      message: 'GCP Pricing API proxy endpoint',
      region,
      machineType,
      note: 'Implement actual GCP Pricing API integration'
    });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/gcp/pricing/storage', async (req, res) => {
  try {
    const { region, storageType } = req.query;
    res.json({ 
      message: 'GCP Storage Pricing API proxy endpoint',
      region,
      storageType,
      note: 'Implement actual GCP Pricing API integration'
    });
  } catch (error) {
    console.error('Error fetching storage pricing:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/gcp/pricing/cloudsql', async (req, res) => {
  try {
    const { region, engine, tier } = req.query;
    res.json({ 
      message: 'GCP Cloud SQL Pricing API proxy endpoint',
      region,
      engine,
      tier,
      note: 'Implement actual GCP Pricing API integration'
    });
  } catch (error) {
    console.error('Error fetching Cloud SQL pricing:', error);
    res.status(500).json({ error: error.message });
  }
});

// GCP Billing API proxy
app.get('/api/gcp/billing/costs', async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    res.json({ 
      message: 'GCP Billing API proxy endpoint',
      projectId,
      startDate,
      endDate,
      note: 'Implement actual GCP Billing API integration'
    });
  } catch (error) {
    console.error('Error fetching billing data:', error);
    res.status(500).json({ error: error.message });
  }
});

// GCP Recommender API proxy
app.get('/api/gcp/recommender/recommendations', async (req, res) => {
  try {
    const { projectId, recommender } = req.query;
    res.json({ 
      message: 'GCP Recommender API proxy endpoint',
      projectId,
      recommender,
      note: 'Implement actual GCP Recommender API integration'
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Secret Manager: http://localhost:${PORT}/api/secrets`);
  console.log(`GCP Pricing: http://localhost:${PORT}/api/gcp/pricing`);
});
