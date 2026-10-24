import React from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Postify Uncaught Runtime Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false
    });
    window.location.reload();
  };

  handleCopy = () => {
    const errorDetails = `Postify Error Report:
Error: ${this.state.error?.toString()}
Component Stack: ${this.state.errorInfo?.componentStack || 'N/A'}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}`;

    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, copied, showDetails } = this.state;

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[var(--portal-canvas)] text-[var(--portal-text)] transition-colors duration-200">
          <div className="w-full max-w-xl mx-auto">
            {/* Card Container */}
            <div className="p-6 sm:p-10 rounded-[26px] bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-2xl relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-[#007aff]/10 rounded-full blur-3xl pointer-events-none" />

              {/* Status Header */}
              <div className="relative z-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center mb-5 ring-8 ring-rose-500/5">
                  <AlertTriangle className="w-8 h-8" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 mb-3">
                  <span>Application Runtime Error</span>
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--portal-heading)] mb-3">
                  Something Went Sideways
                </h1>

                <p className="text-sm text-[var(--portal-meta)] max-w-md mx-auto leading-relaxed mb-6">
                  Postify encountered an unexpected condition while rendering this page. We've isolated the fault to preserve your local session.
                </p>

                {/* Primary Actions */}
                <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto mb-6">
                  <button
                    onClick={this.handleReset}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#007aff] hover:bg-[#0066d6] text-white text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reload Page</span>
                  </button>

                  <a
                    href="/"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[var(--portal-heading)] text-sm font-semibold transition-all active:scale-95 border border-[var(--portal-card-border)]"
                  >
                    <Home className="w-4 h-4" />
                    <span>Return to Feed</span>
                  </a>
                </div>

                {/* Technical Diagnostics Accordion */}
                <div className="w-full mt-2 pt-6 border-t border-[var(--portal-card-border)] text-left">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => this.setState({ showDetails: !showDetails })}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--portal-meta)] hover:text-[var(--portal-text)] transition-colors"
                    >
                      <span>Technical Diagnostics</span>
                      {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={this.handleCopy}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#007aff] hover:underline"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500">Copied to Clipboard</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Diagnostics</span>
                        </>
                      )}
                    </button>
                  </div>

                  {showDetails && (
                    <div className="mt-3 p-3.5 rounded-xl bg-zinc-950 text-zinc-300 font-mono text-xs overflow-x-auto max-h-48 border border-zinc-800">
                      <div className="text-rose-400 font-semibold mb-1">
                        {error?.toString() || 'Unknown Error'}
                      </div>
                      {errorInfo?.componentStack && (
                        <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed">
                          {errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  )}
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
