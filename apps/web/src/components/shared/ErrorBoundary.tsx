import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
    // Also send to backend
    fetch('http://localhost:3000/api/v1/error-log?msg=' + encodeURIComponent(error.message + ' | ' + error.stack));
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ color: '#d32f2f' }}>Something went wrong.</h1>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1rem', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Retry</button>
            <button onClick={() => window.location.href = '/dashboard'} style={{ padding: '0.5rem 1rem', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Go to Dashboard</button>
          </div>
          <div style={{ marginTop: '2rem', background: '#ffebee', padding: '1rem', borderRadius: '4px', overflowX: 'auto' }}>
            <h3 style={{ color: '#c62828', marginTop: 0 }}>Root Cause:</h3>
            <pre style={{ fontSize: '14px', color: '#b71c1c' }}>
              {this.state.error && this.state.error.toString()}
            </pre>
            <pre style={{ fontSize: '12px', color: '#d32f2f', marginTop: '1rem' }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
