/**
 * Unified Layout Component
 * 
 * Modern, cohesive layout for the entire application
 */

import React from 'react';
import './Layout.css';

function Layout({ children, header, sidebar }) {
  return (
    <div className="unified-layout">
      {header && (
        <header className="unified-header">
          {header}
        </header>
      )}
      <div className="unified-content">
        {sidebar && (
          <aside className="unified-sidebar">
            {sidebar}
          </aside>
        )}
        <main className="unified-main">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
