/**
 * Improved TCO Calculator
 * Organized by service categories with dropdowns
 */

import React, { useState } from 'react';
import '../styles/improved-tco.css';

const ImprovedTcoCalculator = ({ onCalculate }) => {
  // On-Premise costs with virtualization
  const [onPremise, setOnPremise] = useState({
    // Compute
    physicalServers: 0,
    virtualization: 'vmware', // vmware, hyperv, none
    vmwareLicenses: 0,
    hypervLicenses: 0,
    cpuCosts: 0,

    // Storage
    sanStorage: 0,
    nasStorage: 0,
    dasStorage: 0,
    backupStorage: 0,

    // Network
    switchesRouters: 0,
    firewalls: 0,
    loadBalancers: 0,
    networkCabling: 0,

    // Database
    oracleLicenses: 0,
    msSqlLicenses: 0,
    mysqlPostgres: 0,

    // Other
    datacenterSpace: 0,
    power: 0,
    cooling: 0,
    laborStaff: 0,
    maintenance: 0,
  });

  // AWS costs by category
  const [aws, setAws] = useState({
    // Compute
    ec2Instances: 0,
    lambda: 0,
    ecs: 0,
    eks: 0,

    // Storage
    s3: 0,
    ebs: 0,
    efs: 0,
    glacierBackup: 0,

    // Network
    vpc: 0,
    route53: 0,
    cloudfront: 0,
    directConnect: 0,

    // Database
    rds: 0,
    dynamodb: 0,
    aurora: 0,
    redshift: 0,

    // Other
    cloudwatch: 0,
    iam: 0,
    support: 0,
  });

  // Azure costs by category
  const [azure, setAzure] = useState({
    // Compute
    virtualMachines: 0,
    azureFunctions: 0,
    containerInstances: 0,
    aks: 0,

    // Storage
    blobStorage: 0,
    diskStorage: 0,
    fileStorage: 0,
    archiveStorage: 0,

    // Network
    virtualNetwork: 0,
    azureDns: 0,
    cdn: 0,
    expressRoute: 0,

    // Database
    sqlDatabase: 0,
    cosmosDb: 0,
    mysqlPostgres: 0,
    synapse: 0,

    // Other
    monitoring: 0,
    activeDirect: 0,
    support: 0,
  });

  // GCP costs by category
  const [gcp, setGcp] = useState({
    // Compute
    computeEngine: 0,
    cloudFunctions: 0,
    cloudRun: 0,
    gke: 0,

    // Storage
    cloudStorage: 0,
    persistentDisk: 0,
    filestore: 0,
    archiveStorage: 0,

    // Network
    vpc: 0,
    cloudDns: 0,
    cloudCdn: 0,
    cloudInterconnect: 0,

    // Database
    cloudSql: 0,
    firestore: 0,
    bigtable: 0,
    bigQuery: 0,

    // Other
    cloudMonitoring: 0,
    iam: 0,
    support: 0,
  });

  const [migration, setMigration] = useState({
    assessment: 0,
    tools: 0,
    training: 0,
    consulting: 0,
  });

  const [timeframe, setTimeframe] = useState(36);
  const [expandedCategories, setExpandedCategories] = useState({
    onPremise: { compute: true },
    aws: {},
    azure: {},
    gcp: {},
  });

  const toggleCategory = (provider, category) => {
    setExpandedCategories({
      ...expandedCategories,
      [provider]: {
        ...expandedCategories[provider],
        [category]: !expandedCategories[provider]?.[category],
      },
    });
  };

  const handleChange = (provider, field, value) => {
    const setters = {
      onPremise: setOnPremise,
      aws: setAws,
      azure: setAzure,
      gcp: setGcp,
      migration: setMigration,
    };

    const states = {
      onPremise,
      aws,
      azure,
      gcp,
      migration,
    };

    setters[provider]({
      ...states[provider],
      [field]: parseFloat(value) || 0,
    });
  };

  const calculateTco = () => {
    // Calculate monthly costs
    const monthlyOnPremise = Object.values(onPremise).reduce(
      (sum, cost) => sum + (typeof cost === 'number' ? cost : 0),
      0
    );
    const monthlyAws = Object.values(aws).reduce((sum, cost) => sum + cost, 0);
    const monthlyAzure = Object.values(azure).reduce((sum, cost) => sum + cost, 0);
    const monthlyGcp = Object.values(gcp).reduce((sum, cost) => sum + cost, 0);

    // Calculate TCO over timeframe
    const onPremiseTco = monthlyOnPremise * timeframe;
    const awsTco = monthlyAws * timeframe;
    const azureTco = monthlyAzure * timeframe;
    const gcpTco = monthlyGcp * timeframe;

    const migrationCost = Object.values(migration).reduce((sum, cost) => sum + cost, 0);

    const results = {
      onPremise: onPremiseTco,
      aws: awsTco,
      azure: azureTco,
      gcp: gcpTco,
      migrationCost,
      totalAws: awsTco + migrationCost,
      totalAzure: azureTco + migrationCost,
      totalGcp: gcpTco + migrationCost,
      monthlyOnPremise,
      monthlyAws,
      monthlyAzure,
      monthlyGcp,
      timeframe,
    };

    if (onCalculate) {
      onCalculate(results);
    }

    return results;
  };

  return (
    <div className="improved-tco-calculator">
      <div className="tco-header">
        <h2>Total Cost of Ownership Calculator</h2>
        <p className="text-muted">
          Compare costs across on-premise, AWS, Azure, and Google Cloud
        </p>
      </div>

      <div className="timeframe-selector mb-4">
        <label className="form-label">
          <strong>Analysis Timeframe:</strong>
        </label>
        <select
          className="form-control"
          value={timeframe}
          onChange={(e) => setTimeframe(parseInt(e.target.value))}
        >
          <option value={12}>12 months (1 year)</option>
          <option value={24}>24 months (2 years)</option>
          <option value={36}>36 months (3 years)</option>
          <option value={48}>48 months (4 years)</option>
          <option value={60}>60 months (5 years)</option>
        </select>
      </div>

      <div className="tco-grid">
        {/* On-Premise Section */}
        <ProviderSection
          title="On-Premise Infrastructure"
          icon="🏢"
          provider="onPremise"
          categories={[
            {
              name: 'compute',
              label: 'Compute & Virtualization',
              icon: '💻',
              fields: [
                { key: 'physicalServers', label: 'Physical Servers', prefix: '$' },
                {
                  key: 'virtualization',
                  label: 'Virtualization Platform',
                  type: 'select',
                  options: [
                    { value: 'vmware', label: 'VMware vSphere' },
                    { value: 'hyperv', label: 'Microsoft Hyper-V' },
                    { value: 'none', label: 'No Virtualization' },
                  ]
                },
                ...(onPremise.virtualization === 'vmware' ? [
                  { key: 'vmwareLicenses', label: 'VMware Licenses', prefix: '$' }
                ] : []),
                ...(onPremise.virtualization === 'hyperv' ? [
                  { key: 'hypervLicenses', label: 'Hyper-V Licenses', prefix: '$' }
                ] : []),
                { key: 'cpuCosts', label: 'CPU/Processor Costs', prefix: '$' },
              ],
            },
            {
              name: 'storage',
              label: 'Storage Infrastructure',
              icon: '💾',
              fields: [
                { key: 'sanStorage', label: 'SAN Storage', prefix: '$' },
                { key: 'nasStorage', label: 'NAS Storage', prefix: '$' },
                { key: 'dasStorage', label: 'DAS Storage', prefix: '$' },
                { key: 'backupStorage', label: 'Backup & Archive', prefix: '$' },
              ],
            },
            {
              name: 'network',
              label: 'Networking',
              icon: '🌐',
              fields: [
                { key: 'switchesRouters', label: 'Switches & Routers', prefix: '$' },
                { key: 'firewalls', label: 'Firewalls & Security', prefix: '$' },
                { key: 'loadBalancers', label: 'Load Balancers', prefix: '$' },
                { key: 'networkCabling', label: 'Cabling & Infrastructure', prefix: '$' },
              ],
            },
            {
              name: 'database',
              label: 'Database Licenses',
              icon: '🗄️',
              fields: [
                { key: 'oracleLicenses', label: 'Oracle Licenses', prefix: '$' },
                { key: 'msSqlLicenses', label: 'MS SQL Server Licenses', prefix: '$' },
                { key: 'mysqlPostgres', label: 'MySQL/PostgreSQL', prefix: '$' },
              ],
            },
            {
              name: 'other',
              label: 'Facilities & Operations',
              icon: '⚙️',
              fields: [
                { key: 'datacenterSpace', label: 'Datacenter Space Rental', prefix: '$' },
                { key: 'power', label: 'Power & Electricity', prefix: '$' },
                { key: 'cooling', label: 'Cooling & HVAC', prefix: '$' },
                { key: 'laborStaff', label: 'Labor & Staffing', prefix: '$' },
                { key: 'maintenance', label: 'Maintenance & Support', prefix: '$' },
              ],
            },
          ]}
          state={onPremise}
          expandedCategories={expandedCategories.onPremise}
          onToggle={(cat) => toggleCategory('onPremise', cat)}
          onChange={(field, value) => handleChange('onPremise', field, value)}
        />

        {/* AWS Section */}
        <ProviderSection
          title="Amazon Web Services (AWS)"
          icon="☁️"
          provider="aws"
          categories={[
            {
              name: 'compute',
              label: 'Compute Services',
              icon: '💻',
              fields: [
                { key: 'ec2Instances', label: 'EC2 Instances', prefix: '$' },
                { key: 'lambda', label: 'Lambda Functions', prefix: '$' },
                { key: 'ecs', label: 'ECS Containers', prefix: '$' },
                { key: 'eks', label: 'EKS Kubernetes', prefix: '$' },
              ],
            },
            {
              name: 'storage',
              label: 'Storage Services',
              icon: '💾',
              fields: [
                { key: 's3', label: 'S3 Object Storage', prefix: '$' },
                { key: 'ebs', label: 'EBS Block Storage', prefix: '$' },
                { key: 'efs', label: 'EFS File Storage', prefix: '$' },
                { key: 'glacierBackup', label: 'Glacier Backup & Archive', prefix: '$' },
              ],
            },
            {
              name: 'network',
              label: 'Networking',
              icon: '🌐',
              fields: [
                { key: 'vpc', label: 'VPC & Networking', prefix: '$' },
                { key: 'route53', label: 'Route 53 DNS', prefix: '$' },
                { key: 'cloudfront', label: 'CloudFront CDN', prefix: '$' },
                { key: 'directConnect', label: 'Direct Connect', prefix: '$' },
              ],
            },
            {
              name: 'database',
              label: 'Database Services',
              icon: '🗄️',
              fields: [
                { key: 'rds', label: 'RDS Relational DB', prefix: '$' },
                { key: 'dynamodb', label: 'DynamoDB NoSQL', prefix: '$' },
                { key: 'aurora', label: 'Aurora', prefix: '$' },
                { key: 'redshift', label: 'Redshift Data Warehouse', prefix: '$' },
              ],
            },
            {
              name: 'other',
              label: 'Other Services',
              icon: '⚙️',
              fields: [
                { key: 'cloudwatch', label: 'CloudWatch Monitoring', prefix: '$' },
                { key: 'iam', label: 'IAM & Security', prefix: '$' },
                { key: 'support', label: 'Support Plan', prefix: '$' },
              ],
            },
          ]}
          state={aws}
          expandedCategories={expandedCategories.aws}
          onToggle={(cat) => toggleCategory('aws', cat)}
          onChange={(field, value) => handleChange('aws', field, value)}
        />

        {/* Azure Section */}
        <ProviderSection
          title="Microsoft Azure"
          icon="☁️"
          provider="azure"
          categories={[
            {
              name: 'compute',
              label: 'Compute Services',
              icon: '💻',
              fields: [
                { key: 'virtualMachines', label: 'Virtual Machines', prefix: '$' },
                { key: 'azureFunctions', label: 'Azure Functions', prefix: '$' },
                { key: 'containerInstances', label: 'Container Instances', prefix: '$' },
                { key: 'aks', label: 'AKS Kubernetes', prefix: '$' },
              ],
            },
            {
              name: 'storage',
              label: 'Storage Services',
              icon: '💾',
              fields: [
                { key: 'blobStorage', label: 'Blob Storage', prefix: '$' },
                { key: 'diskStorage', label: 'Disk Storage', prefix: '$' },
                { key: 'fileStorage', label: 'File Storage', prefix: '$' },
                { key: 'archiveStorage', label: 'Archive Storage', prefix: '$' },
              ],
            },
            {
              name: 'network',
              label: 'Networking',
              icon: '🌐',
              fields: [
                { key: 'virtualNetwork', label: 'Virtual Network', prefix: '$' },
                { key: 'azureDns', label: 'Azure DNS', prefix: '$' },
                { key: 'cdn', label: 'Azure CDN', prefix: '$' },
                { key: 'expressRoute', label: 'ExpressRoute', prefix: '$' },
              ],
            },
            {
              name: 'database',
              label: 'Database Services',
              icon: '🗄️',
              fields: [
                { key: 'sqlDatabase', label: 'SQL Database', prefix: '$' },
                { key: 'cosmosDb', label: 'Cosmos DB', prefix: '$' },
                { key: 'mysqlPostgres', label: 'MySQL/PostgreSQL', prefix: '$' },
                { key: 'synapse', label: 'Synapse Analytics', prefix: '$' },
              ],
            },
            {
              name: 'other',
              label: 'Other Services',
              icon: '⚙️',
              fields: [
                { key: 'monitoring', label: 'Azure Monitor', prefix: '$' },
                { key: 'activeDirectory', label: 'Active Directory', prefix: '$' },
                { key: 'support', label: 'Support Plan', prefix: '$' },
              ],
            },
          ]}
          state={azure}
          expandedCategories={expandedCategories.azure}
          onToggle={(cat) => toggleCategory('azure', cat)}
          onChange={(field, value) => handleChange('azure', field, value)}
        />

        {/* GCP Section */}
        <ProviderSection
          title="Google Cloud Platform (GCP)"
          icon="☁️"
          provider="gcp"
          categories={[
            {
              name: 'compute',
              label: 'Compute Services',
              icon: '💻',
              fields: [
                { key: 'computeEngine', label: 'Compute Engine VMs', prefix: '$' },
                { key: 'cloudFunctions', label: 'Cloud Functions', prefix: '$' },
                { key: 'cloudRun', label: 'Cloud Run', prefix: '$' },
                { key: 'gke', label: 'GKE Kubernetes', prefix: '$' },
              ],
            },
            {
              name: 'storage',
              label: 'Storage Services',
              icon: '💾',
              fields: [
                { key: 'cloudStorage', label: 'Cloud Storage', prefix: '$' },
                { key: 'persistentDisk', label: 'Persistent Disk', prefix: '$' },
                { key: 'filestore', label: 'Filestore', prefix: '$' },
                { key: 'archiveStorage', label: 'Archive Storage', prefix: '$' },
              ],
            },
            {
              name: 'network',
              label: 'Networking',
              icon: '🌐',
              fields: [
                { key: 'vpc', label: 'VPC Networking', prefix: '$' },
                { key: 'cloudDns', label: 'Cloud DNS', prefix: '$' },
                { key: 'cloudCdn', label: 'Cloud CDN', prefix: '$' },
                { key: 'cloudInterconnect', label: 'Cloud Interconnect', prefix: '$' },
              ],
            },
            {
              name: 'database',
              label: 'Database Services',
              icon: '🗄️',
              fields: [
                { key: 'cloudSql', label: 'Cloud SQL', prefix: '$' },
                { key: 'firestore', label: 'Firestore', prefix: '$' },
                { key: 'bigtable', label: 'Bigtable', prefix: '$' },
                { key: 'bigQuery', label: 'BigQuery', prefix: '$' },
              ],
            },
            {
              name: 'other',
              label: 'Other Services',
              icon: '⚙️',
              fields: [
                { key: 'cloudMonitoring', label: 'Cloud Monitoring', prefix: '$' },
                { key: 'iam', label: 'IAM & Security', prefix: '$' },
                { key: 'support', label: 'Support Plan', prefix: '$' },
              ],
            },
          ]}
          state={gcp}
          expandedCategories={expandedCategories.gcp}
          onToggle={(cat) => toggleCategory('gcp', cat)}
          onChange={(field, value) => handleChange('gcp', field, value)}
        />
      </div>

      {/* Migration Costs */}
      <div className="card mt-4">
        <div className="card-header">
          <h5>💼 Migration Costs (One-Time)</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <label className="form-label">Assessment & Planning</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={migration.assessment}
                  onChange={(e) => handleChange('migration', 'assessment', e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label">Migration Tools</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={migration.tools}
                  onChange={(e) => handleChange('migration', 'tools', e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label">Training</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={migration.training}
                  onChange={(e) => handleChange('migration', 'training', e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label">Consulting Services</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={migration.consulting}
                  onChange={(e) => handleChange('migration', 'consulting', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <div className="text-center mt-4">
        <button className="btn btn-primary btn-lg" onClick={calculateTco}>
          📊 Calculate TCO
        </button>
      </div>
    </div>
  );
};

// Provider Section Component
const ProviderSection = ({
  title,
  icon,
  provider,
  categories,
  state,
  expandedCategories,
  onToggle,
  onChange
}) => {
  return (
    <div className="provider-section card">
      <div className="card-header provider-header">
        <h4>
          <span className="provider-icon">{icon}</span>
          {title}
        </h4>
      </div>
      <div className="card-body">
        {categories.map((category) => (
          <CategorySection
            key={category.name}
            category={category}
            isExpanded={expandedCategories[category.name]}
            onToggle={() => onToggle(category.name)}
            state={state}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
};

// Category Section Component
const CategorySection = ({ category, isExpanded, onToggle, state, onChange }) => {
  return (
    <div className="category-section mb-3">
      <button
        className="category-toggle btn btn-outline-primary w-100 text-start"
        onClick={onToggle}
      >
        <span className="category-icon">{category.icon}</span>
        <span className="category-label">{category.label}</span>
        <span className="toggle-arrow float-end">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className="category-fields mt-2">
          {category.fields.map((field) => (
            <div key={field.key} className="mb-2">
              <label className="form-label small">{field.label}</label>
              {field.type === 'select' ? (
                <select
                  className="form-control form-control-sm"
                  value={state[field.key]}
                  onChange={(e) => onChange(field.key, e.target.value)}
                >
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="input-group input-group-sm">
                  {field.prefix && (
                    <span className="input-group-text">{field.prefix}</span>
                  )}
                  <input
                    type="number"
                    className="form-control"
                    value={state[field.key]}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImprovedTcoCalculator;
