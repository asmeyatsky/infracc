import React, { useState } from 'react';

function LandingZoneBuilder({ onConfigComplete }) {
  const [config, setConfig] = useState({
    // Organization & Project Structure
    organizationId: '',
    billingAccountId: '',
    projects: [
      { name: 'prod', displayName: 'Production', environment: 'production' },
      { name: 'dev', displayName: 'Development', environment: 'development' },
    ],
    folders: ['infrastructure', 'applications', 'data'],

    // Network Configuration
    networkConfig: {
      vpcName: 'main-vpc',
      region: 'us-central1',
      subnets: [
        { name: 'web-subnet', cidr: '10.0.1.0/24', region: 'us-central1' },
        { name: 'app-subnet', cidr: '10.0.2.0/24', region: 'us-central1' },
        { name: 'db-subnet', cidr: '10.0.3.0/24', region: 'us-central1' },
      ],
      enableCloudNAT: true,
      enableCloudRouter: true,
      enablePrivateGoogleAccess: true,
    },

    // Security & IAM
    securityConfig: {
      enableOrgPolicies: true,
      enableVPCServiceControls: false,
      enableCloudArmor: false,
      requireSSL: true,
      enableDLP: false,
    },

    // Compute Resources
    computeConfig: {
      enableGKE: true,
      gkeVersion: 'latest',
      gkeNodePools: 1,
      gkeNodesPerPool: 3,
      enableComputeEngine: true,
      defaultMachineType: 'n2-standard-4',
    },

    // Storage & Database
    storageConfig: {
      enableCloudStorage: true,
      storageBuckets: ['artifacts', 'data', 'backups'],
      enableCloudSQL: true,
      sqlVersion: 'POSTGRES_14',
      enableFirestore: false,
    },

    // Monitoring & Logging
    observabilityConfig: {
      enableCloudMonitoring: true,
      enableCloudLogging: true,
      logRetentionDays: 30,
      enableCloudTrace: true,
      enableCloudProfiler: false,
    },
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  const handleInputChange = (section, field, value) => {
    setConfig({
      ...config,
      [section]: {
        ...config[section],
        [field]: value,
      },
    });
  };

  const handleArrayRemove = (field, index) => {
    setConfig({
      ...config,
      [field]: config[field].filter((_, i) => i !== index),
    });
  };

  const handleGenerate = () => {
    if (onConfigComplete) {
      onConfigComplete(config);
    }
  };

  const regions = [
    'us-central1', 'us-east1', 'us-west1', 'us-west2',
    'europe-west1', 'europe-west2', 'asia-southeast1', 'asia-east1'
  ];

  const machineTypes = [
    'e2-small', 'e2-medium', 'e2-standard-2', 'e2-standard-4',
    'n2-standard-2', 'n2-standard-4', 'n2-standard-8', 'n2-highmem-4'
  ];

  return (
    <div className="card mb-4">
      <div className="card-header bg-info text-white">
        <h3 className="mb-0">🏗️ Landing Zone Builder</h3>
        <small>Configure your GCP infrastructure and generate Terraform templates</small>
      </div>
      <div className="card-body">
        {/* Progress Indicator */}
        <div className="mb-4">
          <div className="d-flex justify-content-between mb-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`flex-fill text-center ${step === currentStep ? 'fw-bold' : ''}`}
              >
                <div
                  className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-1 ${
                    step === currentStep ? 'bg-info text-white' : step < currentStep ? 'bg-success text-white' : 'bg-light'
                  }`}
                  style={{ width: '40px', height: '40px' }}
                >
                  {step < currentStep ? '✓' : step}
                </div>
                <div className="small">
                  {step === 1 && 'Organization'}
                  {step === 2 && 'Network'}
                  {step === 3 && 'Security'}
                  {step === 4 && 'Resources'}
                  {step === 5 && 'Review'}
                </div>
              </div>
            ))}
          </div>
          <div className="progress" style={{ height: '4px' }}>
            <div
              className="progress-bar bg-info"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step 1: Organization & Projects */}
        {currentStep === 1 && (
          <div>
            <h5 className="mb-3">📊 Organization & Project Structure</h5>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Organization ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={config.organizationId}
                  onChange={(e) => setConfig({ ...config, organizationId: e.target.value })}
                  placeholder="123456789012"
                />
                <small className="text-muted">Your GCP Organization ID</small>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Billing Account ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={config.billingAccountId}
                  onChange={(e) => setConfig({ ...config, billingAccountId: e.target.value })}
                  placeholder="ABCDEF-123456-ABCDEF"
                />
                <small className="text-muted">GCP Billing Account to use</small>
              </div>
            </div>

            <h6 className="mt-4 mb-3">Projects</h6>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Project ID</th>
                    <th>Display Name</th>
                    <th>Environment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {config.projects.map((project, index) => (
                    <tr key={index}>
                      <td>{project.name}</td>
                      <td>{project.displayName}</td>
                      <td>
                        <span className={`badge ${project.environment === 'production' ? 'bg-danger' : 'bg-warning'}`}>
                          {project.environment}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleArrayRemove('projects', index)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h6 className="mt-4 mb-3">Folder Structure</h6>
            <div className="d-flex flex-wrap gap-2">
              {config.folders.map((folder, index) => (
                <span key={index} className="badge bg-secondary fs-6">
                  📁 {folder}
                  <button
                    className="btn-close btn-close-white ms-2"
                    style={{ fontSize: '0.6rem' }}
                    onClick={() => handleArrayRemove('folders', index)}
                  ></button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Network Configuration */}
        {currentStep === 2 && (
          <div>
            <h5 className="mb-3">🌐 Network Architecture</h5>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">VPC Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={config.networkConfig.vpcName}
                  onChange={(e) => handleInputChange('networkConfig', 'vpcName', e.target.value)}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Primary Region</label>
                <select
                  className="form-select"
                  value={config.networkConfig.region}
                  onChange={(e) => handleInputChange('networkConfig', 'region', e.target.value)}
                >
                  {regions.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
            </div>

            <h6 className="mt-4 mb-3">Subnets</h6>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Subnet Name</th>
                    <th>CIDR Range</th>
                    <th>Region</th>
                  </tr>
                </thead>
                <tbody>
                  {config.networkConfig.subnets.map((subnet, index) => (
                    <tr key={index}>
                      <td>{subnet.name}</td>
                      <td><code>{subnet.cidr}</code></td>
                      <td>{subnet.region}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h6 className="mt-4 mb-3">Network Features</h6>
            <div className="row">
              <div className="col-md-4 mb-2">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={config.networkConfig.enableCloudNAT}
                    onChange={(e) => handleInputChange('networkConfig', 'enableCloudNAT', e.target.checked)}
                  />
                  <label className="form-check-label">Enable Cloud NAT</label>
                </div>
              </div>
              <div className="col-md-4 mb-2">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={config.networkConfig.enableCloudRouter}
                    onChange={(e) => handleInputChange('networkConfig', 'enableCloudRouter', e.target.checked)}
                  />
                  <label className="form-check-label">Enable Cloud Router</label>
                </div>
              </div>
              <div className="col-md-4 mb-2">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={config.networkConfig.enablePrivateGoogleAccess}
                    onChange={(e) => handleInputChange('networkConfig', 'enablePrivateGoogleAccess', e.target.checked)}
                  />
                  <label className="form-check-label">Private Google Access</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Security Configuration */}
        {currentStep === 3 && (
          <div>
            <h5 className="mb-3">🔒 Security & IAM Configuration</h5>
            <div className="alert alert-info">
              <strong>Security Best Practices:</strong> These settings help you implement Google Cloud security foundations.
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <div className="card">
                  <div className="card-body">
                    <div className="form-check mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={config.securityConfig.enableOrgPolicies}
                        onChange={(e) => handleInputChange('securityConfig', 'enableOrgPolicies', e.target.checked)}
                      />
                      <label className="form-check-label fw-bold">Organization Policies</label>
                      <p className="small text-muted mb-0">Enforce constraints across your organization</p>
                    </div>
                    <div className="form-check mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={config.securityConfig.enableVPCServiceControls}
                        onChange={(e) => handleInputChange('securityConfig', 'enableVPCServiceControls', e.target.checked)}
                      />
                      <label className="form-check-label fw-bold">VPC Service Controls</label>
                      <p className="small text-muted mb-0">Create security perimeters around resources</p>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={config.securityConfig.enableCloudArmor}
                        onChange={(e) => handleInputChange('securityConfig', 'enableCloudArmor', e.target.checked)}
                      />
                      <label className="form-check-label fw-bold">Cloud Armor</label>
                      <p className="small text-muted mb-0">DDoS protection and WAF</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="card">
                  <div className="card-body">
                    <div className="form-check mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={config.securityConfig.requireSSL}
                        onChange={(e) => handleInputChange('securityConfig', 'requireSSL', e.target.checked)}
                      />
                      <label className="form-check-label fw-bold">Require SSL/TLS</label>
                      <p className="small text-muted mb-0">Enforce encrypted connections</p>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={config.securityConfig.enableDLP}
                        onChange={(e) => handleInputChange('securityConfig', 'enableDLP', e.target.checked)}
                      />
                      <label className="form-check-label fw-bold">Data Loss Prevention (DLP)</label>
                      <p className="small text-muted mb-0">Discover and protect sensitive data</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Compute & Storage Resources */}
        {currentStep === 4 && (
          <div>
            <h5 className="mb-3">💻 Compute & Storage Resources</h5>

            <h6 className="mb-3">Kubernetes (GKE)</h6>
            <div className="row mb-4">
              <div className="col-md-3 mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={config.computeConfig.enableGKE}
                    onChange={(e) => handleInputChange('computeConfig', 'enableGKE', e.target.checked)}
                  />
                  <label className="form-check-label">Enable GKE</label>
                </div>
              </div>
              {config.computeConfig.enableGKE && (
                <>
                  <div className="col-md-3 mb-3">
                    <label className="form-label small">GKE Version</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={config.computeConfig.gkeVersion}
                      onChange={(e) => handleInputChange('computeConfig', 'gkeVersion', e.target.value)}
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label small">Node Pools</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={config.computeConfig.gkeNodePools}
                      onChange={(e) => handleInputChange('computeConfig', 'gkeNodePools', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label small">Nodes per Pool</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={config.computeConfig.gkeNodesPerPool}
                      onChange={(e) => handleInputChange('computeConfig', 'gkeNodesPerPool', parseInt(e.target.value))}
                    />
                  </div>
                </>
              )}
            </div>

            <h6 className="mb-3">Compute Engine</h6>
            <div className="row mb-4">
              <div className="col-md-4 mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={config.computeConfig.enableComputeEngine}
                    onChange={(e) => handleInputChange('computeConfig', 'enableComputeEngine', e.target.checked)}
                  />
                  <label className="form-check-label">Enable Compute Engine</label>
                </div>
              </div>
              {config.computeConfig.enableComputeEngine && (
                <div className="col-md-8 mb-3">
                  <label className="form-label small">Default Machine Type</label>
                  <select
                    className="form-select form-select-sm"
                    value={config.computeConfig.defaultMachineType}
                    onChange={(e) => handleInputChange('computeConfig', 'defaultMachineType', e.target.value)}
                  >
                    {machineTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <h6 className="mb-3">Storage & Databases</h6>
            <div className="row">
              <div className="col-md-4 mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={config.storageConfig.enableCloudStorage}
                    onChange={(e) => handleInputChange('storageConfig', 'enableCloudStorage', e.target.checked)}
                  />
                  <label className="form-check-label">Cloud Storage</label>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={config.storageConfig.enableCloudSQL}
                    onChange={(e) => handleInputChange('storageConfig', 'enableCloudSQL', e.target.checked)}
                  />
                  <label className="form-check-label">Cloud SQL</label>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={config.storageConfig.enableFirestore}
                    onChange={(e) => handleInputChange('storageConfig', 'enableFirestore', e.target.checked)}
                  />
                  <label className="form-check-label">Firestore</label>
                </div>
              </div>
            </div>

            {config.storageConfig.enableCloudStorage && (
              <div className="mt-3">
                <label className="form-label small">Storage Buckets</label>
                <div className="d-flex flex-wrap gap-2">
                  {config.storageConfig.storageBuckets.map((bucket, index) => (
                    <span key={index} className="badge bg-info fs-6">
                      🪣 {bucket}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review & Generate */}
        {currentStep === 5 && (
          <div>
            <h5 className="mb-3">📋 Review Configuration</h5>
            <div className="alert alert-success">
              <strong>Ready to generate!</strong> Review your configuration below and generate Terraform templates.
            </div>

            <div className="accordion" id="reviewAccordion">
              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOrg">
                    Organization & Projects
                  </button>
                </h2>
                <div id="collapseOrg" className="accordion-collapse collapse show" data-bs-parent="#reviewAccordion">
                  <div className="accordion-body">
                    <p><strong>Organization ID:</strong> {config.organizationId || 'Not set'}</p>
                    <p><strong>Billing Account:</strong> {config.billingAccountId || 'Not set'}</p>
                    <p><strong>Projects:</strong> {config.projects.length}</p>
                    <p><strong>Folders:</strong> {config.folders.join(', ')}</p>
                  </div>
                </div>
              </div>

              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseNetwork">
                    Network Configuration
                  </button>
                </h2>
                <div id="collapseNetwork" className="accordion-collapse collapse" data-bs-parent="#reviewAccordion">
                  <div className="accordion-body">
                    <p><strong>VPC:</strong> {config.networkConfig.vpcName}</p>
                    <p><strong>Region:</strong> {config.networkConfig.region}</p>
                    <p><strong>Subnets:</strong> {config.networkConfig.subnets.length}</p>
                    <p><strong>Features:</strong> Cloud NAT: {config.networkConfig.enableCloudNAT ? '✓' : '✗'},
                       Private Access: {config.networkConfig.enablePrivateGoogleAccess ? '✓' : '✗'}</p>
                  </div>
                </div>
              </div>

              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseSecurity">
                    Security & IAM
                  </button>
                </h2>
                <div id="collapseSecurity" className="accordion-collapse collapse" data-bs-parent="#reviewAccordion">
                  <div className="accordion-body">
                    <p><strong>Org Policies:</strong> {config.securityConfig.enableOrgPolicies ? '✓ Enabled' : '✗ Disabled'}</p>
                    <p><strong>VPC Service Controls:</strong> {config.securityConfig.enableVPCServiceControls ? '✓ Enabled' : '✗ Disabled'}</p>
                    <p><strong>Cloud Armor:</strong> {config.securityConfig.enableCloudArmor ? '✓ Enabled' : '✗ Disabled'}</p>
                    <p><strong>SSL Required:</strong> {config.securityConfig.requireSSL ? '✓ Yes' : '✗ No'}</p>
                  </div>
                </div>
              </div>

              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseResources">
                    Compute & Storage
                  </button>
                </h2>
                <div id="collapseResources" className="accordion-collapse collapse" data-bs-parent="#reviewAccordion">
                  <div className="accordion-body">
                    <p><strong>GKE:</strong> {config.computeConfig.enableGKE ? `✓ Enabled (${config.computeConfig.gkeNodePools} pools)` : '✗ Disabled'}</p>
                    <p><strong>Compute Engine:</strong> {config.computeConfig.enableComputeEngine ? `✓ Enabled (${config.computeConfig.defaultMachineType})` : '✗ Disabled'}</p>
                    <p><strong>Cloud Storage:</strong> {config.storageConfig.enableCloudStorage ? `✓ Enabled (${config.storageConfig.storageBuckets.length} buckets)` : '✗ Disabled'}</p>
                    <p><strong>Cloud SQL:</strong> {config.storageConfig.enableCloudSQL ? '✓ Enabled' : '✗ Disabled'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="d-flex justify-content-between mt-4">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            ← Previous
          </button>

          {currentStep < totalSteps ? (
            <button
              className="btn btn-info text-white"
              onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={handleGenerate}
            >
              Generate Terraform Templates →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LandingZoneBuilder;
