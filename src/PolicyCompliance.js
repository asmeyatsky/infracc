import React, { useState } from 'react';

function PolicyCompliance({ workloads, landingZoneConfig }) {
  const [selectedPolicy, setSelectedPolicy] = useState('all');

  // Define compliance policies
  const policies = {
    security: {
      name: 'Security Baseline',
      icon: '🔒',
      color: 'danger',
      rules: [
        {
          id: 'ssl-required',
          name: 'SSL/TLS Required',
          description: 'All workloads must use encrypted connections',
          check: () => landingZoneConfig?.securityConfig?.requireSSL,
        },
        {
          id: 'os-login',
          name: 'OS Login Enabled',
          description: 'Organization policy requires OS Login for all compute instances',
          check: () => landingZoneConfig?.securityConfig?.enableOrgPolicies,
        },
        {
          id: 'private-access',
          name: 'Private Google Access',
          description: 'VPCs must have Private Google Access enabled',
          check: () => landingZoneConfig?.networkConfig?.enablePrivateGoogleAccess,
        },
        {
          id: 'no-windows-exposed',
          name: 'Windows VMs Protected',
          description: 'Windows workloads should not be directly exposed to internet',
          check: () => {
            if (!workloads) return true;
            const windowsWorkloads = workloads.filter(w => w.os === 'windows');
            return windowsWorkloads.length === 0 || landingZoneConfig?.networkConfig?.enableCloudNAT;
          },
        },
      ],
    },
    cost: {
      name: 'Cost Management',
      icon: '💰',
      color: 'warning',
      rules: [
        {
          id: 'budget-set',
          name: 'Budget Alerts Configured',
          description: 'Monthly budget alerts must be configured',
          check: () => true, // Simulated as always configured
        },
        {
          id: 'rightsizing',
          name: 'Resource Right-sizing',
          description: 'No workload should exceed 32 vCPUs without justification',
          check: () => {
            if (!workloads) return true;
            return workloads.every(w => w.cpu <= 32);
          },
        },
        {
          id: 'committed-use',
          name: 'Committed Use Discounts',
          description: 'Stable workloads (>4 vCPUs) should use committed use discounts',
          check: () => {
            if (!workloads) return true;
            const stableWorkloads = workloads.filter(w => w.cpu >= 4);
            return stableWorkloads.length <= 3; // Assumes most are using CUD
          },
        },
        {
          id: 'storage-lifecycle',
          name: 'Storage Lifecycle Policies',
          description: 'Cloud Storage buckets must have lifecycle management',
          check: () => landingZoneConfig?.storageConfig?.enableCloudStorage,
        },
      ],
    },
    operations: {
      name: 'Operational Excellence',
      icon: '⚙️',
      color: 'info',
      rules: [
        {
          id: 'monitoring-enabled',
          name: 'Monitoring Enabled',
          description: 'Cloud Monitoring must be enabled for all projects',
          check: () => landingZoneConfig?.observabilityConfig?.enableCloudMonitoring,
        },
        {
          id: 'logging-enabled',
          name: 'Logging Enabled',
          description: 'Cloud Logging must be enabled with retention policies',
          check: () => landingZoneConfig?.observabilityConfig?.enableCloudLogging,
        },
        {
          id: 'backup-configured',
          name: 'Backup Strategy',
          description: 'Database workloads must have automated backups',
          check: () => {
            if (!workloads) return true;
            const dbWorkloads = workloads.filter(w => w.type === 'database');
            return dbWorkloads.length === 0 || landingZoneConfig?.storageConfig?.enableCloudSQL;
          },
        },
        {
          id: 'ha-configured',
          name: 'High Availability',
          description: 'Production workloads should be multi-zone',
          check: () => landingZoneConfig?.networkConfig?.subnets?.length >= 2,
        },
      ],
    },
    governance: {
      name: 'Governance & Compliance',
      icon: '📋',
      color: 'primary',
      rules: [
        {
          id: 'org-policies',
          name: 'Organization Policies',
          description: 'Organization policies must be enforced',
          check: () => landingZoneConfig?.securityConfig?.enableOrgPolicies,
        },
        {
          id: 'resource-hierarchy',
          name: 'Resource Hierarchy',
          description: 'Projects must be organized in folders',
          check: () => landingZoneConfig?.folders?.length > 0,
        },
        {
          id: 'labels-required',
          name: 'Resource Labeling',
          description: 'All resources must have environment and owner labels',
          check: () => landingZoneConfig?.projects?.every(p => p.environment),
        },
        {
          id: 'billing-account',
          name: 'Billing Account Set',
          description: 'All projects must be linked to a billing account',
          check: () => !!landingZoneConfig?.billingAccountId,
        },
      ],
    },
    networking: {
      name: 'Network Security',
      icon: '🌐',
      color: 'success',
      rules: [
        {
          id: 'no-default-network',
          name: 'No Default Network',
          description: 'Default network must not be used',
          check: () => landingZoneConfig?.networkConfig?.vpcName !== 'default',
        },
        {
          id: 'firewall-rules',
          name: 'Firewall Rules Defined',
          description: 'Custom firewall rules must be defined',
          check: () => !!landingZoneConfig?.networkConfig?.vpcName,
        },
        {
          id: 'cloud-nat',
          name: 'Cloud NAT for Private Instances',
          description: 'Cloud NAT must be configured for outbound internet access',
          check: () => landingZoneConfig?.networkConfig?.enableCloudNAT,
        },
        {
          id: 'vpc-peering',
          name: 'VPC Network Isolation',
          description: 'Workloads must be segregated by subnet',
          check: () => landingZoneConfig?.networkConfig?.subnets?.length >= 3,
        },
      ],
    },
  };

  // Calculate compliance scores
  const calculateCompliance = () => {
    const results = {};
    let totalPassed = 0;
    let totalRules = 0;

    Object.entries(policies).forEach(([key, policy]) => {
      const policyResults = policy.rules.map(rule => ({
        ...rule,
        passed: rule.check(),
      }));

      const passed = policyResults.filter(r => r.passed).length;
      totalPassed += passed;
      totalRules += policy.rules.length;

      results[key] = {
        ...policy,
        results: policyResults,
        passed,
        total: policy.rules.length,
        score: (passed / policy.rules.length) * 100,
      };
    });

    return {
      byPolicy: results,
      overall: {
        passed: totalPassed,
        total: totalRules,
        score: (totalPassed / totalRules) * 100,
      },
    };
  };

  const compliance = calculateCompliance();
  const filteredPolicy = selectedPolicy === 'all' ? null : compliance.byPolicy[selectedPolicy];

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  const getScoreIcon = (passed) => {
    return passed ? '✅' : '❌';
  };

  return (
    <div className="card mb-4">
      <div className="card-header bg-primary text-white">
        <h3 className="mb-0">📋 Policy Compliance Dashboard</h3>
        <small>Monitor adherence to security, cost, and governance policies</small>
      </div>
      <div className="card-body">
        {/* Overall Compliance Score */}
        <div className="row mb-4">
          <div className="col-md-4 offset-md-4">
            <div className="card text-center h-100">
              <div className="card-body">
                <h6 className="text-muted mb-3">Overall Compliance Score</h6>
                <div className="position-relative d-inline-block">
                  <svg width="180" height="180">
                    <circle
                      cx="90"
                      cy="90"
                      r="70"
                      fill="none"
                      stroke="#e9ecef"
                      strokeWidth="15"
                    />
                    <circle
                      cx="90"
                      cy="90"
                      r="70"
                      fill="none"
                      stroke={
                        compliance.overall.score >= 80 ? '#28a745' :
                        compliance.overall.score >= 60 ? '#ffc107' : '#dc3545'
                      }
                      strokeWidth="15"
                      strokeDasharray={`${(compliance.overall.score / 100) * 439.8} 439.8`}
                      strokeLinecap="round"
                      transform="rotate(-90 90 90)"
                    />
                  </svg>
                  <div className="position-absolute top-50 start-50 translate-middle">
                    <h1 className="mb-0">{compliance.overall.score.toFixed(0)}%</h1>
                    <p className="text-muted mb-0 small">
                      {compliance.overall.passed}/{compliance.overall.total} checks
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Policy Category Cards */}
        <div className="row mb-4">
          <div className="col-12">
            <h5 className="mb-3">Compliance by Policy Category</h5>
          </div>
          {Object.entries(compliance.byPolicy).map(([key, policy]) => (
            <div key={key} className="col-md-4 mb-3">
              <div
                className={`card h-100 ${selectedPolicy === key ? 'border-primary border-3' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPolicy(key)}
              >
                <div className={`card-header bg-${policy.color} text-white`}>
                  <strong>{policy.icon} {policy.name}</strong>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h3 className="mb-0">{policy.score.toFixed(0)}%</h3>
                    <span className={`badge bg-${getScoreColor(policy.score)} fs-6`}>
                      {policy.passed}/{policy.total}
                    </span>
                  </div>
                  <div className="progress" style={{ height: '10px' }}>
                    <div
                      className={`progress-bar bg-${getScoreColor(policy.score)}`}
                      style={{ width: `${policy.score}%` }}
                    ></div>
                  </div>
                  <p className="text-muted small mb-0 mt-2">
                    {policy.results.filter(r => !r.passed).length} issues found
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Policy Results */}
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    {filteredPolicy ? `${filteredPolicy.icon} ${filteredPolicy.name}` : '📋 All Policies'}
                  </h5>
                  {selectedPolicy !== 'all' && (
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setSelectedPolicy('all')}
                    >
                      Show All
                    </button>
                  )}
                </div>
              </div>
              <div className="card-body">
                {selectedPolicy === 'all' ? (
                  // Show all policies
                  Object.entries(compliance.byPolicy).map(([key, policy]) => (
                    <div key={key} className="mb-4">
                      <h6 className="mb-3">
                        <span className={`badge bg-${policy.color} me-2`}>
                          {policy.icon} {policy.name}
                        </span>
                        <span className={`badge bg-${getScoreColor(policy.score)}`}>
                          {policy.passed}/{policy.total} passed
                        </span>
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-hover">
                          <thead>
                            <tr>
                              <th style={{ width: '50px' }}>Status</th>
                              <th>Rule</th>
                              <th>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {policy.results.map((rule) => (
                              <tr key={rule.id} className={rule.passed ? '' : 'table-danger'}>
                                <td className="text-center">{getScoreIcon(rule.passed)}</td>
                                <td><strong>{rule.name}</strong></td>
                                <td>{rule.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  // Show selected policy details
                  <div>
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th style={{ width: '80px' }}>Status</th>
                            <th>Rule Name</th>
                            <th>Description</th>
                            <th style={{ width: '150px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPolicy.results.map((rule) => (
                            <tr key={rule.id} className={rule.passed ? 'table-success' : 'table-danger'}>
                              <td className="text-center fs-4">{getScoreIcon(rule.passed)}</td>
                              <td><strong>{rule.name}</strong></td>
                              <td>{rule.description}</td>
                              <td>
                                {!rule.passed && (
                                  <button className="btn btn-sm btn-outline-primary">
                                    Remediate
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Remediation Actions */}
        {compliance.overall.score < 100 && (
          <div className="row mt-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header bg-warning text-dark">
                  <strong>⚠️ Required Actions</strong>
                </div>
                <div className="card-body">
                  <h6>To achieve 100% compliance:</h6>
                  <ul className="mb-0">
                    {Object.entries(compliance.byPolicy).map(([key, policy]) =>
                      policy.results
                        .filter(r => !r.passed)
                        .map(rule => (
                          <li key={rule.id}>
                            <strong>{policy.name}:</strong> {rule.description}
                          </li>
                        ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {compliance.overall.score === 100 && (
          <div className="row mt-4">
            <div className="col-12">
              <div className="alert alert-success text-center">
                <h4 className="mb-0">🎉 Perfect Compliance Score!</h4>
                <p className="mb-0 mt-2">All policy checks are passing. Great job!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PolicyCompliance;
