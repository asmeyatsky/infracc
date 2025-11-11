import React from 'react';

const Navigation = React.memo(({ activeTab, onTabChange, workloadsCount, hasLandingZone }) => {
  const tabs = [
    { id: 'discovery', icon: '🔍', label: 'Discovery' },
    { id: 'strategy', icon: '🎯', label: 'Strategy', badge: workloadsCount },
    { id: 'landingzone', icon: '🏗️', label: 'Landing Zone' },
    { id: 'terraform', icon: '📦', label: 'Terraform', disabled: !hasLandingZone, badge: hasLandingZone ? '✓' : null },
    { id: 'finops', icon: '📊', label: 'FinOps' },
    { id: 'tco', icon: '💰', label: 'TCO Calculator' },
  ];

  return (
    <div className="row mb-4">
      <div className="col-12">
        <ul className="nav nav-pills nav-fill" role="tablist" aria-label="Main navigation">
          {tabs.map(tab => (
            <li className="nav-item" key={tab.id} role="presentation">
              <button
                className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => onTabChange(tab.id)}
                disabled={tab.disabled}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                id={`${tab.id}-tab`}
              >
                {tab.icon} {tab.label}
                {tab.badge && (
                  <span className="badge bg-light text-dark ms-2">{tab.badge}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});

Navigation.displayName = 'Navigation';

export default Navigation;
