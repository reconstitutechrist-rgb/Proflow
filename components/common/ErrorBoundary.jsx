import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Report to error tracking service if available
    if (window.errorTracker) {
      window.errorTracker.captureException(error, {
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { minimal = false, showDetails = false } = this.props;

      // Minimal error display for small components
      if (minimal) {
        return (
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Failed to load component</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={this.handleReset}
              className="mt-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Try Again
            </Button>
          </div>
        );
      }

      // Full error display
      return (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>

              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                Something went wrong
              </h3>

              <p className="text-red-700 dark:text-red-300 mb-6 max-w-md">
                We encountered an unexpected error. This has been logged and we'll look into it.
              </p>

              {/* Error count warning */}
              {this.state.errorCount > 2 && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-800 dark:text-red-200">
                  ⚠️ This component has crashed {this.state.errorCount} times. There may be a
                  persistent issue.
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>

                <Button
                  onClick={() => (window.location.href = '/')}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>

              {/* Show error details if requested */}
              {showDetails && this.state.error && (
                <details className="mt-6 p-4 bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg text-left w-full max-w-2xl">
                  <summary className="font-semibold cursor-pointer text-red-900 dark:text-red-100 mb-2">
                    Error Details
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">
                        Error Message:
                      </p>
                      <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap break-all p-2 bg-red-50 dark:bg-red-950 rounded">
                        {this.state.error.toString()}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">
                          Component Stack:
                        </p>
                        <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap break-all p-2 bg-red-50 dark:bg-red-950 rounded max-h-48 overflow-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Help text */}
              <p className="text-xs text-red-600 dark:text-red-400 mt-6">
                If this problem persists, please contact support with the error details above.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
