// ErrorBoundary (Phase 14) — the app-wide safety net. A render error in any descendant otherwise
// white-screens the whole SPA; this class component catches it (getDerivedStateFromError +
// componentDidCatch) and shows a recoverable fallback instead. Kept deliberately dependency-light
// (React + one co-located stylesheet, bundled with this module) so it can sit at the very top of
// the tree and can't itself crash on a bad import. Note: boundaries catch render errors, NOT
// async/event-handler errors — those surface via toasts (Phase 15).
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '@/lib/reportError';
import { logger } from '@/lib/logger';
import './error-boundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  // Optional custom fallback; receives a reset() to clear the error and re-render the subtree.
  fallback?: (reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
    // Phase 40: also route through the logger so render errors reach the dev terminal (and shipping).
    logger.error('react render error', {
      message: error.message,
      componentStack: info.componentStack,
    });
    // Env-gated telemetry (Phase 33) — a no-op unless VITE_ERROR_REPORTING_DSN is set.
    reportError(error, { componentStack: info.componentStack });
  }

  reset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);

    // Fallback styled by the co-located error-boundary.css (bundled with this module, so it's
    // available even when the rest of the tree is broken).
    return (
      <div role="alert" className="error-boundary-fallback">
        <h1 className="error-boundary-title">Something went wrong</h1>
        <p className="error-boundary-message">
          An unexpected error occurred. You can try again, or reload the page if the problem
          persists.
        </p>
        <div className="error-boundary-actions">
          <button
            type="button"
            className="error-boundary-btn error-boundary-btn--primary"
            onClick={this.reset}
          >
            Try again
          </button>
          <button
            type="button"
            className="error-boundary-btn error-boundary-btn--secondary"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
