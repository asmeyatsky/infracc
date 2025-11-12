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
  // Performance optimization: Skip heavy cost estimation for UI, show summary instead
  // Full cost comparison available in PDF report
  return (
    <div className="card">
      <div className="card-header bg-success text-white">
        <h5 className="mb-0">
          <i className="bi bi-calculator me-2"></i>
          Cost Comparison - AWS vs GCP
        </h5>
        <small className="d-block mt-1">
          Target Region: {targetRegion}
        </small>
      </div>
      <div className="card-body">
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Cost comparison available in PDF report.</strong>
          <br />
          Detailed AWS vs GCP cost comparison with service-by-service breakdown, 
          on-demand pricing, 1-year and 3-year Committed Use Discount (CUD) pricing, 
          and savings analysis included in the comprehensive PDF report.
          <br />
          <small className="text-muted">UI rendering disabled for performance with large workload counts.</small>
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
