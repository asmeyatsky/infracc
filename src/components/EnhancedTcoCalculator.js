/**
 * Enhanced TCO Calculator with Advanced Analytics
 * Features real-time pricing, risk analysis, and predictive insights
 */

import React, { useState, useEffect } from 'react';
import CloudPricingAPI from '../utils/cloudPricingAPI';
import AdvancedAnalytics from '../utils/advancedAnalytics';
import {
  TcoComparisonChart,
  BreakEvenChart,
  RiskRadarChart,
  SensitivityChart,
  CostBreakdownChart,
  ForecastingChart,
  CarbonFootprintChart
} from './EnhancedVisualizations';
import '../styles/enhanced-tco-calculator.css';

const EnhancedTcoCalculator = ({ onCalculate, workloads = [] }) => {
  // State for all inputs
  const [currentInputs, setCurrentInputs] = useState({
    onPremise: {
      hardware: 0,
      software: 0,
      maintenance: 0,
      labor: 0,
      power: 0,
      cooling: 0,
      datacenter: 0,
    },
    cloudSelection: {
      aws: {
        ec2Instances: 0,
        s3: 0,
        rds: 0,
        vpc: 0,
        cloudwatch: 0,
        dataTransferGB: 0
      },
      azure: {
        virtualMachines: 0,
        blobStorage: 0,
        sqlDatabase: 0,
        networking: 0,
        monitoring: 0,
        dataTransferGB: 0
      },
      gcp: {
        compute: 0,
        storage: 0,
        networking: 0,
        database: 0,
        monitoring: 0,
        dataTransferGB: 0
      }
    },
    migration: {
      assessment: 0,
      tools: 0,
      training: 0,
      consulting: 0
    },
    timeframe: 36,
    reservedInstanceTerm: 'none',
    savingsPlanTerm: 'none',
    region: 'us-east-1',
    includeDataTransfer: true,
    hybridConnectivity: false,
    complianceFactor: 1.0,
    performanceMultiplier: 1.0,
    workloadCharacteristics: {
      cpuIntensive: false,
      memoryIntensive: false,
      storageIntensive: false,
      longTerm: false,
      size: 'medium'
    },
    riskFactors: {
      downtimeRisk: 0,
      dataLossRisk: 0,
      securityRisk: 0,
      complianceRisk: 0,
      lockInRisk: 0
    }
  });

  const [results, setResults] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('calculator');
  const [loading, setLoading] = useState(false);

  // Process workloads when they are passed in
  useEffect(() => {
    if (workloads && workloads.length > 0) {
      const onPremiseCosts = {
        hardware: 0,
        software: 0,
        maintenance: 0,
        labor: 0,
        power: 0,
        cooling: 0,
        datacenter: 0,
      };

      workloads.forEach(w => {
        // A simple mapping, this could be more sophisticated
        onPremiseCosts.hardware += (w.monthlyCost || 0) * 0.4; // Example distribution
        onPremiseCosts.software += (w.monthlyCost || 0) * 0.2;
        onPremiseCosts.labor += (w.monthlyCost || 0) * 0.3;
        onPremiseCosts.power += (w.monthlyCost || 0) * 0.1;
      });

      setCurrentInputs(prev => ({
        ...prev,
        onPremise: onPremiseCosts
      }));
    }
  }, [workloads]);


  // Calculate TCO when inputs change
  useEffect(() => {
    performCalculation();
  }, [currentInputs]);

  const performCalculation = async () => {
    setLoading(true);
    
    try {
      // Calculate base TCO
      const tcoResults = CloudPricingAPI.calculateEnhancedTCO({
        ...currentInputs,
        cloudSelection: currentInputs.cloudSelection
      });
      
      // Generate analytics
      const analyticsResults = {
        summary: AdvancedAnalytics.generateExecutiveSummary(currentInputs, tcoResults),
        riskAdjusted: AdvancedAnalytics.riskAdjustedTCO(currentInputs, currentInputs.riskFactors),
        sensitivity: {
          onPremise: AdvancedAnalytics.sensitivityAnalysis(currentInputs, 'onPremiseCosts'),
          cloud: AdvancedAnalytics.sensitivityAnalysis(currentInputs, 'cloudCosts'),
          migration: AdvancedAnalytics.sensitivityAnalysis(currentInputs, 'migrationCosts')
        },
        forecast: AdvancedAnalytics.predictCostTrends(currentInputs),
        footprint: AdvancedAnalytics.calculateCarbonFootprint(currentInputs),
        breakdown: AdvancedAnalytics.generateCostBreakdown(currentInputs)
      };

      setResults(tcoResults);
      setAnalytics(analyticsResults);

      // Pass results to parent component
      if (onCalculate) {
        onCalculate(tcoResults);
      }
    } catch (error) {
      console.error('Error calculating TCO:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (category, field, value) => {
    setCurrentInputs(prev => {
      const newInputs = { ...prev };
      
      if (category === 'onPremise') {
        newInputs.onPremise = { ...newInputs.onPremise, [field]: parseFloat(value) || 0 };
      } else if (category === 'cloudSelection') {
        const [provider, service] = field.split('.');
        newInputs.cloudSelection[provider] = {
          ...newInputs.cloudSelection[provider],
          [service]: parseFloat(value) || 0
        };
      } else if (category === 'migration') {
        newInputs.migration = { ...newInputs.migration, [field]: parseFloat(value) || 0 };
      } else if (category === 'options') {
        newInputs[field] = value;
      } else if (category === 'workloadCharacteristics') {
        newInputs.workloadCharacteristics = {
          ...newInputs.workloadCharacteristics,
          [field]: typeof value === 'boolean' ? value : value
        };
      } else if (category === 'riskFactors') {
        newInputs.riskFactors = {
          ...newInputs.riskFactors,
          [field]: parseFloat(value) || 0
        };
      } else {
        newInputs[field] = parseFloat(value) || value;
      }
      
      return newInputs;
    });
  };

  const renderCalculatorInputs = () => (
    <div className="enhanced-tco-inputs">
      {/* Timeframe and Options */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5>Analysis Options</h5>
              <div className="mb-3">
                <label className="form-label">Analysis Timeframe (months)</label>
                <input
                  type="range"
                  className="form-range"
                  min="12"
                  max="60"
                  step="12"
                  value={currentInputs.timeframe}
                  onChange={(e) => handleInputChange('timeframe', null, parseInt(e.target.value))}
                />
                <div className="text-center">
                  <span className="badge bg-primary fs-6">{currentInputs.timeframe} months ({(currentInputs.timeframe / 12).toFixed(1)} years)</span>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Region</label>
                <select
                  className="form-control"
                  value={currentInputs.region}
                  onChange={(e) => handleInputChange('region', null, e.target.value)}
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">EU (Ireland)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  <option value="us-central1">GCP US Central</option>
                  <option value="europe-west1">GCP EU West</option>
                </select>
              </div>
              
              <div className="form-check mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={currentInputs.includeDataTransfer}
                  onChange={(e) => handleInputChange('options', 'includeDataTransfer', e.target.checked)}
                  id="includeDataTransfer"
                />
                <label className="form-check-label" htmlFor="includeDataTransfer">
                  Include Data Transfer Costs
                </label>
              </div>
              
              <div className="form-check mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={currentInputs.hybridConnectivity}
                  onChange={(e) => handleInputChange('options', 'hybridConnectivity', e.target.checked)}
                  id="hybridConnectivity"
                />
                <label className="form-check-label" htmlFor="hybridConnectivity">
                  Hybrid Connectivity Required
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5>Discount & Commitment Options</h5>
              <div className="mb-3">
                <label className="form-label">Reserved Instance Term</label>
                <select
                  className="form-control"
                  value={currentInputs.reservedInstanceTerm}
                  onChange={(e) => handleInputChange('options', 'reservedInstanceTerm', e.target.value)}
                >
                  <option value="none">No Commitment</option>
                  <option value="1year">1 Year (30-35% savings)</option>
                  <option value="3year">3 Year (50-60% savings)</option>
                </select>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Savings Plan Term</label>
                <select
                  className="form-control"
                  value={currentInputs.savingsPlanTerm}
                  onChange={(e) => handleInputChange('options', 'savingsPlanTerm', e.target.value)}
                >
                  <option value="none">No Commitment</option>
                  <option value="1year">1 Year (30-35% savings)</option>
                  <option value="3year">3 Year (50-60% savings)</option>
                </select>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Compliance Factor</label>
                <input
                  type="range"
                  className="form-range"
                  min="1.0"
                  max="1.5"
                  step="0.05"
                  value={currentInputs.complianceFactor}
                  onChange={(e) => handleInputChange('options', 'complianceFactor', parseFloat(e.target.value))}
                />
                <div className="text-center">
                  <span className="badge bg-info fs-6">+{((currentInputs.complianceFactor - 1) * 100).toFixed(0)}% for Compliance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workload Characteristics */}
      <div className="card mb-4">
        <div className="card-header">
          <h5>Workload Characteristics</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <div className="form-check mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={currentInputs.workloadCharacteristics.cpuIntensive}
                  onChange={(e) => handleInputChange('workloadCharacteristics', 'cpuIntensive', e.target.checked)}
                  id="cpuIntensive"
                />
                <label className="form-check-label" htmlFor="cpuIntensive">
                  CPU Intensive Workload
                </label>
              </div>
              
              <div className="form-check mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={currentInputs.workloadCharacteristics.memoryIntensive}
                  onChange={(e) => handleInputChange('workloadCharacteristics', 'memoryIntensive', e.target.checked)}
                  id="memoryIntensive"
                />
                <label className="form-check-label" htmlFor="memoryIntensive">
                  Memory Intensive Workload
                </label>
              </div>
              
              <div className="form-check mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={currentInputs.workloadCharacteristics.storageIntensive}
                  onChange={(e) => handleInputChange('workloadCharacteristics', 'storageIntensive', e.target.checked)}
                  id="storageIntensive"
                />
                <label className="form-check-label" htmlFor="storageIntensive">
                  Storage Intensive Workload
                </label>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="form-check mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={currentInputs.workloadCharacteristics.longTerm}
                  onChange={(e) => handleInputChange('workloadCharacteristics', 'longTerm', e.target.checked)}
                  id="longTerm"
                />
                <label className="form-check-label" htmlFor="longTerm">
                  Long-term Workload (3+ years)
                </label>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Workload Size</label>
                <select
                  className="form-control"
                  value={currentInputs.workloadCharacteristics.size}
                  onChange={(e) => handleInputChange('workloadCharacteristics', 'size', e.target.value)}
                >
                  <option value="small">Small (Up to 10 servers)</option>
                  <option value="medium">Medium (10-50 servers)</option>
                  <option value="large">Large (50+ servers)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="card mb-4">
        <div className="card-header">
          <h5>Risk Assessment</h5>
        </div>
        <div className="card-body">
          <p class="text-muted">Rate risks from 0-100 (higher number = higher risk)</p>
          <div className="row">
            <div className="col-md-6 col-lg-3 mb-3">
              <label className="form-label">Downtime Risk</label>
              <input
                type="range"
                className="form-range"
                min="0"
                max="100"
                value={currentInputs.riskFactors.downtimeRisk}
                onChange={(e) => handleInputChange('riskFactors', 'downtimeRisk', parseInt(e.target.value))}
              />
              <div className="text-center">{currentInputs.riskFactors.downtimeRisk}%</div>
            </div>
            
            <div className="col-md-6 col-lg-3 mb-3">
              <label className="form-label">Data Loss Risk</label>
              <input
                type="range"
                className="form-range"
                min="0"
                max="100"
                value={currentInputs.riskFactors.dataLossRisk}
                onChange={(e) => handleInputChange('riskFactors', 'dataLossRisk', parseInt(e.target.value))}
              />
              <div className="text-center">{currentInputs.riskFactors.dataLossRisk}%</div>
            </div>
            
            <div className="col-md-6 col-lg-3 mb-3">
              <label className="form-label">Security Risk</label>
              <input
                type="range"
                className="form-range"
                min="0"
                max="100"
                value={currentInputs.riskFactors.securityRisk}
                onChange={(e) => handleInputChange('riskFactors', 'securityRisk', parseInt(e.target.value))}
              />
              <div className="text-center">{currentInputs.riskFactors.securityRisk}%</div>
            </div>
            
            <div className="col-md-6 col-lg-3 mb-3">
              <label className="form-label">Compliance Risk</label>
              <input
                type="range"
                className="form-range"
                min="0"
                max="100"
                value={currentInputs.riskFactors.complianceRisk}
                onChange={(e) => handleInputChange('riskFactors', 'complianceRisk', parseInt(e.target.value))}
              />
              <div className="text-center">{currentInputs.riskFactors.complianceRisk}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Grid */}
      <div className="tco-input-grid">
        {/* On-Premise */}
        <div className="input-provider-card">
          <div className="provider-header bg-danger text-white">
            <h4>🏢 On-Premise Infrastructure</h4>
            <small>Monthly costs</small>
          </div>
          <div className="provider-body">
            <div className="mb-3">
              <label className="form-label">Hardware (servers, storage)</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.onPremise.hardware}
                  onChange={(e) => handleInputChange('onPremise', 'hardware', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Software Licenses</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.onPremise.software}
                  onChange={(e) => handleInputChange('onPremise', 'software', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Maintenance & Support</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.onPremise.maintenance}
                  onChange={(e) => handleInputChange('onPremise', 'maintenance', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">IT Labor & Operations</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.onPremise.labor}
                  onChange={(e) => handleInputChange('onPremise', 'labor', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Power & Electricity</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.onPremise.power}
                  onChange={(e) => handleInputChange('onPremise', 'power', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Cooling & HVAC</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.onPremise.cooling}
                  onChange={(e) => handleInputChange('onPremise', 'cooling', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Data Center / Facilities</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.onPremise.datacenter}
                  onChange={(e) => handleInputChange('onPremise', 'datacenter', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* AWS */}
        <div className="input-provider-card">
          <div className="provider-header" style={{backgroundColor: '#FF9900', color: 'white'}}>
            <h4>☁️ Amazon Web Services</h4>
            <small>Estimated monthly costs</small>
          </div>
          <div className="provider-body">
            <div className="mb-3">
              <label className="form-label">EC2 / ECS / EKS</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.aws.ec2Instances}
                  onChange={(e) => handleInputChange('cloudSelection', 'aws.ec2Instances', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">S3 Storage (GB/month)</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.aws.s3}
                  onChange={(e) => handleInputChange('cloudSelection', 'aws.s3', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">RDS / DynamoDB</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.aws.rds}
                  onChange={(e) => handleInputChange('cloudSelection', 'aws.rds', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">VPC / Load Balancing</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.aws.vpc}
                  onChange={(e) => handleInputChange('cloudSelection', 'aws.vpc', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">CloudWatch / X-Ray</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.aws.cloudwatch}
                  onChange={(e) => handleInputChange('cloudSelection', 'aws.cloudwatch', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Data Transfer (GB/month)</label>
              <div className="input-group">
                <span className="input-group-text">GB</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.aws.dataTransferGB}
                  onChange={(e) => handleInputChange('cloudSelection', 'aws.dataTransferGB', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Azure */}
        <div className="input-provider-card">
          <div className="provider-header" style={{backgroundColor: '#0078D4', color: 'white'}}>
            <h4>☁️ Microsoft Azure</h4>
            <small>Estimated monthly costs</small>
          </div>
          <div className="provider-body">
            <div className="mb-3">
              <label className="form-label">Virtual Machines / AKS</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.azure.virtualMachines}
                  onChange={(e) => handleInputChange('cloudSelection', 'azure.virtualMachines', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Blob Storage (GB/month)</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.azure.blobStorage}
                  onChange={(e) => handleInputChange('cloudSelection', 'azure.blobStorage', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">SQL Database / Cosmos DB</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.azure.sqlDatabase}
                  onChange={(e) => handleInputChange('cloudSelection', 'azure.sqlDatabase', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Virtual Network / Load Balancer</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.azure.networking}
                  onChange={(e) => handleInputChange('cloudSelection', 'azure.networking', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Azure Monitor</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.azure.monitoring}
                  onChange={(e) => handleInputChange('cloudSelection', 'azure.monitoring', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Data Transfer (GB/month)</label>
              <div className="input-group">
                <span className="input-group-text">GB</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.azure.dataTransferGB}
                  onChange={(e) => handleInputChange('cloudSelection', 'azure.dataTransferGB', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* GCP */}
        <div className="input-provider-card">
          <div className="provider-header" style={{backgroundColor: '#4285F4', color: 'white'}}>
            <h4>☁️ Google Cloud Platform</h4>
            <small>Estimated monthly costs</small>
          </div>
          <div className="provider-body">
            <div className="mb-3">
              <label className="form-label">Compute Engine / GKE</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.gcp.compute}
                  onChange={(e) => handleInputChange('cloudSelection', 'gcp.compute', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Cloud Storage (GB/month)</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.gcp.storage}
                  onChange={(e) => handleInputChange('cloudSelection', 'gcp.storage', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Networking / Load Balancing</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.gcp.networking}
                  onChange={(e) => handleInputChange('cloudSelection', 'gcp.networking', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Cloud SQL / BigQuery</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.gcp.database}
                  onChange={(e) => handleInputChange('cloudSelection', 'gcp.database', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Monitoring & Logging</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.gcp.monitoring}
                  onChange={(e) => handleInputChange('cloudSelection', 'gcp.monitoring', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Data Transfer (GB/month)</label>
              <div className="input-group">
                <span className="input-group-text">GB</span>
                <input
                  type="number"
                  className="form-control"
                  value={currentInputs.cloudSelection.gcp.dataTransferGB}
                  onChange={(e) => handleInputChange('cloudSelection', 'gcp.dataTransferGB', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
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
                  value={currentInputs.migration.assessment}
                  onChange={(e) => handleInputChange('migration', 'assessment', e.target.value)}
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
                  value={currentInputs.migration.tools}
                  onChange={(e) => handleInputChange('migration', 'tools', e.target.value)}
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
                  value={currentInputs.migration.training}
                  onChange={(e) => handleInputChange('migration', 'training', e.target.value)}
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
                  value={currentInputs.migration.consulting}
                  onChange={(e) => handleInputChange('migration', 'consulting', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="enhanced-tco-results">
        <div className="summary-cards">
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">💰</span>
            </div>
            <div className="metric-value">${results.totalCloudTCO.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="metric-label">Total Cloud TCO</div>
          </div>

          <div className={`metric-card ${results.savings > 0 ? 'positive' : 'negative'}`}>
            <div className="metric-header">
              <span className="metric-icon">📈</span>
            </div>
            <div className="metric-value">{results.savings > 0 ? '+' : ''}${results.savings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="metric-label">Total Savings</div>
          </div>

          <div className={`metric-card ${results.roi > 0 ? 'positive' : 'negative'}`}>
            <div className="metric-header">
              <span className="metric-icon">🎯</span>
            </div>
            <div className="metric-value">{results.roi.toFixed(2)}%</div>
            <div className="metric-label">ROI</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">⏱️</span>
            </div>
            <div className="metric-value">{currentInputs.timeframe} mo</div>
            <div className="metric-label">Analysis Period</div>
          </div>
        </div>

        {/* Executive Summary */}
        {analytics?.summary && (
          <div className="executive-summary card mb-4">
            <div className="card-header bg-success text-white">
              <h4>Executive Summary</h4>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-8">
                  <p className="summary-text">
                    Based on your inputs, migrating to the cloud would result in a <strong>${results.savings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> savings 
                    over {currentInputs.timeframe} months, representing a <strong>{results.roi.toFixed(2)}%</strong> return on investment.
                  </p>
                  
                  {analytics.summary.breakEvenPoint && (
                    <p className="break-even-text">
                      The break-even point is estimated at <strong>{Math.round(analytics.summary.breakEvenPoint.months)} months</strong> from migration.
                    </p>
                  )}
                  
                  {analytics.summary.confidenceLevel && (
                    <p className="confidence-text">
                      <span className={`badge bg-${analytics.summary.confidenceLevel === 'High' ? 'success' : analytics.summary.confidenceLevel === 'Medium' ? 'warning' : 'danger'}`}>
                        Confidence Level: {analytics.summary.confidenceLevel}
                      </span>
                    </p>
                  )}
                </div>
                
                <div className="col-md-4">
                  <div className="recommendations">
                    <h6>Top Recommendations:</h6>
                    {analytics.summary.recommendations.map((rec, idx) => (
                      <div key={idx} className="recommendation-item">
                        <div className="rec-icon">💡</div>
                        <div className="rec-text">{rec.recommendation}</div>
                        <div className="rec-savings badge bg-info">{rec.potentialSavings} savings</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderVisualizations = () => {
    if (!analytics) return null;

    return (
      <div className="enhanced-tco-visualizations">
        {results && (
          <>
            {/* TCO Comparison */}
            <div className="card mb-4">
              <div className="card-header">
                <h5>TCO Comparison Analysis</h5>
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <TcoComparisonChart 
                    data={{
                      labels: ['On-Premise', 'Cloud (Total)'],
                      datasets: [
                        {
                          label: 'Recurring Costs',
                          data: [results.onPremiseTCO, results.cloudTCO],
                          backgroundColor: ['rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)'],
                          borderColor: ['rgb(255, 99, 132)', 'rgb(54, 162, 235)'],
                          borderWidth: 1
                        },
                        {
                          label: 'One-time Migration',
                          data: [0, results.migrationCost],
                          backgroundColor: ['rgba(0, 0, 0, 0)', 'rgba(255, 205, 86, 0.8)'],
                          borderColor: ['rgba(0, 0, 0, 0)', 'rgb(255, 205, 86)'],
                          borderWidth: 1
                        }
                      ]
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Break-even Analysis */}
            {analytics.summary?.breakEvenPoint && (
              <div className="card mb-4">
                <div className="card-header">
                  <h5>Break-even Analysis</h5>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <BreakEvenChart 
                      breakEvenData={{
                        onPremiseMonthly: results.onPremiseTCO / currentInputs.timeframe,
                        cloudMonthly: results.cloudMonthly,
                        migrationCost: results.migrationCost,
                        months: analytics.summary.breakEvenPoint.months
                      }}
                      timeframe={currentInputs.timeframe}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sensitivity Analysis */}
            {analytics.sensitivity && (
              <div className="card mb-4">
                <div className="card-header">
                  <h5>Sensitivity Analysis</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="chart-container">
                        <SensitivityChart 
                          sensitivityData={analytics.sensitivity.onPremise}
                          variable="On-Premise Costs"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="chart-container">
                        <SensitivityChart 
                          sensitivityData={analytics.sensitivity.cloud}
                          variable="Cloud Costs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Risk Analysis */}
            <div className="card mb-4">
              <div className="card-header">
                <h5>Risk Assessment</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="chart-container">
                      <RiskRadarChart 
                        riskData={currentInputs.riskFactors}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="chart-container">
                      <CostBreakdownChart 
                        breakdownData={analytics.riskAdjusted?.cloudCostBreakdown || {
                          compute: results.cloudMonthly * 0.4,
                          storage: results.cloudMonthly * 0.3,
                          networking: results.cloudMonthly * 0.2,
                          other: results.cloudMonthly * 0.1
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Predictive Analysis */}
            <div className="card mb-4">
              <div className="card-header">
                <h5>Predictive Cost Trends (5-Year Forecast)</h5>
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <ForecastingChart 
                    forecastData={analytics.forecast}
                  />
                </div>
              </div>
            </div>

            {/* Carbon Footprint Analysis */}
            <div className="card mb-4">
              <div className="card-header">
                <h5>Environmental Impact Analysis</h5>
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <CarbonFootprintChart 
                    footprintData={analytics.footprint}
                  />
                </div>
                <div className="mt-3">
                  <p>
                    <strong>Carbon Reduction:</strong> {analytics.footprint?.percentReduction > 0 ? 
                      `${analytics.footprint.percentReduction.toFixed(1)}% reduction in carbon footprint` : 
                      `${Math.abs(analytics.footprint?.percentReduction || 0).toFixed(1)}% increase in carbon footprint`}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderRecommendations = () => {
    if (!analytics?.summary?.recommendations) return null;

    return (
      <div className="enhanced-tco-recommendations">
        <div className="card">
          <div className="card-header">
            <h5>AI-Powered Recommendations</h5>
          </div>
          <div className="card-body">
            {analytics.summary.recommendations.map((rec, idx) => (
              <div key={idx} className="recommendation-item mb-3 p-3 bg-light rounded">
                <div className="d-flex">
                  <div className="rec-icon fs-4 me-3">💡</div>
                  <div>
                    <h6>{rec.recommendation}</h6>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">{rec.service} optimization</span>
                      <span className="badge bg-success">{rec.potentialSavings} potential savings</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="mt-4">
              <h6>Additional Optimization Opportunities:</h6>
              <ul className="list-group">
                <li className="list-group-item">
                  <strong>Reserved Instances/Savings Plans:</strong> Commit to 1-3 year plans for 30-60% savings
                </li>
                <li className="list-group-item">
                  <strong>Spot Instances:</strong> Use for non-critical workloads for up to 90% savings
                </li>
                <li className="list-group-item">
                  <strong>Auto-scaling:</strong> Implement to optimize resource usage and costs
                </li>
                <li className="list-group-item">
                  <strong>Storage Class Optimization:</strong> Move infrequent data to cheaper storage tiers
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="enhanced-tco-calculator">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Advanced TCO Calculator & Analytics Platform</h2>
        {loading && <div className="spinner-border text-primary" role="status"></div>}
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'calculator' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculator')}
          >
            📊 Calculator
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            📈 Results
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            💡 Recommendations
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      {activeTab === 'calculator' && renderCalculatorInputs()}
      {activeTab === 'results' && results && renderResults()}
      {activeTab === 'analytics' && analytics && renderVisualizations()}
      {activeTab === 'recommendations' && analytics && renderRecommendations()}
    </div>
  );
};

export default EnhancedTcoCalculator;