/**
 * Enhanced TCO Calculator Component
 * 
 * Architectural Intent:
 * - Presentation layer component (UI only)
 * - Uses CalculateTCOUseCase for business logic
 * - Clean separation of concerns
 */

import React, { useState } from 'react';
import { getContainer } from '../../infrastructure/dependency_injection/Container.js';
import { TCOInput } from '../../application/use_cases/CalculateTCOUseCase.js';
import { Money } from '../../domain/value_objects/Money.js';

/**
 * Enhanced TCO Calculator Component
 * 
 * Uses Clean Architecture:
 * - Uses CalculateTCOUseCase
 * - No business logic in component
 * - Displays TCO results with ROI analysis
 */
function EnhancedTCOCalculator({ onCalculate }) {
  const [inputs, setInputs] = useState({
    onPremise: {
      hardware: 0,
      software: 0,
      maintenance: 0,
      labor: 0,
      power: 0,
      cooling: 0,
      datacenter: 0,
    },
    aws: {
      ec2Instances: 0,
      s3: 0,
      rds: 0,
      vpc: 0,
      cloudwatch: 0,
    },
    azure: {
      virtualMachines: 0,
      blobStorage: 0,
      sqlDatabase: 0,
      networking: 0,
      monitoring: 0,
    },
    gcp: {
      compute: 0,
      storage: 0,
      networking: 0,
      database: 0,
      monitoring: 0,
    },
    migration: {
      assessment: 0,
      tools: 0,
      training: 0,
      consulting: 0,
    },
    timeframe: 36,
    region: 'us-east-1',
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get dependencies from container
  const container = getContainer();
  const calculateTCOUseCase = container.calculateTCOUseCase;

  const handleInputChange = (category, field, value) => {
    setInputs(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: parseFloat(value) || 0,
      },
    }));
  };

  /**
   * Calculate TCO using use case
   */
  const handleCalculate = async () => {
    setLoading(true);
    setError(null);

    try {
      const tcoInput = new TCOInput({
        onPremise: inputs.onPremise,
        aws: inputs.aws,
        azure: inputs.azure,
        gcp: inputs.gcp,
        migration: inputs.migration,
        timeframe: inputs.timeframe,
        region: inputs.region,
      });

      const tcoResult = await calculateTCOUseCase.execute(tcoInput);
      setResults(tcoResult);

      // Notify parent
      if (onCalculate && agentResult.tco) {
        onCalculate({
          onPremise: agentResult.tco.onPremise.amount,
          aws: agentResult.tco.aws.amount,
          azure: agentResult.tco.azure.amount,
          gcp: agentResult.tco.gcp.amount,
          migrationCost: agentResult.tco.migrationCost.amount,
          totalAws: agentResult.tco.totalAws.amount,
          totalAzure: agentResult.tco.totalAzure.amount,
          totalGcp: agentResult.tco.totalGcp.amount,
        });
      }
    } catch (error) {
      console.error('TCO calculation failed:', error);
      setError(`TCO calculation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Agentic Status */}
      <div className="card mb-3" style={{background: 'linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%)', border: '1px solid var(--primary-200)'}}>
        <div className="card-body">
          <div className="d-flex align-items-center gap-3">
            <div style={{fontSize: '2rem'}}>🤖</div>
            <div>
              <h6 className="mb-1" style={{color: 'var(--primary-700)', fontWeight: 600}}>Autonomous Cost Analysis Agent</h6>
              <small className="text-muted">
                AI-powered agents autonomously analyze costs with intelligent insights, optimizations, and recommendations
              </small>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-primary text-white">
          <h3 className="mb-0">💰 Autonomous TCO Analysis</h3>
          <small>AI agents analyze and optimize costs across on-premise, AWS, Azure, and GCP</small>
        </div>
      <div className="card-body">
        {/* Error Display */}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* Inputs */}
        <div className="row">
          {/* On-Premise Costs */}
          <div className="col-md-3 mb-4">
            <h5>On-Premise Costs</h5>
            {Object.keys(inputs.onPremise).map(field => (
              <div key={field} className="mb-2">
                <label className="form-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input
                  type="number"
                  className="form-control"
                  value={inputs.onPremise[field]}
                  onChange={(e) => handleInputChange('onPremise', field, e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            ))}
          </div>

          {/* AWS Costs */}
          <div className="col-md-3 mb-4">
            <h5>AWS Costs</h5>
            {Object.keys(inputs.aws).map(field => (
              <div key={field} className="mb-2">
                <label className="form-label">{field}</label>
                <input
                  type="number"
                  className="form-control"
                  value={inputs.aws[field]}
                  onChange={(e) => handleInputChange('aws', field, e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            ))}
          </div>

          {/* Azure Costs */}
          <div className="col-md-3 mb-4">
            <h5>Azure Costs</h5>
            {Object.keys(inputs.azure).map(field => (
              <div key={field} className="mb-2">
                <label className="form-label">{field}</label>
                <input
                  type="number"
                  className="form-control"
                  value={inputs.azure[field]}
                  onChange={(e) => handleInputChange('azure', field, e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            ))}
          </div>

          {/* GCP Costs */}
          <div className="col-md-3 mb-4">
            <h5>GCP Costs</h5>
            {Object.keys(inputs.gcp).map(field => (
              <div key={field} className="mb-2">
                <label className="form-label">{field}</label>
                <input
                  type="number"
                  className="form-control"
                  value={inputs.gcp[field]}
                  onChange={(e) => handleInputChange('gcp', field, e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Migration Costs */}
        <div className="row mb-4">
          <div className="col-md-6">
            <h5>Migration Costs (One-time)</h5>
            <div className="row">
              {Object.keys(inputs.migration).map(field => (
                <div key={field} className="col-md-6 mb-2">
                  <label className="form-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                  <input
                    type="number"
                    className="form-control"
                    value={inputs.migration[field]}
                    onChange={(e) => handleInputChange('migration', field, e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="col-md-6">
            <h5>Analysis Options</h5>
            <div className="mb-2">
              <label className="form-label">Timeframe (months)</label>
              <input
                type="number"
                className="form-control"
                value={inputs.timeframe}
                onChange={(e) => setInputs(prev => ({ ...prev, timeframe: parseInt(e.target.value) || 36 }))}
                min="12"
                max="60"
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Region</label>
              <input
                type="text"
                className="form-control"
                value={inputs.region}
                onChange={(e) => setInputs(prev => ({ ...prev, region: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Auto-calculates - no button needed */}
        {loading && (
          <div className="mb-4">
            <div className="alert alert-info">
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Agent is analyzing costs with AI...
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="card bg-light mt-4">
            <div className="card-header">
              <h4>Agentic TCO Analysis Results ({results.timeframe || inputs.timeframe} months)</h4>
              <small className="text-muted">AI-enhanced analysis with insights and optimizations</small>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <div className="card">
                    <div className="card-body">
                      <h6>On-Premise</h6>
                      <h4>{results.onPremise.format()}</h4>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card">
                    <div className="card-body">
                      <h6>AWS Total</h6>
                      <h4>{results.totalAws.format()}</h4>
                      <small>ROI: {results.roi.aws.toFixed(2)}%</small>
                      <br />
                      <small className="text-success">
                        Savings: {results.savings.aws.format()}
                      </small>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card">
                    <div className="card-body">
                      <h6>Azure Total</h6>
                      <h4>{results.totalAzure.format()}</h4>
                      <small>ROI: {results.roi.azure.toFixed(2)}%</small>
                      <br />
                      <small className="text-success">
                        Savings: {results.savings.azure.format()}
                      </small>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-success">
                    <div className="card-body">
                      <h6>GCP Total</h6>
                      <h4 className="text-success">{results.totalGcp.format()}</h4>
                      <small>ROI: {results.roi.gcp.toFixed(2)}%</small>
                      <br />
                      <small className="text-success">
                        Savings: {results.savings.gcp.format()}
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Migration Cost Breakdown */}
              <div className="mt-4">
                <h5>Migration Cost Breakdown</h5>
                <p><strong>Total Migration Cost:</strong> {results.migrationCost.format()}</p>
              </div>

              {/* Best Option Recommendation */}
              <div className="alert alert-info mt-4">
                <h5>Recommendation</h5>
                <p>
                  Based on the analysis,{' '}
                  <strong>
                    {results.roi.gcp > results.roi.aws && results.roi.gcp > results.roi.azure
                      ? 'GCP'
                      : results.roi.aws > results.roi.azure
                      ? 'AWS'
                      : 'Azure'}
                  </strong>{' '}
                  provides the best ROI of{' '}
                  <strong>
                    {Math.max(results.roi.gcp, results.roi.aws, results.roi.azure).toFixed(2)}%
                  </strong>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnhancedTCOCalculator;
  : results.roi.aws > results.roi.azure
                      ? 'AWS'
                      : 'Azure'}
                  </strong>{' '}
                  provides the best ROI of{' '}
                  <strong>
                    {Math.max(results.roi.gcp, results.roi.aws, results.roi.azure).toFixed(2)}%
                  </strong>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnhancedTCOCalculator;
