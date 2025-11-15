// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { google } = require('googleapis');

// Use built-in fetch (Node 18+) or node-fetch as fallback
let fetch;
if (typeof globalThis.fetch === 'function') {
  fetch = globalThis.fetch;
} else {
  try {
    fetch = require('node-fetch');
  } catch (e) {
    console.warn('fetch not available - API key authentication may not work');
  }
}

const app = express();
const PORT = process.env.PORT || 3002;

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
    
    // Get GCP API key from environment variable or Secret Manager
    let apiKey = process.env.GCP_API_KEY;
    console.log('[GCP API] Environment check:', {
      hasApiKey: !!apiKey,
      hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GCP_PROJECT_ID
    });
    
    // Try to get from Secret Manager if API key not in env
    if (!apiKey) {
      try {
        const secretClient = new SecretManagerServiceClient();
        const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
        if (projectId) {
          const [version] = await secretClient.accessSecretVersion({
            name: `projects/${projectId}/secrets/gcp-api-key/versions/latest`,
          });
          apiKey = version.payload.data.toString();
          console.log('[GCP API] Retrieved API key from Secret Manager');
        }
      } catch (secretError) {
        // Secret Manager not available or not configured - continue without it
        console.log('[GCP API] Secret Manager not available, using environment variable');
      }
    }
    
    if (apiKey) {
      console.log('[GCP API] API key found, will attempt API key authentication');
    }
    
    // Try to use API key first (for simpler authentication)
    // Note: GCP Cloud Billing API typically requires OAuth, but we'll try API key first
    if (apiKey) {
      try {
        // Try using API key with direct fetch (may not work for Cloud Billing API)
        const response = await fetch(
          `https://cloudbilling.googleapis.com/v1/services/6F81-5844-456A/skus?key=${apiKey}&currencyCode=USD`,
          {
            headers: {
              'Accept': 'application/json',
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const skus = data.skus || [];
          
          // Normalize region format
          const normalizeRegion = (reg) => {
            return reg.replace(/-/g, ' ').toLowerCase();
          };
          
          const machineTypeLower = (machineType || '').toLowerCase();
          const regionLower = normalizeRegion(region || '');
          
          // Find matching SKU
          let matchingSku = skus.find(sku => {
            const desc = (sku.description || '').toLowerCase();
            const skuId = (sku.skuId || '').toLowerCase();
            const skuRegion = normalizeRegion(desc);
            
            const hasMachineType = desc.includes(machineTypeLower) || 
                                  skuId.includes(machineTypeLower);
            const hasRegion = desc.includes(regionLower) || 
                             skuRegion.includes(regionLower);
            
            return hasMachineType && hasRegion;
          });
          
          // If no exact match, try just machine type
          if (!matchingSku) {
            matchingSku = skus.find(sku => {
              const desc = (sku.description || '').toLowerCase();
              const skuId = (sku.skuId || '').toLowerCase();
              return desc.includes(machineTypeLower) || skuId.includes(machineTypeLower);
            });
          }
          
          if (matchingSku?.pricingInfo?.[0]?.pricingExpression?.tieredRates?.[0]?.unitPrice) {
            const unitPrice = matchingSku.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice;
            const nanos = unitPrice.nanos || 0;
            const units = unitPrice.units || '0';
            const pricePerHour = parseFloat(units) + (nanos / 1e9);
            const pricePerMonth = pricePerHour * 730;
            
            console.log(`[GCP API] Found pricing via API key for ${machineType} in ${region}: $${pricePerMonth}/month`);
            
            return res.json({
              onDemand: pricePerMonth,
              sustainedUse: pricePerMonth * 0.75,
              pricePerHour,
              machineType,
              region,
              currency: 'USD',
              source: 'GCP Cloud Billing API (API Key)'
            });
          } else {
            console.log(`[GCP API] API key worked but no matching SKU found for ${machineType} in ${region}`);
          }
        } else {
          const errorText = await response.text();
          console.warn(`[GCP API] API key request failed: ${response.status} ${response.statusText}`, errorText);
        }
      } catch (apiKeyError) {
        console.warn('[GCP API] API key authentication failed:', apiKeyError.message);
      }
    }
    
    // Fallback: Try service account authentication
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialsPath) {
      console.log(`[GCP API] Attempting service account authentication with: ${credentialsPath}`);
    }
    
    try {
      const billing = google.cloudbilling('v1');
      const auth = new google.auth.GoogleAuth({
        keyFilename: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      
      const authClient = await auth.getClient();
      google.options({ auth: authClient });
      console.log('[GCP API] Service account authentication successful');
      
      // Compute Engine service ID
      const serviceName = 'services/6F81-5844-456A';
      
      // List SKUs for Compute Engine
      const response = await billing.services.skus.list({
        parent: serviceName,
        currencyCode: 'USD',
      });
      
      const skus = response.data.skus || [];
      console.log(`[GCP API] Found ${skus.length} SKUs for Compute Engine`);
      
      // Debug: Show sample SKU descriptions to understand the format
      if (skus.length > 0) {
        const sampleSkus = skus.slice(0, 10).map(s => ({
          skuId: s.skuId,
          description: s.description,
          category: s.category?.serviceDisplayName
        }));
        console.log(`[GCP API] Sample SKU descriptions:`, JSON.stringify(sampleSkus, null, 2));
      }
      
      // Normalize region format (us-central1 -> us central1, us-central-1, etc.)
      const normalizeRegion = (reg) => {
        return reg.replace(/-/g, ' ').toLowerCase();
      };
      
      const machineTypeLower = (machineType || '').toLowerCase();
      const regionLower = normalizeRegion(region || '');
      
      // Parse machine type to extract family and size (e.g., "n1-standard-1" -> "n1", "standard")
      const machineTypeParts = machineTypeLower.split('-');
      const family = machineTypeParts[0] || ''; // e.g., "n1", "e2", "c2"
      const series = machineTypeParts[1] || ''; // e.g., "standard", "highcpu", "highmem"
      
      // GCP SKU descriptions use formats like:
      // "N1 Standard Instance Core running in Iowa"
      // "Preemptible N1 Standard Instance Core running in us-central1"
      // So we need to search for "N1" + "Standard" + "Instance" + region
      
      // Normalize region to match GCP format (us-central1 -> "Iowa", "us central", etc.)
      const regionMap = {
        'us-central1': ['iowa', 'us central', 'uscentral'],
        'us-east1': ['south carolina', 'us east'],
        'us-west1': ['oregon', 'us west'],
        'europe-west1': ['belgium', 'europe west'],
        'asia-east1': ['taiwan', 'asia east'],
      };
      
      const regionVariations = [
        region?.toLowerCase(),
        region?.replace(/-/g, ' '),
        ...(regionMap[region?.toLowerCase()] || [])
      ].filter(Boolean);
      
      // Find matching SKU for machine type and region
      let matchingSku = skus.find(sku => {
        const desc = (sku.description || '').toLowerCase();
        
        // Check for machine type pattern: "N1 Standard Instance" or "n1 standard"
        const hasFamily = desc.includes(family);
        const hasSeries = series ? desc.includes(series) : true;
        const hasInstance = desc.includes('instance') || desc.includes('core');
        
        // Check if region matches
        const hasRegion = regionVariations.some(regVar => 
          desc.includes(regVar) || desc.includes(regVar.replace(' ', ''))
        );
        
        // Must be on-demand (not committed use, not sustained use, not preemptible/spot)
        const isOnDemand = !desc.includes('commitment') &&
                          !desc.includes('sustained use') &&
                          !desc.includes('preemptible') &&
                          !desc.includes('spot') &&
                          !desc.includes('sole tenancy');
        
        return hasFamily && hasSeries && hasInstance && hasRegion && isOnDemand;
      });
      
      // If no exact match, try just machine type family and series (ignore region)
      if (!matchingSku) {
        console.log(`[GCP API] No exact match, trying machine type only (${family}-${series})...`);
        matchingSku = skus.find(sku => {
          const desc = (sku.description || '').toLowerCase();
          const hasFamily = desc.includes(family);
          const hasSeries = series ? desc.includes(series) : true;
          const hasInstance = desc.includes('instance') || desc.includes('core');
          const isOnDemand = !desc.includes('commitment') &&
                            !desc.includes('sustained use') &&
                            !desc.includes('preemptible') &&
                            !desc.includes('spot') &&
                            !desc.includes('sole tenancy');
          return hasFamily && hasSeries && hasInstance && isOnDemand;
        });
      }
      
      // Log sample SKUs for debugging if still no match
      if (!matchingSku && skus.length > 0) {
        // Look for SKUs that match the family
        const familyMatches = skus.filter(sku => {
          const desc = (sku.description || '').toLowerCase();
          return desc.includes(family);
        });
        
        console.log(`[GCP API] Found ${familyMatches.length} SKUs matching family "${family}"`);
        
        // Show sample of what these SKUs look like
        console.log(`[GCP API] Sample ${family} SKUs:`, 
          familyMatches.slice(0, 10).map(s => ({
            skuId: s.skuId,
            description: s.description?.substring(0, 150)
          }))
        );
        
        // Filter for standard series and on-demand
        // Note: GCP SKUs might say "Predefined" instead of "Standard" for n1-standard
        const potentialMatches = familyMatches.filter(sku => {
          const desc = (sku.description || '').toLowerCase();
          // For n1-standard, also accept "predefined" or "standard"
          const hasSeries = series ? (
            desc.includes(series) || 
            (series === 'standard' && desc.includes('predefined'))
          ) : true;
          const isOnDemand = !desc.includes('commitment') &&
                            !desc.includes('sustained use') &&
                            !desc.includes('preemptible') &&
                            !desc.includes('spot') &&
                            !desc.includes('sole tenancy');
          return hasSeries && isOnDemand;
        }).slice(0, 10);
        
        console.log(`[GCP API] Found ${potentialMatches.length} potential ${machineTypeLower} matches:`, 
          potentialMatches.map(s => ({
            skuId: s.skuId,
            description: s.description?.substring(0, 200),
            hasPricing: !!s.pricingInfo?.[0],
            pricingExpression: s.pricingInfo?.[0]?.pricingExpression ? 'yes' : 'no'
          }))
        );
        
        // Try to use the first potential match if it has pricing
        if (potentialMatches.length > 0) {
          const matchWithPricing = potentialMatches.find(s => 
            s.pricingInfo?.[0]?.pricingExpression?.tieredRates?.[0]?.unitPrice
          );
          
          if (matchWithPricing) {
            matchingSku = matchWithPricing;
            console.log(`[GCP API] Using match: ${matchWithPricing.skuId} - ${matchWithPricing.description?.substring(0, 100)}`);
          }
        }
      }
      
      if (matchingSku?.pricingInfo?.[0]?.pricingExpression?.tieredRates?.[0]?.unitPrice) {
        const unitPrice = matchingSku.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice;
        const nanos = unitPrice.nanos || 0;
        const units = unitPrice.units || '0';
        const pricePerHour = parseFloat(units) + (nanos / 1e9);
        const pricePerMonth = pricePerHour * 730; // Approximate hours per month
        
        console.log(`[GCP API] Found pricing for ${machineType} in ${region}: $${pricePerMonth}/month`);
        
        return res.json({
          onDemand: pricePerMonth,
          sustainedUse: pricePerMonth * 0.75, // Sustained use discount
          pricePerHour,
          machineType,
          region,
          currency: 'USD',
          source: 'GCP Cloud Billing API'
        });
      }
      
      console.log(`[GCP API] No exact match found for ${machineType} in ${region}, using standard pricing`);
    } catch (apiError) {
      console.warn('[GCP API] Cloud Billing API error:', apiError.message);
      console.warn('[GCP API] Error details:', apiError);
      // Continue to fallback pricing below
    }
    
    // Fallback: Use standard GCP pricing based on machine type
    // These are approximate prices - actual prices vary by region
    const standardPricing = {
      'e2-micro': { onDemand: 5.69, sustainedUse: 4.27 },
      'e2-small': { onDemand: 11.38, sustainedUse: 8.54 },
      'e2-medium': { onDemand: 22.76, sustainedUse: 17.07 },
      'n1-standard-1': { onDemand: 34.67, sustainedUse: 24.27 },
      'n1-standard-2': { onDemand: 69.34, sustainedUse: 48.54 },
      'n1-standard-4': { onDemand: 138.68, sustainedUse: 97.08 },
    };
    
    const machineTypeKey = machineType?.toLowerCase() || 'n1-standard-1';
    const pricing = standardPricing[machineTypeKey] || standardPricing['n1-standard-1'];
    
    res.json({
      onDemand: pricing.onDemand,
      sustainedUse: pricing.sustainedUse,
      machineType: machineType || 'n1-standard-1',
      region,
      currency: 'USD',
      note: 'Using standard GCP pricing (API lookup may require authentication)'
    });
  } catch (error) {
    console.error('Error fetching compute pricing:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/gcp/pricing/storage', async (req, res) => {
  try {
    const { region, storageType } = req.query;
    
    // GCP Cloud Storage pricing (per GB/month)
    // These are standard GCP pricing - can be fetched from Cloud Billing API
    const storagePricing = {
      'standard': 0.020,      // Standard storage
      'nearline': 0.010,      // Nearline storage
      'coldline': 0.007,      // Coldline storage
      'archive': 0.004        // Archive storage
    };
    
    const pricePerGB = storagePricing[storageType?.toLowerCase()] || storagePricing['standard'];
    
    // Try to get from Cloud Billing API if credentials are available
    try {
      const billing = google.cloudbilling('v1');
      const auth = new google.auth.GoogleAuth({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      
      const authClient = await auth.getClient();
      google.options({ auth: authClient });
      
      // Cloud Storage service ID
      const serviceName = 'services/95FF-2EF5-5EA1';
      const response = await billing.services.getSkus({
        parent: serviceName,
        currencyCode: 'USD',
      });
      
      // Find matching SKU for storage class and region
      const skus = response.data.skus || [];
      const matchingSku = skus.find(sku => {
        const desc = sku.description?.toLowerCase() || '';
        return desc.includes(storageType?.toLowerCase() || 'standard') &&
               desc.includes(region?.toLowerCase() || '');
      });
      
      if (matchingSku?.pricingInfo?.[0]?.pricingExpression?.tieredRates?.[0]?.unitPrice) {
        const unitPrice = matchingSku.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice;
        const nanos = unitPrice.nanos || 0;
        const units = unitPrice.units || '0';
        const actualPrice = parseFloat(units) + (nanos / 1e9);
        
        return res.json({
          price: actualPrice,
          pricePerGB: actualPrice,
          storageType,
          region,
          currency: 'USD'
        });
      }
    } catch (apiError) {
      console.warn('GCP Billing API error for storage, using standard pricing:', apiError.message);
    }
    
    // Return standard pricing
    res.json({
      price: pricePerGB,
      pricePerGB: pricePerGB,
      storageType: storageType || 'standard',
      region,
      currency: 'USD',
      note: 'Using standard GCP pricing'
    });
  } catch (error) {
    console.error('Error fetching storage pricing:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/gcp/pricing/cloudsql', async (req, res) => {
  try {
    const { region, engine, tier } = req.query;
    
    // Standard Cloud SQL pricing (per month)
    const sqlPricing = {
      'db-f1-micro': { price: 8.57 },
      'db-g1-small': { price: 17.14 },
      'db-n1-standard-1': { price: 50.00 },
      'db-n1-standard-2': { price: 100.00 },
      'db-n1-standard-4': { price: 200.00 },
    };
    
    const defaultTier = tier || 'db-f1-micro';
    const defaultPrice = sqlPricing[defaultTier]?.price || sqlPricing['db-f1-micro'].price;
    
    // Try to get from Cloud Billing API
    try {
      const billing = google.cloudbilling('v1');
      const auth = new google.auth.GoogleAuth({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      
      const authClient = await auth.getClient();
      google.options({ auth: authClient });
      
      // Cloud SQL service ID
      const serviceName = 'services/9661-2F4C-5D98';
      const response = await billing.services.getSkus({
        parent: serviceName,
        currencyCode: 'USD',
      });
      
      // Find matching SKU
      const skus = response.data.skus || [];
      const matchingSku = skus.find(sku => {
        const desc = sku.description?.toLowerCase() || '';
        return desc.includes(tier?.toLowerCase() || '') &&
               desc.includes(engine?.toLowerCase() || '') &&
               desc.includes(region?.toLowerCase() || '');
      });
      
      if (matchingSku?.pricingInfo?.[0]?.pricingExpression?.tieredRates?.[0]?.unitPrice) {
        const unitPrice = matchingSku.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice;
        const nanos = unitPrice.nanos || 0;
        const units = unitPrice.units || '0';
        const pricePerHour = parseFloat(units) + (nanos / 1e9);
        const pricePerMonth = pricePerHour * 730;
        
        return res.json({
          price: pricePerMonth,
          costPerMonth: pricePerMonth,
          pricePerHour,
          engine: engine || 'postgresql',
          tier: defaultTier,
          region,
          currency: 'USD'
        });
      }
    } catch (apiError) {
      console.warn('GCP Billing API error for Cloud SQL, using standard pricing:', apiError.message);
    }
    
    // Return standard pricing
    res.json({
      price: defaultPrice,
      costPerMonth: defaultPrice,
      engine: engine || 'postgresql',
      tier: defaultTier,
      region,
      currency: 'USD',
      note: 'Using standard GCP pricing'
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
