'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-base font-semibold text-gray-900 mb-1">
              Something went wrong
            </p>
            <p className="text-sm text-gray-500 mb-4">
              An unexpected error occurred while rendering this page.
            </p>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="text-[11px] text-left text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 mb-4 max-h-40 overflow-auto whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                this.reset();
                if (typeof window !== 'undefined') window.location.reload();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E]"
            >
              Try refreshing the page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
