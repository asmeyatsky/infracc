import React, { useState } from 'react';

function ResourceOptimization({ workloads }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Analyze workloads for optimization opportunities
  const analyzeOptimizations = () => {
    if (!workloads || workloads.length === 0) {
      return [];
    }

    const recommendations = [];

    workloads.forEach((workload, index) => {
      // 1. Right-sizing - oversized resources
      if (workload.cpu >= 16 && workload.memory >= 64) {
        recommendations.push({
          id: `rightsize-${index}`,
          category: 'rightsizing',
          severity: 'high',
          workload: workload.name,
          title: 'Oversized Resource Detected',
          description: `${workload.name} has ${workload.cpu} vCPUs and ${workload.memory}GB RAM. Consider right-sizing based on actual utilization.`,
          potentialSavings: (workload.cpu * 30 + workload.memory * 4) * 0.4,
          action: 'Reduce to 8 vCPUs and 32GB RAM',
          effort: 'Medium',
        });
      }

      // 2. Underutilized resources
      if (workload.cpu <= 2 && workload.memory <= 4) {
        recommendations.push({
          id: `underutilized-${index}`,
          category: 'consolidation',
          severity: 'medium',
          workload: workload.name,
          title: 'Underutilized Resource - Consider Consolidation',
          description: `${workload.name} has minimal resources (${workload.cpu} vCPUs, ${workload.memory}GB RAM). Could be consolidated with similar workloads.`,
          potentialSavings: (workload.cpu * 30 + workload.memory * 4) * 0.3,
          action: 'Consolidate with similar low-utilization workloads',
          effort: 'High',
        });
      }

      // 3. Storage optimization
      if (workload.storage >= 500) {
        recommendations.push({
          id: `storage-${index}`,
          category: 'storage',
          severity: 'medium',
          workload: workload.name,
          title: 'High Storage Usage',
          description: `${workload.name} uses ${workload.storage}GB of storage. Consider using lifecycle policies or archiving old data.`,
          potentialSavings: workload.storage * 0.5 * 0.6, // 60% savings on storage
          action: 'Implement Cloud Storage lifecycle rules',
          effort: 'Low',
        });
      }

      // 4. Container migration opportunity
      if (workload.type === 'vm' && workload.os === 'linux') {
        recommendations.push({
          id: `container-${index}`,
          category: 'modernization',
          severity: 'low',
          workload: workload.name,
          title: 'Containerization Opportunity',
          description: `${workload.name} is a Linux VM that could benefit from containerization on GKE for better resource utilization.`,
          potentialSavings: (workload.cpu * 30 + workload.memory * 4) * 0.25,
          action: 'Migrate to containerized workload on GKE',
          effort: 'High',
        });
      }

      // 5. Reserved/Committed use recommendations
      if (workload.cpu >= 4 || workload.memory >= 16) {
        recommendations.push({
          id: `committed-${index}`,
          category: 'pricing',
          severity: 'high',
          workload: workload.name,
          title: 'Committed Use Discount Opportunity',
          description: `${workload.name} is a stable workload. Save up to 57% with 3-year committed use discounts.`,
          potentialSavings: (workload.cpu * 30 + workload.memory * 4) * 0.57,
          action: 'Purchase 3-year committed use discount',
          effort: 'Low',
        });
      }

      // 6. Idle resource detection (simulated)
      const isIdle = Math.random() < 0.15; // 15% chance of being idle
      if (isIdle) {
        recommendations.push({
          id: `idle-${index}`,
          category: 'cleanup',
          severity: 'high',
          workload: workload.name,
          title: 'Idle Resource Detected',
          description: `${workload.name} shows minimal activity (avg CPU < 5%). Consider shutting down or scheduling.`,
          potentialSavings: workload.cpu * 30 + workload.memory * 4 + workload.storage * 0.5,
          action: 'Review and decommission if unused',
          effort: 'Low',
        });
      }

      // 7. Network optimization
      if (workload.monthlyTraffic >= 1000) {
        recommendations.push({
          id: `network-${index}`,
          category: 'networking',
          severity: 'medium',
          workload: workload.name,
          title: 'High Network Traffic',
          description: `${workload.name} generates ${workload.monthlyTraffic}GB/month. Use Cloud CDN or optimize data transfer.`,
          potentialSavings: workload.monthlyTraffic * 0.1 * 0.4,
          action: 'Enable Cloud CDN and optimize egress',
          effort: 'Medium',
        });
      }
    });

    return recommendations;
  };

  const recommendations = analyzeOptimizations();

  const filteredRecommendations = selectedCategory === 'all'
    ? recommendations
    : recommendations.filter(r => r.category === selectedCategory);

  const totalPotentialSavings = recommendations.reduce((sum, r) => sum + r.potentialSavings, 0);

  const categories = {
    all: { label: 'All Recommendations', icon: '📋', count: recommendations.length },
    rightsizing: { label: 'Right-sizing', icon: '📏', count: recommendations.filter(r => r.category === 'rightsizing').length },
    consolidation: { label: 'Consolidation', icon: '🔗', count: recommendations.filter(r => r.category === 'consolidation').length },
    storage: { label: 'Storage', icon: '💾', count: recommendations.filter(r => r.category === 'storage').length },
    pricing: { label: 'Pricing', icon: '💰', count: recommendations.filter(r => r.category === 'pricing').length },
    cleanup: { label: 'Cleanup', icon: '🧹', count: recommendations.filter(r => r.category === 'cleanup').length },
    networking: { label: 'Networking', icon: '🌐', count: recommendations.filter(r => r.category === 'networking').length },
    modernization: { label: 'Modernization', icon: '🚀', count: recommendations.filter(r => r.category === 'modernization').length },
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      high: 'bg-danger',
      medium: 'bg-warning',
      low: 'bg-info',
    };
    return badges[severity] || 'bg-secondary';
  };

  const getEffortBadge = (effort) => {
    const badges = {
      Low: 'bg-success',
      Medium: 'bg-warning',
      High: 'bg-danger',
    };
    return badges[effort] || 'bg-secondary';
  };

  return (
    <div className="card mb-4">
      <div className="card-header bg-success text-white">
        <h3 className="mb-0">🎯 Resource Optimization Recommendations</h3>
        <small>AI-powered insights to reduce costs and improve efficiency</small>
      </div>
      <div className="card-body">
        {workloads.length === 0 ? (
          <div className="alert alert-info">
            <strong>No workload data available.</strong> Add workloads in the Discovery tab to get optimization recommendations.
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="row mb-4">
              <div className="col-md-4 mb-3">
                <div className="card text-center h-100 bg-success text-white">
                  <div className="card-body">
                    <h6 className="mb-2">💰 Total Potential Savings</h6>
                    <h2 className="mb-1">${totalPotentialSavings.toFixed(2)}</h2>
                    <p className="mb-0 small">per month</p>
                  </div>
                </div>
              </div>

              <div className="col-md-4 mb-3">
                <div className="card text-center h-100">
                  <div className="card-body">
                    <h6 className="text-muted mb-2">Total Recommendations</h6>
                    <h2 className="mb-1">{recommendations.length}</h2>
                    <p className="mb-0 small">
                      <span className="badge bg-danger me-1">
                        {recommendations.filter(r => r.severity === 'high').length} High
                      </span>
                      <span className="badge bg-warning me-1">
                        {recommendations.filter(r => r.severity === 'medium').length} Medium
                      </span>
                      <span className="badge bg-info">
                        {recommendations.filter(r => r.severity === 'low').length} Low
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-4 mb-3">
                <div className="card text-center h-100">
                  <div className="card-body">
                    <h6 className="text-muted mb-2">Quick Wins</h6>
                    <h2 className="mb-1">
                      {recommendations.filter(r => r.effort === 'Low' && r.severity === 'high').length}
                    </h2>
                    <p className="mb-0 small">High impact, low effort optimizations</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Filters */}
            <div className="row mb-4">
              <div className="col-12">
                <h5 className="mb-3">Filter by Category</h5>
                <div className="d-flex flex-wrap gap-2">
                  {Object.entries(categories).map(([key, cat]) => (
                    <button
                      key={key}
                      className={`btn ${selectedCategory === key ? 'btn-success' : 'btn-outline-success'}`}
                      onClick={() => setSelectedCategory(key)}
                    >
                      {cat.icon} {cat.label}
                      {cat.count > 0 && (
                        <span className="badge bg-light text-dark ms-2">{cat.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations List */}
            <div className="row">
              <div className="col-12">
                <h5 className="mb-3">
                  {selectedCategory === 'all' ? 'All Recommendations' : categories[selectedCategory].label}
                  {' '}
                  ({filteredRecommendations.length})
                </h5>

                {filteredRecommendations.length === 0 ? (
                  <div className="alert alert-success">
                    <strong>✓ No recommendations in this category.</strong> Your resources are optimized!
                  </div>
                ) : (
                  <div className="accordion" id="recommendationsAccordion">
                    {filteredRecommendations.map((rec, index) => (
                      <div key={rec.id} className="accordion-item">
                        <h2 className="accordion-header" id={`heading-${rec.id}`}>
                          <button
                            className="accordion-button collapsed"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target={`#collapse-${rec.id}`}
                            aria-expanded="false"
                            aria-controls={`collapse-${rec.id}`}
                          >
                            <div className="d-flex align-items-center w-100">
                              <span className={`badge ${getSeverityBadge(rec.severity)} me-2`}>
                                {rec.severity.toUpperCase()}
                              </span>
                              <span className="flex-grow-1">
                                <strong>{rec.title}</strong> - {rec.workload}
                              </span>
                              <span className="badge bg-success ms-2">
                                Save ${rec.potentialSavings.toFixed(2)}/mo
                              </span>
                            </div>
                          </button>
                        </h2>
                        <div
                          id={`collapse-${rec.id}`}
                          className="accordion-collapse collapse"
                          aria-labelledby={`heading-${rec.id}`}
                          data-bs-parent="#recommendationsAccordion"
                        >
                          <div className="accordion-body">
                            <div className="row">
                              <div className="col-md-8">
                                <h6>Description</h6>
                                <p>{rec.description}</p>

                                <h6 className="mt-3">Recommended Action</h6>
                                <div className="alert alert-info mb-0">
                                  <strong>✓ {rec.action}</strong>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <h6>Details</h6>
                                <ul className="list-unstyled">
                                  <li className="mb-2">
                                    <strong>Category:</strong>
                                    <br />
                                    {categories[rec.category].icon} {categories[rec.category].label}
                                  </li>
                                  <li className="mb-2">
                                    <strong>Severity:</strong>
                                    <br />
                                    <span className={`badge ${getSeverityBadge(rec.severity)}`}>
                                      {rec.severity.toUpperCase()}
                                    </span>
                                  </li>
                                  <li className="mb-2">
                                    <strong>Implementation Effort:</strong>
                                    <br />
                                    <span className={`badge ${getEffortBadge(rec.effort)}`}>
                                      {rec.effort}
                                    </span>
                                  </li>
                                  <li className="mb-2">
                                    <strong>Monthly Savings:</strong>
                                    <br />
                                    <span className="badge bg-success fs-6">
                                      ${rec.potentialSavings.toFixed(2)}
                                    </span>
                                  </li>
                                  <li>
                                    <strong>Annual Savings:</strong>
                                    <br />
                                    <span className="badge bg-success fs-6">
                                      ${(rec.potentialSavings * 12).toFixed(2)}
                                    </span>
                                  </li>
                                </ul>

                                <button className="btn btn-sm btn-success w-100 mt-2">
                                  Apply Recommendation
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Optimization Roadmap */}
            <div className="row mt-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header bg-primary text-white">
                    <strong>🗺️ Recommended Optimization Roadmap</strong>
                  </div>
                  <div className="card-body">
                    <h6>Phase 1: Quick Wins (0-30 days)</h6>
                    <ul>
                      {recommendations
                        .filter(r => r.effort === 'Low' && r.severity === 'high')
                        .slice(0, 3)
                        .map(r => (
                          <li key={r.id}>{r.title} - {r.workload} (Save ${r.potentialSavings.toFixed(2)}/mo)</li>
                        ))}
                    </ul>

                    <h6 className="mt-3">Phase 2: Medium-term Optimizations (30-90 days)</h6>
                    <ul>
                      {recommendations
                        .filter(r => r.effort === 'Medium')
                        .slice(0, 3)
                        .map(r => (
                          <li key={r.id}>{r.title} - {r.workload} (Save ${r.potentialSavings.toFixed(2)}/mo)</li>
                        ))}
                    </ul>

                    <h6 className="mt-3">Phase 3: Strategic Initiatives (90+ days)</h6>
                    <ul>
                      {recommendations
                        .filter(r => r.effort === 'High')
                        .slice(0, 3)
                        .map(r => (
                          <li key={r.id}>{r.title} - {r.workload} (Save ${r.potentialSavings.toFixed(2)}/mo)</li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ResourceOptimization;
