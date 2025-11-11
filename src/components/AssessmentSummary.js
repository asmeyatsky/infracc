import React from 'react';

const AssessmentSummary = ({ summary }) => {
  return (
    <div className="card mb-4">
      <div className="card-body">
        <h4 className="card-title">Assessment Summary</h4>
        <div className="row">
          <div className="col-md-4">
            <div className="metric-card">
              <div className="metric-value">{summary.totalWorkloads}</div>
              <div className="metric-label">Total Workloads</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="metric-card">
              <div className="metric-value">{summary.recommendations.containerize}</div>
              <div className="metric-label">Containerize</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="metric-card">
              <div className="metric-value">{summary.recommendations.replatform}</div>
              <div className="metric-label">Re-platform</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentSummary;
