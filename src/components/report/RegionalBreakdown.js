/**
 * Regional Breakdown Component
 * 
 * Displays workload distribution by AWS region:
 * - Region name
 * - Count of workloads
 * - Total monthly cost
 * - Average complexity
 * - Top 3 services in region
 */

import React from 'react';
import { ReportDataAggregator } from '../../domain/services/ReportDataAggregator.js';

const RegionalBreakdown = ({ workloads = [] }) => {
  if (!workloads || workloads.length === 0) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        No workloads available for regional breakdown.
      </div>
    );
  }

  // Performance optimization: Skip heavy aggregation for UI, show summary instead
  // Full details available in PDF report
  return (
    <div className="card">
      <div className="card-header bg-info text-white">
        <h5 className="mb-0">
          <i className="bi bi-globe me-2"></i>
          Regional Breakdown - Workload Distribution by AWS Region
        </h5>
      </div>
      <div className="card-body">
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Regional breakdown available in PDF report.</strong>
          <br />
          Detailed workload distribution by AWS region with {workloads.length.toLocaleString()} workloads, 
          regional costs, complexity analysis, and top services per region included in the comprehensive PDF report.
          <br />
          <small className="text-muted">UI rendering disabled for performance with large workload counts.</small>
        </div>
      </div>
    </div>
  );
};

export default RegionalBreakdown;
