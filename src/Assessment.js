import React, { useState } from 'react';
import AssessmentSummary from './components/AssessmentSummary';
import WorkloadAssessment from './components/WorkloadAssessment';
import BusinessValue from './components/BusinessValue';

const Assessment = ({ workloads, onAssessmentComplete }) => {
  const [assessment, setAssessment] = useState(null);

  const handleAnalyze = () => {
    // Simulate analysis
    const results = {
      summary: {
        totalWorkloads: workloads.length,
        recommendations: {
          containerize: workloads.filter(w => w.type === 'application').length,
          replatform: workloads.filter(w => w.type === 'database').length,
          rehost: workloads.filter(w => w.type === 'vm').length,
        },
      },
      workloads: workloads.map(w => ({
        ...w,
        recommendation: getRecommendation(w),
        businessValue: getBusinessValue(w),
      })),
    };
    setAssessment(results);
    onAssessmentComplete(results);
  };

  const getRecommendation = (workload) => {
    switch (workload.type) {
      case 'application':
        return 'Containerize';
      case 'database':
        return 'Re-platform to Cloud SQL';
      case 'vm':
        return 'Re-host to Compute Engine';
      default:
        return 'N/A';
    }
  };

  const getBusinessValue = (workload) => {
    switch (workload.type) {
      case 'application':
        return 'Improved scalability and portability';
      case 'database':
        return 'Reduced operational overhead';
      case 'vm':
        return 'Lower infrastructure costs';
      default:
        return 'N/A';
    }
  };

  return (
    <div className="assessment-view">
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Application Modernization Assessment</h3>
              <p className="card-text">
                Analyze your discovered workloads to get modernization recommendations and assess business value.
              </p>
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={!workloads.length}>
                Analyze Workloads
              </button>
            </div>
          </div>
        </div>
      </div>

      {assessment && (
        <div className="row">
          <div className="col-12">
            <AssessmentSummary summary={assessment.summary} />
            <WorkloadAssessment workloads={assessment.workloads} />
            <BusinessValue workloads={assessment.workloads} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Assessment;
