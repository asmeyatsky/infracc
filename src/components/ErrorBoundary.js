/**
 * Error Boundary Component
 * 
 * Catches React errors and displays fallback UI
 * Essential for production error handling
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to error reporting service (e.g., Sentry)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Optionally reload the app or navigate to a safe page
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Get crash logs count
      let crashLogsCount = 0;
      try {
        const logs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
        crashLogsCount = logs.length;
      } catch (e) {
        // Ignore
      }

      // Default fallback UI
      return (
        <div style={{ minHeight: '100vh', position: 'relative' }}>
          {/* Crash Logs Button - Always visible on error screen, fixed position */}
          <div style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 999999 }}>
            <button 
              onClick={() => {
                try {
                  const logs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
                  const modal = document.getElementById('crash-logs-modal');
                  const content = document.getElementById('crash-logs-content');
                  const countSpan = document.getElementById('modal-logs-count');
                  
                  if (logs.length === 0) {
                    content.textContent = 'No crash logs found.';
                  } else {
                    content.textContent = logs.slice().reverse().join('\n\n');
                  }
                  
                  countSpan.textContent = logs.length;
                  modal.style.display = 'block';
                } catch (e) {
                  alert('Error loading crash logs: ' + e.message);
                }
              }}
              style={{
                backgroundColor: '#ffc107',
                color: '#000',
                border: '1px solid #ffc107',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                marginRight: '5px'
              }}
            >
              📋 View Crash Logs ({crashLogsCount})
            </button>
          </div>

          <div className="container mt-5">
            <div className="row justify-content-center">
              <div className="col-md-8">
                <div className="card border-danger">
                  <div className="card-header bg-danger text-white">
                    <h4 className="mb-0">⚠️ Something went wrong</h4>
                  </div>
                  <div className="card-body">
                    <p className="text-danger">
                      An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
                    </p>
                    <p className="text-muted" style={{ fontSize: '14px', marginTop: '10px' }}>
                      💡 Click "View Crash Logs" in the top-right corner to see detailed error information.
                    </p>
                    
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                      <details className="mt-3">
                        <summary className="cursor-pointer">Error Details (Development Only)</summary>
                        <pre className="mt-2 p-2 bg-light border rounded" style={{ fontSize: '12px', overflow: 'auto' }}>
                          {this.state.error.toString()}
                          {this.state.errorInfo && (
                            <>
                              <br />
                              <br />
                              {this.state.errorInfo.componentStack}
                            </>
                          )}
                        </pre>
                      </details>
                    )}

                    <div className="mt-4">
                      <button 
                        className="btn btn-primary me-2" 
                        onClick={this.handleReset}
                      >
                        Try Again
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => window.location.reload()}
                      >
                        Reload Page
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
