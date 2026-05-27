import React, { Component, ErrorInfo, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { StoreProvider } from "@/contexts/StoreContext";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
          <h1 className="text-xl font-bold">Algo deu errado.</h1>
          <p className="mt-2 text-muted-foreground">Tente recarregar a página ou limpe o cache do navegador.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground font-semibold"
          >
            Recarregar Site
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  
  // Render directly to avoid white screen on micro-task delays
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <StoreProvider>
          <App />
        </StoreProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
