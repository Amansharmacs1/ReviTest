import React from 'react';
import Card from './Card';
import Button from './Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
          <Card className="max-w-md w-full p-8 text-center space-y-5 shadow-elevated border border-rose-200">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-navy">Something went wrong</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                An unexpected interface error occurred. You can reload the page or navigate back to safety.
              </p>
              {this.state.error && (
                <div className="mt-2 p-2.5 bg-slate-100 rounded text-[11px] font-mono text-slate-700 text-left overflow-x-auto max-h-32">
                  {this.state.error.message || String(this.state.error)}
                </div>
              )}
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Button variant="outline" size="md" onClick={() => (window.location.href = '/')}>
                Home
              </Button>
              <Button variant="primary" size="md" icon={RefreshCw} onClick={this.handleReload}>
                Reload Page
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
