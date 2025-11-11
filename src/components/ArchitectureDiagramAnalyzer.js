/**
 * Architecture Diagram Analyzer
 * Analyzes architecture diagrams and calculates GCP costs
 */

import React, { useState, useRef, useEffect } from 'react';
import CloudPricingAPI from '../utils/cloudPricingAPI';
import { analyzeArchitectureDiagram, detectComponents } from '../utils/architectureParser';

function ArchitectureDiagramAnalyzer({ onCostsCalculated }) {
  const [uploadMethod, setUploadMethod] = useState('upload'); // 'upload' or 'url'
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedComponents, setDetectedComponents] = useState(null);
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('not-configured'); // 'configured' | 'not-configured'
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (PNG, JPG, SVG, etc.)');
        return;
      }
      setImageFile(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = () => {
    if (!imageUrl.trim()) {
      setError('Please enter an image URL');
      return;
    }
    setImagePreview(imageUrl);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!imageFile && !imageUrl) {
      setError('Please upload an image or provide an image URL');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setDetectedComponents(null);
    setCostBreakdown(null);

    try {
      // Get image data
      let imageData;
      if (imageFile) {
        imageData = await imageFile.arrayBuffer();
      } else {
        // Fetch image from URL
        const response = await fetch(imageUrl);
        imageData = await response.arrayBuffer();
      }

      // Analyze architecture diagram
      const analysis = await analyzeArchitectureDiagram(imageData, imageFile?.type || 'image/png');
      
      // Detect components
      const components = detectComponents(analysis);
      setDetectedComponents(components);

      // Calculate costs
      const costs = await calculateArchitectureCosts(components);
      setCostBreakdown(costs);

      // Pass costs to parent component
      if (onCostsCalculated) {
        onCostsCalculated({
          components,
          costs,
          image: imagePreview,
        });
      }
    } catch (error) {
      console.error('Error analyzing architecture:', error);
      setError(`Failed to analyze diagram: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const calculateArchitectureCosts = async (components) => {
    const costs = {
      compute: 0,
      storage: 0,
      database: 0,
      networking: 0,
      serverless: 0,
      other: 0,
      total: 0,
    };

    const monthlyBreakdown = [];

    // Calculate costs for each detected component
    for (const component of components) {
      let componentCost = 0;
      const costDetails = {
        component: component.name,
        type: component.type,
        gcpService: component.gcpService,
        quantity: component.quantity || 1,
        cost: 0,
        details: {},
      };

      switch (component.type) {
        case 'compute':
        case 'vm':
        case 'instance':
          // Estimate compute costs
          const cpu = component.cpu || 2;
          const memory = component.memory || 4;
          const instances = component.quantity || 1;
          
          // Estimate instance type based on CPU/memory
          const estimatedType = estimateInstanceType(cpu, memory);
          const hourlyRate = await getGCPComputePrice(estimatedType);
          componentCost = hourlyRate * 730 * instances; // 730 hours/month
          
          costDetails.cost = componentCost;
          costDetails.details = {
            instanceType: estimatedType,
            cpu,
            memory,
            instances,
            hourlyRate,
          };
          costs.compute += componentCost;
          break;

        case 'database':
        case 'db':
          // Database costs
          const dbSize = component.size || 100; // GB
          const dbType = component.dbType || 'Cloud SQL';
          
          if (dbType === 'Cloud SQL') {
            const dbCost = await getGCPDatabasePrice(dbSize);
            componentCost = dbCost * (component.quantity || 1);
          } else if (dbType === 'Firestore') {
            // Firestore pricing
            componentCost = dbSize * 0.18; // $0.18 per GB
          } else if (dbType === 'Bigtable') {
            componentCost = dbSize * 0.065; // $0.065 per GB
          }
          
          costDetails.cost = componentCost;
          costDetails.details = {
            dbType,
            size: dbSize,
            quantity: component.quantity || 1,
          };
          costs.database += componentCost;
          break;

        case 'storage':
        case 'bucket':
          // Storage costs
          const storageSize = component.size || 1000; // GB
          const storageClass = component.storageClass || 'Standard';
          const storagePrice = await getGCPStoragePrice(storageClass);
          componentCost = storageSize * storagePrice;
          
          costDetails.cost = componentCost;
          costDetails.details = {
            size: storageSize,
            storageClass,
            pricePerGB: storagePrice,
          };
          costs.storage += componentCost;
          break;

        case 'loadbalancer':
        case 'lb':
          // Load balancer costs
          componentCost = 18; // $18/month base + data processing
          if (component.traffic) {
            componentCost += component.traffic * 0.008; // $0.008 per GB
          }
          
          costDetails.cost = componentCost;
          costDetails.details = {
            traffic: component.traffic || 0,
          };
          costs.networking += componentCost;
          break;

        case 'cdn':
          // CDN costs
          const cdnTraffic = component.traffic || 0;
          componentCost = Math.max(0, cdnTraffic - 1024) * 0.08; // First 1TB free, then $0.08/GB
          
          costDetails.cost = componentCost;
          costDetails.details = {
            traffic: cdnTraffic,
          };
          costs.networking += componentCost;
          break;

        case 'function':
        case 'serverless':
          // Cloud Functions costs
          const invocations = component.invocations || 1000000;
          const computeTime = component.computeTime || 200000; // GB-seconds
          componentCost = (invocations * 0.0000004) + (computeTime * 0.0000025);
          
          costDetails.cost = componentCost;
          costDetails.details = {
            invocations,
            computeTime,
          };
          costs.serverless += componentCost;
          break;

        case 'kubernetes':
        case 'gke':
          // GKE cluster costs
          const nodes = component.nodes || 3;
          const nodeType = component.nodeType || 'e2-medium';
          const nodePrice = await getGCPComputePrice(nodeType);
          componentCost = nodePrice * 730 * nodes; // Plus cluster management fee
          componentCost += 73; // $73/month cluster management
          
          costDetails.cost = componentCost;
          costDetails.details = {
            nodes,
            nodeType,
            clusterFee: 73,
          };
          costs.compute += componentCost;
          break;

        default:
          // Default cost estimation
          componentCost = component.estimatedCost || 50;
          costs.other += componentCost;
          costDetails.cost = componentCost;
          costDetails.details = {
            note: 'Estimated cost',
          };
      }

      monthlyBreakdown.push(costDetails);
      costs.total += componentCost;
    }

    return {
      monthly: costs,
      annual: {
        compute: costs.compute * 12,
        storage: costs.storage * 12,
        database: costs.database * 12,
        networking: costs.networking * 12,
        serverless: costs.serverless * 12,
        other: costs.other * 12,
        total: costs.total * 12,
      },
      breakdown: monthlyBreakdown,
    };
  };

  const estimateInstanceType = (cpu, memory) => {
    // Map CPU/memory to GCP instance types
    if (cpu <= 1 && memory <= 1) return 'e2-micro';
    if (cpu <= 2 && memory <= 4) return 'e2-small';
    if (cpu <= 2 && memory <= 8) return 'e2-medium';
    if (cpu <= 4 && memory <= 16) return 'e2-standard-2';
    if (cpu <= 8 && memory <= 32) return 'e2-standard-4';
    if (cpu <= 16 && memory <= 64) return 'e2-standard-8';
    return 'n1-standard-4';
  };

  const getGCPComputePrice = async (instanceType) => {
    try {
      const pricing = await CloudPricingAPI.getGCPPrices('computeEngine', 'us-central1');
      return pricing[instanceType]?.onDemand || 0.0475; // Default fallback
    } catch {
      // Fallback pricing
      const fallbackPrices = {
        'e2-micro': 0.0078,
        'e2-small': 0.0156,
        'e2-medium': 0.0312,
        'e2-standard-2': 0.0624,
        'e2-standard-4': 0.1248,
        'n1-standard-4': 0.1900,
      };
      return fallbackPrices[instanceType] || 0.0475;
    }
  };

  const getGCPDatabasePrice = async (sizeGB) => {
    // Cloud SQL pricing estimation
    if (sizeGB <= 10) return 8.57; // db-f1-micro
    if (sizeGB <= 50) return 25.00; // db-g1-small
    if (sizeGB <= 200) return 100.00; // db-n1-standard-1
    return 200.00; // Larger instances
  };

  const getGCPStoragePrice = async (storageClass) => {
    try {
      const pricing = await CloudPricingAPI.getGCPPrices('cloudStorage', 'us-central1');
      return pricing[storageClass] || 0.026;
    } catch {
      const fallbackPrices = {
        'Standard': 0.026,
        'Nearline': 0.010,
        'Coldline': 0.007,
        'Archive': 0.004,
      };
      return fallbackPrices[storageClass] || 0.026;
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-header bg-success text-white">
        <h3 className="mb-0">?? Architecture Diagram Cost Analyzer</h3>
        <small>Upload your architecture diagram to automatically calculate GCP costs</small>
      </div>
      <div className="card-body">
        {/* API Status Indicator */}
        {apiStatus === 'configured' && (
          <div className="alert alert-success mb-4">
            <strong>? Google Cloud Vision API Configured</strong>
            <br />
            <small>Using Vision API for accurate component detection</small>
          </div>
        )}
        {apiStatus === 'not-configured' && (
          <div className="alert alert-info mb-4">
            <strong>? Vision API Not Configured</strong>
            <br />
            <small>
              Using pattern-based detection. For better accuracy, configure Google Cloud Vision API.
              <br />
              See <code>VISION_API_SETUP.md</code> for setup instructions.
            </small>
          </div>
        )}

        {/* Upload Method Selection */}
        <div className="mb-4">
          <label className="form-label fw-bold">Input Method</label>
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${uploadMethod === 'upload' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setUploadMethod('upload')}
            >
              ?? Upload Image
            </button>
            <button
              type="button"
              className={`btn ${uploadMethod === 'url' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setUploadMethod('url')}
            >
              ?? Image URL
            </button>
          </div>
        </div>

        {/* File Upload */}
        {uploadMethod === 'upload' && (
          <div className="mb-4">
            <label className="form-label fw-bold">Upload Architecture Diagram</label>
            <input
              ref={fileInputRef}
              type="file"
              className="form-control"
              accept="image/*,.svg"
              onChange={handleFileUpload}
            />
            <small className="text-muted">
              Supported formats: PNG, JPG, SVG, WebP. Supports diagrams from Draw.io, Lucidchart, AWS Architecture Icons, etc.
            </small>
          </div>
        )}

        {/* URL Input */}
        {uploadMethod === 'url' && (
          <div className="mb-4">
            <label className="form-label fw-bold">Image URL</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="https://example.com/architecture-diagram.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <button className="btn btn-outline-secondary" onClick={handleUrlSubmit}>
                Load
              </button>
            </div>
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-4">
            <label className="form-label fw-bold">Preview</label>
            <div className="border rounded p-3 text-center" style={{ maxHeight: '400px', overflow: 'auto' }}>
              <img
                src={imagePreview}
                alt="Architecture diagram"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* Analyze Button */}
        <div className="d-grid gap-2">
          <button
            className="btn btn-success btn-lg"
            onClick={handleAnalyze}
            disabled={analyzing || (!imageFile && !imageUrl)}
          >
            {analyzing ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Analyzing Architecture...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-calculator me-2" viewBox="0 0 16 16">
                  <path d="M12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8zM4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4z"/>
                  <path d="M4 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-2zm0 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
                </svg>
                Analyze Architecture & Calculate Costs
              </>
            )}
          </button>
        </div>

        {/* Detected Components */}
        {detectedComponents && detectedComponents.length > 0 && (
          <div className="mt-4">
            <h5 className="mb-3">Detected Components ({detectedComponents.length})</h5>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Type</th>
                    <th>GCP Service</th>
                    <th>Quantity</th>
                    <th>Estimated Specs</th>
                  </tr>
                </thead>
                <tbody>
                  {detectedComponents.map((comp, idx) => (
                    <tr key={idx}>
                      <td><strong>{comp.name}</strong></td>
                      <td><span className="badge bg-info">{comp.type}</span></td>
                      <td>{comp.gcpService || 'N/A'}</td>
                      <td>{comp.quantity || 1}</td>
                      <td>
                        {comp.cpu && `CPU: ${comp.cpu} `}
                        {comp.memory && `RAM: ${comp.memory}GB `}
                        {comp.size && `Size: ${comp.size}GB`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cost Breakdown */}
        {costBreakdown && (
          <div className="mt-4">
            <h5 className="mb-3">?? Cost Breakdown</h5>
            
            {/* Monthly Costs */}
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header bg-primary text-white">
                    <h6 className="mb-0">Monthly Costs</h6>
                  </div>
                  <div className="card-body">
                    <ul className="list-unstyled mb-0">
                      <li className="d-flex justify-content-between mb-2">
                        <span>Compute:</span>
                        <strong>${costBreakdown.monthly.compute.toFixed(2)}</strong>
                      </li>
                      <li className="d-flex justify-content-between mb-2">
                        <span>Storage:</span>
                        <strong>${costBreakdown.monthly.storage.toFixed(2)}</strong>
                      </li>
                      <li className="d-flex justify-content-between mb-2">
                        <span>Database:</span>
                        <strong>${costBreakdown.monthly.database.toFixed(2)}</strong>
                      </li>
                      <li className="d-flex justify-content-between mb-2">
                        <span>Networking:</span>
                        <strong>${costBreakdown.monthly.networking.toFixed(2)}</strong>
                      </li>
                      <li className="d-flex justify-content-between mb-2">
                        <span>Serverless:</span>
                        <strong>${costBreakdown.monthly.serverless.toFixed(2)}</strong>
                      </li>
                      <li className="d-flex justify-content-between mb-2">
                        <span>Other:</span>
                        <strong>${costBreakdown.monthly.other.toFixed(2)}</strong>
                      </li>
                      <li className="d-flex justify-content-between mt-3 pt-3 border-top">
                        <span><strong>Total Monthly:</strong></span>
                        <strong className="text-success">${costBreakdown.monthly.total.toFixed(2)}</strong>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header bg-success text-white">
                    <h6 className="mb-0">Annual Costs</h6>
                  </div>
                  <div className="card-body">
                    <ul className="list-unstyled mb-0">
                      <li className="d-flex justify-content-between mb-2">
                        <span>Compute:</span>
                        <strong>${costBreakdown.annual.compute.toFixed(2)}</strong>
                      </li>
                      <li className="d-flex justify-content-between mb-2">
                        <span>Storage:</span>
                        <strong>${costBreakdown.annual.storage.toFixed(2)}</strong>
                      </li>
                      <li className="d-flex justify-content-between mb-2">
                        <span>Database:</span>
                        <strong>${costBreakdown.annual.database.toFixed(2)}</strong>
                      </li>
                      <li className="d-flex justify-content-between mb-2">
                        <span>Networking:</span>
                        <strong>${costBreakdown.annual.networking.toFixed(2)}</strong>
                      </li>
                      <li className="d-flex justify-content-between mb-2">
                        <span>Serverless:</span>
                        <strong>${costBreakdown.annual.serverless.toFixed(2)}</strong>
                      </li>
                      <li className="d-flex justify-content-between mb-2">
                        <span>Other:</span>
                        <strong>${costBreakdown.annual.other.toFixed(2)}</strong>
                      </li>
                      <li className="d-flex justify-content-between mt-3 pt-3 border-top">
                        <span><strong>Total Annual:</strong></span>
                        <strong className="text-success">${costBreakdown.annual.total.toFixed(2)}</strong>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Detailed Cost Breakdown</h6>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Type</th>
                        <th>GCP Service</th>
                        <th>Quantity</th>
                        <th>Monthly Cost</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costBreakdown.breakdown.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.component}</td>
                          <td><span className="badge bg-secondary">{item.type}</span></td>
                          <td>{item.gcpService}</td>
                          <td>{item.quantity}</td>
                          <td><strong>${item.cost.toFixed(2)}</strong></td>
                          <td>
                            <small className="text-muted">
                              {Object.entries(item.details).map(([key, value]) => (
                                <span key={key}>{key}: {value} </span>
                              ))}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArchitectureDiagramAnalyzer;
