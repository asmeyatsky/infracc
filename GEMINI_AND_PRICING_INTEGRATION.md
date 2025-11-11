# Gemini AI & Google Cloud Pricing API Integration

## ✅ Integration Status

### 1. **Google Gemini AI Integration** ✅
   - **Status**: Integrated and ready to use
   - **Location**: `src/utils/geminiIntegration.js`
   - **Features**:
     - Migration strategy recommendations
     - Cost optimization insights
     - Workload assessment analysis
     - Natural language assistance
     - AI-powered agent responses

### 2. **Google Cloud Pricing API** ✅
   - **Status**: Integrated with latest APIs
   - **Location**: `src/utils/googleCloudPricingAPI.js`
   - **APIs Used**:
     - Cloud Billing API v1 (actual costs)
     - Cloud Pricing API (price lists)
     - Recommender API (optimization recommendations)
     - Service Usage API (service catalog)

## 🔧 Setup Instructions

### Gemini AI Setup

1. **Get Gemini API Key**:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the API key

2. **Configure Environment Variable**:
   ```bash
   # .env file
   REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Usage**:
   ```javascript
   import { createGeminiClient } from './utils/geminiIntegration.js';
   
   const gemini = createGeminiClient();
   const recommendations = await gemini.generateMigrationStrategy(workloadData);
   ```

### Google Cloud Pricing API Setup

1. **Enable Required APIs**:
   ```bash
   # Enable Cloud Billing API
   gcloud services enable cloudbilling.googleapis.com
   
   # Enable Recommender API
   gcloud services enable recommender.googleapis.com
   
   # Enable Service Usage API
   gcloud services enable serviceusage.googleapis.com
   ```

2. **Set Up Authentication**:
   - Option 1: API Key (for public data)
     ```bash
     # .env file
     REACT_APP_GCP_API_KEY=your_gcp_api_key_here
     REACT_APP_GCP_PROJECT_ID=your_project_id
     ```
   
   - Option 2: Service Account (recommended for production)
     ```bash
     # Create service account
     gcloud iam service-accounts create pricing-api-sa
     
     # Grant permissions
     gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
       --member="serviceAccount:pricing-api-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
       --role="roles/billing.viewer"
     
     # Download key
     gcloud iam service-accounts keys create key.json \
       --iam-account=pricing-api-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
     ```

3. **Backend Proxy Setup** (Required due to CORS):
   - The frontend requires a backend proxy for GCP APIs
   - Set backend endpoint:
     ```bash
     # .env file
     REACT_APP_GCP_PRICING_BACKEND=http://localhost:3001/api/gcp/pricing
     REACT_APP_GCP_BILLING_BACKEND=http://localhost:3001/api/gcp/billing
     REACT_APP_GCP_RECOMMENDER_BACKEND=http://localhost:3001/api/gcp/recommender
     ```

## 📊 API Endpoints Used

### Gemini API
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`
- **Model**: `gemini-pro`
- **Features**:
  - Text generation
  - Migration strategy analysis
  - Cost optimization recommendations
  - Natural language Q&A

### Google Cloud Pricing API
- **Cloud Billing API**: `https://cloudbilling.googleapis.com/v1`
  - Get actual costs
  - List billing accounts
  - Export billing data
  
- **Cloud Pricing API**: `https://cloudbilling.googleapis.com/v1`
  - Get SKU pricing
  - List services
  - Get price lists
  
- **Recommender API**: `https://recommender.googleapis.com/v1`
  - Cost optimization recommendations
  - Right-sizing suggestions
  - Commitment recommendations

## 🎯 Features Enabled

### With Gemini AI:
1. **Intelligent Migration Strategies**
   - AI-powered 6 R's recommendations
   - Context-aware strategy selection
   - Risk assessment and mitigation

2. **Cost Optimization Insights**
   - AI-generated optimization recommendations
   - Right-sizing suggestions
   - Reserved instance analysis

3. **Natural Language Assistance**
   - Ask questions about migration
   - Get explanations of GCP services
   - Receive step-by-step guidance

### With Google Cloud Pricing API:
1. **Real-Time Pricing**
   - Latest GCP pricing data
   - Regional pricing variations
   - Usage-based pricing calculations

2. **Actual Cost Tracking**
   - Real billing data
   - Cost trends analysis
   - Budget alerts

3. **Optimization Recommendations**
   - Machine type recommendations
   - Commitment discounts
   - Storage optimization

## 🔄 Integration Points

### Agents Using Gemini:
- **AssessmentAgent**: AI-powered workload assessment
- **PlanningAgent**: Intelligent migration planning
- **CostAnalysisAgent**: AI cost optimization insights
- **AssistantAgent**: Natural language assistance

### Components Using Pricing API:
- **CostAnalysisAgent**: Real-time pricing calculations
- **EnhancedTcoCalculator**: Accurate TCO analysis
- **ResourceOptimization**: Optimization recommendations
- **CostDashboard**: Real billing data

## 📝 Example Usage

### Using Gemini for Migration Strategy:
```javascript
import { createGeminiClient } from './utils/geminiIntegration.js';

const gemini = createGeminiClient();
const strategy = await gemini.generateMigrationStrategy({
  name: 'web-server-01',
  type: 'vm',
  service: 'EC2',
  cpu: 4,
  memory: 16,
  storage: 100,
  monthlyCost: 150,
  dependencies: ['db-server']
});
```

### Using GCP Pricing API:
```javascript
import { createGCPPricingClient } from './utils/googleCloudPricingAPI.js';

const pricing = createGCPPricingClient();
const computePrice = await pricing.getComputePricing(
  'n1-standard-4',
  'us-central1',
  'OnDemand'
);
```

## ⚠️ Important Notes

1. **Backend Proxy Required**: GCP APIs require a backend proxy due to:
   - CORS restrictions
   - Authentication requirements
   - API key security

2. **API Keys**: Store API keys securely:
   - Never commit keys to git
   - Use environment variables
   - Rotate keys regularly

3. **Rate Limits**: Both APIs have rate limits:
   - Gemini: Check current limits at Google AI Studio
   - GCP Pricing: Varies by API and quota

4. **Costs**: 
   - Gemini API: Free tier available, then pay-per-use
   - GCP Pricing API: Free for pricing queries

## 🚀 Next Steps

1. **Set up environment variables** with your API keys
2. **Configure backend proxy** for GCP APIs
3. **Test integrations** using the example code
4. **Enable features** in agent configuration

## 📚 Documentation Links

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Google Cloud Billing API](https://cloud.google.com/billing/docs/reference/rest)
- [Google Cloud Pricing API](https://cloud.google.com/billing/docs/how-to/export-data-bigquery)
- [Recommender API](https://cloud.google.com/recommender/docs/reference/rest)
