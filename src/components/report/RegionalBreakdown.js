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

  const regionAggregation = ReportDataAggregator.aggregateByRegion(workloads);

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

  const formatRegionName = (region) => {
    // Convert AWS region codes to readable names
    const regionNames = {
      'us-east-1': 'US East (N. Virginia)',
      'us-east-2': 'US East (Ohio)',
      'us-west-1': 'US West (N. California)',
      'us-west-2': 'US West (Oregon)',
      'eu-west-1': 'Europe (Ireland)',
      'eu-west-2': 'Europe (London)',
      'eu-west-3': 'Europe (Paris)',
      'eu-central-1': 'Europe (Frankfurt)',
      'ap-southeast-1': 'Asia Pacific (Singapore)',
      'ap-southeast-2': 'Asia Pacific (Sydney)',
      'ap-northeast-1': 'Asia Pacific (Tokyo)',
      'ap-south-1': 'Asia Pacific (Mumbai)',
      'sa-east-1': 'South America (São Paulo)',
      'ca-central-1': 'Canada (Central)'
    };
    return regionNames[region] || region;
  };

  return (
    <div className="card">
      <div className="card-header bg-info text-white">
        <h5 className="mb-0">
          <i className="bi bi-globe me-2"></i>
          Regional Breakdown - Workload Distribution by AWS Region
        </h5>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-hover table-striped">
            <thead className="table-light">
              <tr>
                <th>Rank</th>
                <th>AWS Region</th>
                <th className="text-end">Workloads</th>
                <th className="text-end">Monthly Cost</th>
                <th className="text-center">Avg Complexity</th>
                <th>Top 3 Services</th>
              </tr>
            </thead>
            <tbody>
              {regionAggregation.map((region, index) => (
                <tr key={region.region}>
                  <td>
                    <strong>{index + 1}</strong>
                  </td>
                  <td>
                    <strong>{formatRegionName(region.region)}</strong>
                    <small className="text-muted d-block">
                      {region.region}
                    </small>
                  </td>
                  <td className="text-end">
                    <span className="badge bg-info">{region.count.toLocaleString()}</span>
                  </td>
                  <td className="text-end">
                    <strong>{formatCurrency(region.totalCost)}</strong>
                  </td>
                  <td className="text-center">
                    {getComplexityBadge(region.averageComplexity)}
                  </td>
                  <td>
                    {region.topServices && region.topServices.length > 0 ? (
                      <div>
                        {region.topServices.map((service, idx) => (
                          <span key={service} className="badge bg-secondary me-1">
                            {service}
                            {region.topServicesCosts && region.topServicesCosts[idx] && (
                              <small className="ms-1">
                                ({formatCurrency(region.topServicesCosts[idx])})
                              </small>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
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
                  <strong>{regionAggregation.reduce((sum, r) => sum + r.count, 0).toLocaleString()}</strong>
                </td>
                <td className="text-end">
                  <strong>{formatCurrency(regionAggregation.reduce((sum, r) => sum + r.totalCost, 0))}</strong>
                </td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="mt-3">
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            Showing all {regionAggregation.length} regions with workloads.
          </small>
        </div>
      </div>
    </div>
  );
};

export default RegionalBreakdown;
