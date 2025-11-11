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

  const serviceAggregation = ReportDataAggregator.aggregateByService(workloads);
  const { topServices, other } = ReportDataAggregator.getTopServicesWithOther(serviceAggregation, 15);

  const displayServices = other ? [...topServices, other] : topServices;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getComplexityBadge = (complexity) => {
    if (complexity === null || complexity === undefined) {
      return <span className="badge bg-secondary">N/A</span>;
    }
    if (complexity <= 3) {
      return <span className="badge bg-success">Low ({complexity.toFixed(1)})</span>;
    } else if (complexity <= 6) {
      return <span className="badge bg-warning text-dark">Medium ({complexity.toFixed(1)})</span>;
    } else {
      return <span className="badge bg-danger">High ({complexity.toFixed(1)})</span>;
    }
  };

  const getStrategyBadge = (strategy) => {
    const colors = {
      'Rehost': 'bg-primary',
      'Replatform': 'bg-info',
      'Refactor': 'bg-warning text-dark',
      'Repurchase': 'bg-success',
      'Retire': 'bg-secondary',
      'Retain': 'bg-dark',
      'Mixed': 'bg-secondary'
    };
    return (
      <span className={`badge ${colors[strategy] || 'bg-secondary'}`}>
        {strategy}
      </span>
    );
  };

  const getEffortBadge = (effort) => {
    const colors = {
      'Low': 'bg-success',
      'Medium': 'bg-warning text-dark',
      'High': 'bg-danger'
    };
    return (
      <span className={`badge ${colors[effort] || 'bg-secondary'}`}>
        {effort}
      </span>
    );
  };

  return (
    <div className="card">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">
          <i className="bi bi-cpu me-2"></i>
          Technology Summary - AWS Services Breakdown
        </h5>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-hover table-striped">
            <thead className="table-light">
              <tr>
                <th>Rank</th>
                <th>AWS Service</th>
                <th className="text-end">Workloads</th>
                <th className="text-end">Monthly Cost</th>
                <th className="text-center">Avg Complexity</th>
                <th>Target GCP Service</th>
                <th>Strategy</th>
                <th>Effort</th>
              </tr>
            </thead>
            <tbody>
              {displayServices.map((service, index) => (
                <tr key={service.service}>
                  <td>
                    <strong>{index + 1}</strong>
                  </td>
                  <td>
                    <strong>{service.service}</strong>
                    {service.gcpApi && (
                      <small className="text-muted d-block">
                        API: {service.gcpApi}
                      </small>
                    )}
                  </td>
                  <td className="text-end">
                    <span className="badge bg-info">{service.count.toLocaleString()}</span>
                  </td>
                  <td className="text-end">
                    <strong>{formatCurrency(service.totalCost)}</strong>
                  </td>
                  <td className="text-center">
                    {getComplexityBadge(service.averageComplexity)}
                  </td>
                  <td>
                    {service.gcpService}
                  </td>
                  <td>
                    {getStrategyBadge(service.migrationStrategy)}
                  </td>
                  <td>
                    {getEffortBadge(service.effort)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="table-light">
              <tr>
                <td colSpan="2">
                  <strong>Total</strong>
                </td>
                <td className="text-end">
                  <strong>{displayServices.reduce((sum, s) => sum + s.count, 0).toLocaleString()}</strong>
                </td>
                <td className="text-end">
                  <strong>{formatCurrency(displayServices.reduce((sum, s) => sum + s.totalCost, 0))}</strong>
                </td>
                <td colSpan="4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        {other && (
          <div className="alert alert-info mt-3">
            <i className="bi bi-info-circle me-2"></i>
            <strong>"Other" category</strong> includes {serviceAggregation.length - 15} additional AWS services 
            with lower individual costs.
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnologySummary;
