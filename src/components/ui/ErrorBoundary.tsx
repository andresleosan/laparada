// src/components/ui/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <AlertCircle className="h-12 w-12 text-status-error mb-4" />
            <h2 className="text-lg font-semibold text-neutral-50 mb-2">
              Algo salió mal
            </h2>
            <p className="text-sm text-neutral-400 mb-6 max-w-xs">
              Ocurrió un error inesperado. Por favor, recarga la página e intenta de nuevo.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="w-full max-w-md text-left">
                <summary className="cursor-pointer font-mono text-xs text-neutral-500 mb-2">
                  Detalles técnicos (solo desarrollo)
                </summary>
                <pre className="bg-neutral-800 p-3 rounded text-xs text-neutral-300 overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-gold-400 text-base-dark font-medium rounded-lg hover:bg-gold-500 transition-colors"
            >
              Recargar página
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
