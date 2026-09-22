import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * ErrorBoundary Component
 * Protects against unexpected runtime crashes and prevents white blank screen failures.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[POS ErrorBoundary caught an unhandled error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card p-6 text-center m-4" style={{ maxWidth: '600px', margin: '40px auto' }}>
          <div className="brand-icon-badge mx-auto mb-3" style={{ background: '#fee2e2' }}>
            <AlertTriangle size={36} className="text-danger" />
          </div>
          <h3 className="text-main font-weight-800 mb-2">Display Error Recovered</h3>
          <p className="text-muted text-xs mb-3">
            A rendering issue was detected in this view. Your stored business data and inventory are completely safe.
          </p>
          <div className="p-3 bg-light rounded text-left font-mono text-xs mb-4" style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {this.state.error?.message || 'Unknown runtime error'}
          </div>
          <button
            type="button"
            className="btn btn-primary flex-align-center gap-2 mx-auto"
            onClick={this.handleReset}
          >
            <RotateCcw size={16} /> Reload Current View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
