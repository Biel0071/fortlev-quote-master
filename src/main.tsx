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
    console.error("Critical app error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-white p-6 text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold text-gray-900">Ops! Algo deu errado.</h1>
            <p className="mt-3 text-gray-600">Ocorreu um erro inesperado ao carregar o sistema. Por favor, tente recarregar.</p>
            <button 
              onClick={() => {
                // Clear state and reload
                try {
                  sessionStorage.clear();
                  localStorage.removeItem("supabase.auth.token");
                } catch(e) {}
                window.location.reload();
              }} 
              className="mt-6 inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all"
            >
              Recarregar e Limpar Cache
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
  try {
    const root = ReactDOM.createRoot(rootElement);
    
    // Immediate render to prevent white screen
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <StoreProvider>
            <App />
          </StoreProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    console.error("Critical error during initial mount:", err);
    // Fallback UI if ReactDOM fails
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display:flex;height:100vh;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;text-align:center;padding:20px;">
          <h2>Erro de Inicialização</h2>
          <p>O navegador não conseguiu carregar os recursos necessários.</p>
          <button onclick="location.reload()" style="padding:10px 20px;border-radius:20px;background:#2563eb;color:white;border:none;cursor:pointer;font-weight:bold;">Tentar Novamente</button>
        </div>
      `;
    }
  }
}


