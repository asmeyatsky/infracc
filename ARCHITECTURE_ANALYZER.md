# Architecture Diagram Cost Analyzer

## Overview

The Architecture Diagram Cost Analyzer allows you to upload architecture diagrams and automatically calculate the estimated running costs on Google Cloud Platform. The system uses OCR and AI vision APIs to detect components in your diagrams and map them to GCP services.

## Features

- 📐 **Multiple Input Methods**: Upload images or provide image URLs
- 🔍 **Smart Component Detection**: Automatically detects compute, storage, database, networking, and serverless components
- 💰 **Automatic Cost Calculation**: Calculates monthly and annual costs based on detected components
- 🎯 **GCP Service Mapping**: Maps detected components to appropriate GCP services
- 📊 **Detailed Cost Breakdown**: Shows costs by component and service category

## Supported Diagram Formats

- **Image Formats**: PNG, JPG, JPEG, WebP, SVG
- **Diagram Tools**: 
  - AWS Architecture Icons
  - Draw.io diagrams
  - Lucidchart diagrams
  - Microsoft Visio
  - Any architecture diagram with text labels

## How It Works

1. **Upload Diagram**: Upload your architecture diagram image or provide a URL
2. **Analysis**: The system analyzes the diagram using:
   - Google Cloud Vision API (if configured) - Best accuracy
   - Client-side OCR (Tesseract.js) - Good accuracy
   - Pattern-based detection - Fallback option
3. **Component Detection**: Identifies:
   - Compute instances (VMs, servers)
   - Databases (SQL, NoSQL, data warehouses)
   - Storage (object storage, file systems)
   - Networking (load balancers, CDNs, gateways)
   - Serverless functions
   - Containers/Kubernetes clusters
4. **Cost Calculation**: Estimates costs based on:
   - Detected component types
   - Estimated specifications (CPU, memory, storage)
   - GCP pricing data
5. **Results Display**: Shows:
   - Detected components with GCP service mappings
   - Monthly and annual cost breakdowns
   - Detailed cost per component

## Setup

### Option 1: Google Cloud Vision API (Recommended)

For best accuracy, configure Google Cloud Vision API:

1. **Enable Vision API**:
```bash
gcloud services enable vision.googleapis.com
```

2. **Create API Key**:
```bash
# Create API key in GCP Console
# API & Services > Credentials > Create Credentials > API Key
```

3. **Set Environment Variable**:
```bash
export REACT_APP_GOOGLE_VISION_API_KEY="your-api-key"
```

### Option 2: Client-Side OCR (Tesseract.js)

For client-side analysis without backend:

1. **Install Tesseract.js**:
```bash
npm install tesseract.js
```

2. **Import in Component**:
```javascript
import Tesseract from 'tesseract.js';
window.Tesseract = Tesseract;
```

### Option 3: Pattern-Based Detection

If no API is configured, the system uses pattern-based detection which looks for common keywords in the diagram.

## Usage

### Basic Usage

```javascript
import ArchitectureDiagramAnalyzer from './components/ArchitectureDiagramAnalyzer';

function App() {
  const handleCostsCalculated = (result) => {
    console.log('Detected Components:', result.components);
    console.log('Cost Breakdown:', result.costs);
  };

  return (
    <ArchitectureDiagramAnalyzer onCostsCalculated={handleCostsCalculated} />
  );
}
```

### Manual Component Override

After detection, you can manually edit components:

```javascript
const enhancedComponents = enhanceComponents(detectedComponents, [
  {
    name: 'Production Database',
    type: 'database',
    quantity: 2,
    size: 500, // GB
    dbType: 'Cloud SQL',
  },
  {
    name: 'API Server',
    type: 'compute',
    cpu: 4,
    memory: 16,
    quantity: 3,
  },
]);
```

## Component Detection Patterns

The system recognizes common architecture patterns:

### Compute Components
- EC2, Instance, VM, Virtual Machine
- App Server, Application Server
- Web Server, API Server

### Database Components
- RDS, Database, DB, SQL
- DynamoDB, NoSQL, MongoDB
- Redshift, Data Warehouse
- Redis, Cache

### Storage Components
- S3, Bucket, Object Storage
- EFS, File Storage
- Glacier, Archive Storage

### Networking Components
- Load Balancer, LB, ALB, NLB
- CDN, CloudFront
- VPC, Network, Gateway

### Serverless Components
- Lambda, Function, Serverless
- Cloud Functions

## Cost Estimation

Costs are estimated based on:

- **Compute**: Instance type estimation from CPU/memory, multiplied by hours
- **Storage**: Size × storage class pricing
- **Database**: Size-based Cloud SQL tier estimation
- **Networking**: Base fees + data transfer costs
- **Serverless**: Invocations + compute time

## Accuracy Notes

- **High Accuracy**: When using Google Cloud Vision API with clear, labeled diagrams
- **Medium Accuracy**: With client-side OCR on high-quality images
- **Lower Accuracy**: Pattern-based detection (requires manual verification)

## Best Practices

1. **Use Clear Labels**: Ensure component names are clearly visible in the diagram
2. **Include Specifications**: Add CPU, memory, and storage details in labels when possible
3. **Verify Detections**: Review detected components and manually adjust if needed
4. **Provide Context**: Include quantity information (e.g., "3 × Web Server")

## Example Diagram Labels

For best results, label components like:

```
Production DB (PostgreSQL)
- 2 vCPU
- 16 GB RAM
- 500 GB Storage

Load Balancer
- 2 instances

Web Servers
- 4 instances
- 2 vCPU each
- 8 GB RAM each
```

## Integration with TCO Calculator

The detected costs can be integrated with the main TCO calculator:

```javascript
const handleCostsCalculated = (result) => {
  // Update TCO calculator with detected costs
  updateTcoCalculator({
    gcp: {
      compute: result.costs.monthly.compute,
      storage: result.costs.monthly.storage,
      database: result.costs.monthly.database,
      networking: result.costs.monthly.networking,
      monitoring: 0,
    },
  });
};
```

## Troubleshooting

### No Components Detected

- Ensure diagram has clear text labels
- Try using Google Cloud Vision API for better accuracy
- Manually add components using the component editor

### Incorrect Component Detection

- Review detected components and manually adjust
- Provide more specific labels in your diagram
- Use standardized architecture icon sets (AWS, Azure, GCP)

### Cost Estimates Too High/Low

- Verify detected component specifications
- Adjust quantity and size values manually
- Review GCP pricing for your specific region

## API Reference

### `analyzeArchitectureDiagram(imageData, mimeType)`

Analyzes an architecture diagram image.

**Parameters:**
- `imageData`: ArrayBuffer of image data
- `mimeType`: Image MIME type (e.g., 'image/png')

**Returns:** Promise resolving to analysis object

### `detectComponents(analysis)`

Detects components from analysis results.

**Parameters:**
- `analysis`: Analysis result object

**Returns:** Array of detected components

### `enhanceComponents(components, manualOverrides)`

Enhances detected components with manual overrides.

**Parameters:**
- `components`: Array of detected components
- `manualOverrides`: Array of component overrides

**Returns:** Enhanced component array

## Future Enhancements

- Support for Draw.io XML format
- Support for AWS/Azure architecture diagrams
- Machine learning model for better component detection
- Integration with actual GCP resource discovery
- Cost optimization recommendations
