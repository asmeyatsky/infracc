/**
 * Cost Comparison Component
 * 
 * Displays AWS vs GCP cost comparison:
 * - AWS Service → GCP Service
 * - AWS Monthly Cost
 * - GCP On-Demand Cost
 * - GCP 1-Year CUD Cost
 * - GCP 3-Year CUD Cost
 * - Savings with CUD
 */

import React, { useState, useEffect } from 'react';
import { GCPCostEstimator } from '../../domain/services/GCPCostEstimator.js';

const CostComparison = ({ serviceAggregation = [], targetRegion = 'us-central1' }) => {
  const [costEstimates, setCostEstimates] = useState([]);
  const [totalCosts, setTotalCosts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCostEstimates = async () => {
      if (!serviceAggregation || serviceAggregation.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const estimates = await GCPCostEstimator.estimateAllServiceCosts(
          serviceAggregation,
          targetRegion
        );
        
        setCostEstimates(estimates);
        
        const totals = GCPCostEstimator.calculateTotalCosts(estimates);
        setTotalCosts(totals);
      } catch (err) {
        console.error('Error loading cost estimates:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCostEstimates();
  }, [serviceAggregation, targetRegion]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading cost estimates...</span>
          </div>
          <p className="mt-2 text-muted">Calculating GCP cost estimates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning">
        <i className="bi bi-exclamation-triangle me-2"></i>
        Error loading cost estimates: {error}
      </div>
    );
  }

  if (!costEstimates || costEstimates.length === 0) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        No cost estimates available.
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getSavingsBadge = (savings, percent) => {
    if (savings > 0) {
      return (
        <span className="badge bg-success">
          Save {formatCurrency(savings)} ({formatPercent(percent)})
        </span>
      );
    } else if (savings < 0) {
      return (
        <span className="badge bg-danger">
          +{formatCurrency(Math.abs(savings))} ({formatPercent(percent)})
        </span>
      );
    } else {
      return <span className="badge bg-secondary">No change</span>;
    }
  };

  return (
    <div className="card">
      <div className="card-header bg-success text-white">
        <h5 className="mb-0">
          <i className="bi bi-calculator me-2"></i>
          Cost Comparison - AWS vs GCP
        </h5>
        {totalCosts && (
          <small className="d-block mt-1">
            Target Region: {targetRegion} | 
            Total AWS Cost: {formatCurrency(totalCosts.awsTotal)} | 
            Best GCP Option (3-Year CUD): {formatCurrency(totalCosts.gcp3YearCUDTotal)} 
            ({formatPercent(totalCosts.savingsPercent3Year)} savings)
          </small>
        )}
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-hover table-striped">
            <thead className="table-light">
              <tr>
                <th>AWS Service</th>
                <th>GCP Service</th>
                <th className="text-end">AWS Cost</th>
                <th className="text-end">GCP On-Demand</th>
                <th className="text-end">GCP 1-Year CUD</th>
                <th className="text-end">GCP 3-Year CUD</th>
                <th className="text-center">Best Savings</th>
              </tr>
            </thead>
            <tbody>
              {costEstimates.map((estimate, index) => {
                const costs = estimate.costEstimate || {};
                const bestSavings = Math.max(
                  costs.savings1Year || 0,
                  costs.savings3Year || 0
                );
                const bestPercent = bestSavings === (costs.savings1Year || 0)
                  ? costs.savingsPercent1Year || 0
                  : costs.savingsPercent3Year || 0;

                return (
                  <tr key={estimate.service || index}>
                    <td>
                      <strong>{estimate.service}</strong>
                    </td>
                    <td>
                      {costs.gcpService || 'N/A'}
                    </td>
                    <td className="text-end">
                      <strong>{formatCurrency(costs.awsCost || 0)}</strong>
                    </td>
                    <td className="text-end">
                      {formatCurrency(costs.gcpOnDemand || 0)}
                    </td>
                    <td className="text-end">
                      {formatCurrency(costs.gcp1YearCUD || 0)}
                      {costs.savings1Year > 0 && (
                        <small className="text-success d-block">
                          {getSavingsBadge(costs.savings1Year, costs.savingsPercent1Year)}
                        </small>
                      )}
                    </td>
                    <td className="text-end">
                      {formatCurrency(costs.gcp3YearCUD || 0)}
                      {costs.savings3Year > 0 && (
                        <small className="text-success d-block">
                          {getSavingsBadge(costs.savings3Year, costs.savingsPercent3Year)}
                        </small>
                      )}
                    </td>
                    <td className="text-center">
                      {bestSavings > 0 ? (
                        <span className="badge bg-success">
                          {formatCurrency(bestSavings)}
                          <br />
                          <small>{formatPercent(bestPercent)}</small>
                        </span>
                      ) : (
                        <span className="badge bg-secondary">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {totalCosts && (
              <tfoot className="table-light">
                <tr>
                  <td colSpan="2">
                    <strong>Total</strong>
                  </td>
                  <td className="text-end">
                    <strong>{formatCurrency(totalCosts.awsTotal)}</strong>
                  </td>
                  <td className="text-end">
                    <strong>{formatCurrency(totalCosts.gcpOnDemandTotal)}</strong>
                  </td>
                  <td className="text-end">
                    <strong>{formatCurrency(totalCosts.gcp1YearCUDTotal)}</strong>
                    <small className="text-success d-block">
                      {getSavingsBadge(totalCosts.savings1Year, totalCosts.savingsPercent1Year)}
                    </small>
                  </td>
                  <td className="text-end">
                    <strong>{formatCurrency(totalCosts.gcp3YearCUDTotal)}</strong>
                    <small className="text-success d-block">
                      {getSavingsBadge(totalCosts.savings3Year, totalCosts.savingsPercent3Year)}
                    </small>
                  </td>
                  <td className="text-center">
                    <strong className="text-success">
                      {formatCurrency(Math.max(totalCosts.savings1Year, totalCosts.savings3Year))}
                    </strong>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="alert alert-info mt-3">
          <h6><i className="bi bi-info-circle me-2"></i>About Committed Use Discounts (CUD)</h6>
          <ul className="mb-0">
            <li><strong>1-Year CUD:</strong> ~25% discount on compute, ~15% on storage, ~20% on databases</li>
            <li><strong>3-Year CUD:</strong> ~45% discount on compute, ~30% on storage, ~40% on databases</li>
            <li>All workloads are assumed eligible for CUD pricing</li>
            <li>Costs are estimates based on current GCP pricing and may vary</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CostComparison;
