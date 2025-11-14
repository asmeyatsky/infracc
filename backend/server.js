const express = require('express');
const cors = require('cors');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Root route - serves HTML for browsers, JSON for API clients
app.get('/', (req, res) => {
  const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
  const wantsJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  
  if (wantsJson || !acceptsHtml) {
    return res.json({ 
      message: 'InfraCC Backend API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        secrets: {
          health: '/api/secrets/health',
          get: 'POST /api/secrets/get'
        },
        gcp: {
          pricing: {
            compute: '/api/gcp/pricing/compute',
            storage: '/api/gcp/pricing/storage',
            cloudsql: '/api/gcp/pricing/cloudsql'
          },
          billing: {
            costs: '/api/gcp/billing/costs'
          },
          recommender: {
            recommendations: '/api/gcp/recommender/recommendations'
          }
        }
      }
    });
  }
  
  // Serve HTML page for browsers
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>InfraCC Backend API</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
          color: #333;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px;
          text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .status {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.9em;
          margin-top: 15px;
        }
        .content {
          padding: 40px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h2 {
          color: #667eea;
          margin-bottom: 15px;
          font-size: 1.5em;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
        }
        .endpoint {
          background: #f9fafb;
          border-left: 4px solid #667eea;
          padding: 15px;
          margin: 10px 0;
          border-radius: 4px;
        }
        .endpoint code {
          background: #e5e7eb;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: 'Monaco', 'Courier New', monospace;
          color: #667eea;
          font-weight: bold;
        }
        .method {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.85em;
          font-weight: bold;
          margin-right: 8px;
        }
        .method.get { background: #10b981; color: white; }
        .method.post { background: #3b82f6; color: white; }
        .footer {
          background: #f9fafb;
          padding: 20px;
          text-align: center;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
        }
        a { color: #667eea; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 InfraCC Backend API</h1>
          <p>Version 1.0.0</p>
          <div class="status">✓ Running</div>
        </div>
        <div class="content">
          <div class="section">
            <h2>Health Check</h2>
            <div class="endpoint">
              <span class="method get">GET</span>
              <code>/health</code>
              <p style="margin-top: 8px; color: #6b7280;">Server health status</p>
            </div>
          </div>
          
          <div class="section">
            <h2>Secret Manager</h2>
            <div class="endpoint">
              <span class="method get">GET</span>
              <code>/api/secrets/health</code>
              <p style="margin-top: 8px; color: #6b7280;">Secret Manager health check</p>
            </div>
            <div class="endpoint">
              <span class="method post">POST</span>
              <code>/api/secrets/get</code>
              <p style="margin-top: 8px; color: #6b7280;">Retrieve secret from GCP Secret Manager</p>
            </div>
          </div>
          
          <div class="section">
            <h2>GCP Pricing API</h2>
            <div class="endpoint">
              <span class="method get">GET</span>
              <code>/api/gcp/pricing/compute</code>
              <p style="margin-top: 8px; color: #6b7280;">Get GCP compute pricing</p>
            </div>
            <div class="endpoint">
              <span class="method get">GET</span>
              <code>/api/gcp/pricing/storage</code>
              <p style="margin-top: 8px; color: #6b7280;">Get GCP storage pricing</p>
            </div>
            <div class="endpoint">
              <span class="method get">GET</span>
              <code>/api/gcp/pricing/cloudsql</code>
              <p style="margin-top: 8px; color: #6b7280;">Get GCP Cloud SQL pricing</p>
            </div>
          </div>
          
          <div class="section">
            <h2>GCP Billing API</h2>
            <div class="endpoint">
              <span class="method get">GET</span>
              <code>/api/gcp/billing/costs</code>
              <p style="margin-top: 8px; color: #6b7280;">Get billing costs for a project</p>
            </div>
          </div>
          
          <div class="section">
            <h2>GCP Recommender API</h2>
            <div class="endpoint">
              <span class="method get">GET</span>
              <code>/api/gcp/recommender/recommendations</code>
              <p style="margin-top: 8px; color: #6b7280;">Get optimization recommendations</p>
            </div>
          </div>
        </div>
        <div class="footer">
          <p>API Documentation | <a href="/?format=json">View JSON</a> | <a href="/health">Health Check</a></p>
        </div>
      </div>
    </body>
    </html>
  `);
});

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
