import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error('LITERIA Application Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6 text-stone-800">
          <div className="max-w-md w-full bg-white border border-stone-200 rounded-xl p-8 shadow-sm text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-serif text-xl">
              L
            </div>
            <h2 className="text-xl font-serif font-semibold text-stone-900 mb-2">
              Something interrupted your writing
            </h2>
            <p className="text-sm text-stone-500 mb-6 leading-relaxed">
              LITERIA encountered an unexpected issue. Your local drafts are safe in local storage.
            </p>
            {this.state.error?.message && (
              <div className="text-xs text-stone-400 bg-stone-50 p-3 rounded font-mono text-left mb-6 overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
