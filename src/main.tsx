import React, { Component, ErrorInfo, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handlers for absolute resilience
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Global window error:", { message, source, lineno, colno, error });
};

window.onunhandledrejection = (event) => {
  console.error("Unhandled promise rejection:", event.reason);
};

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; errorInfo: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical app error caught by Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-white p-6 text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold text-gray-900">Sistema em Manutenção</h1>
            <p className="mt-3 text-gray-600">
              Estamos otimizando a sua experiência. Se a tela continuar branca, tente limpar o cache.
            </p>
            {this.state.errorInfo && (
              <pre className="mt-4 overflow-auto rounded-lg bg-gray-50 p-3 text-left text-[10px] text-gray-400">
                {this.state.errorInfo}
              </pre>
            )}
            <button 
              onClick={() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                  // Try to unregister any problematic service workers
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                      for (let reg of registrations) reg.unregister();
                    });
                  }
                } catch(e) {}
                window.location.href = window.location.origin + "?cache_clear=" + Date.now();
              }} 
              className="mt-6 inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 transition-all active:scale-95"
            >
              Recarregar e Limpar Tudo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  
  // High-performance, highly-resilient render
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
