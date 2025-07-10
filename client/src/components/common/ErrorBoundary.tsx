import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <AlertTriangle size={48} className="error-boundary-icon" />
            <h2 className="headline-2">Something went wrong</h2>
            <p className="body-text error-boundary-message">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details className="error-boundary-details">
                <summary>Technical details</summary>
                <pre>{this.state.error.toString()}</pre>
              </details>
            )}
            <button onClick={this.handleReset} className="btn btn-primary">
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Add error boundary styles
const styles = `
.error-boundary {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  background-color: var(--color-background-light);
}

.error-boundary-content {
  text-align: center;
  max-width: 500px;
  padding: var(--spacing-xl);
  background-color: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.error-boundary-icon {
  color: var(--color-error);
  margin-bottom: var(--spacing-lg);
}

.error-boundary-message {
  margin-bottom: var(--spacing-lg);
  color: var(--color-gray-600);
}

.error-boundary-details {
  margin: var(--spacing-lg) 0;
  text-align: left;
  padding: var(--spacing-md);
  background-color: var(--color-gray-100);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.error-boundary-details summary {
  cursor: pointer;
  font-weight: 500;
  margin-bottom: var(--spacing-sm);
}

.error-boundary-details pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  color: var(--color-gray-700);
}
`;

export const errorBoundaryStyles = styles; 