import React from 'react';

const WorkloadAssessment = ({ workloads }) => {
  return (
    <div className="card mb-4">
      <div className="card-body">
        <h4 className="card-title">Workload Assessment</h4>
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Workload</th>
                <th>Type</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {workloads.map(workload => (
                <tr key={workload.id}>
                  <td>{workload.name}</td>
                  <td>{workload.type}</td>
                  <td>{workload.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WorkloadAssessment;
