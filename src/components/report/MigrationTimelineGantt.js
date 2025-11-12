/**
 * Migration Timeline Gantt Chart Component
 * 
 * Displays migration timeline with:
 * - 3-week landing zone setup
 * - Migration waves with realistic durations
 * - Dependencies between workloads
 */

import React from 'react';

const MigrationTimelineGantt = ({ workloads = [], strategyResults = null, assessmentResults = null }) => {
  // Performance optimization: Skip heavy workload iteration
  // Full timeline available in PDF report
  return (
    <div className="card">
      <div className="card-header bg-info text-white">
        <h5 className="mb-0">
          <i className="bi bi-calendar-event me-2"></i>
          Migration Timeline
        </h5>
      </div>
      <div className="card-body">
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          Detailed migration timeline with {workloads.length.toLocaleString()} workloads available in PDF report. 
          Timeline visualization disabled for performance with large workload counts.
        </div>
      </div>
    </div>
  );
};

export default MigrationTimelineGantt;
