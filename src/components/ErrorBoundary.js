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

      // Default fallback UI
      return (
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
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
