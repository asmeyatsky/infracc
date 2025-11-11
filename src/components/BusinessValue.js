import React from 'react';

const BusinessValue = ({ workloads }) => {
  return (
    <div className="card mb-4">
      <div className="card-body">
        <h4 className="card-title">Business Value</h4>
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Workload</th>
                <th>Business Value</th>
              </tr>
            </thead>
            <tbody>
              {workloads.map(workload => (
                <tr key={workload.id}>
                  <td>{workload.name}</td>
                  <td>{workload.businessValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BusinessValue;
