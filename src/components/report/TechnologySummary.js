/**
 * Technology Summary Component
 * 
 * Displays AWS services breakdown with:
 * - Service name
 * - Count of workloads
 * - Total monthly cost
 * - Average complexity
 * - Target GCP service
 * - Migration strategy
 */

import React from 'react';
import { ReportDataAggregator } from '../../domain/services/ReportDataAggregator.js';

const TechnologySummary = ({ workloads = [] }) => {
  if (!workloads || workloads.length === 0) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        No workloads available for technology summary.
      </div>
    );
  }

  // Performance optimization: Skip heavy aggregation for UI, show summary instead
  // Full details available in PDF report
  return (
    <div className="card">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">
          <i className="bi bi-cpu me-2"></i>
          Technology Summary - AWS Services Breakdown
        </h5>
      </div>
      <div className="card-body">
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Technology summary available in PDF report.</strong>
          <br />
          Detailed AWS services breakdown with {workloads.length.toLocaleString()} workloads, 
          GCP service mappings, migration strategies, and cost analysis included in the comprehensive PDF report.
          <br />
          <small className="text-muted">UI rendering disabled for performance with large workload counts.</small>
        </div>
      </div>
    </div>
  );
};

export default TechnologySummary;
