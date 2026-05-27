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


// Critical: Clear problematic service workers or cache that could cause white screen
try {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        registration.unregister();
      }
    });
  }
} catch (e) {}

const rootElement = document.getElementById("root");
if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    
    // Immediate render. Removing StrictMode for maximum compatibility in this high-performance context
    root.render(
      <ErrorBoundary>
        <StoreProvider>
          <App />
        </StoreProvider>
      </ErrorBoundary>
    );
  } catch (err) {
    console.error("Critical mount error:", err);
    rootElement.innerHTML = `
      <div style="display:flex;height:100vh;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;text-align:center;background:white;padding:20px;">
        <h2 style="margin-bottom:10px;">Sistema em Manutenção</h2>
        <p style="color:#666;margin-bottom:20px;">Estamos otimizando o carregamento. Por favor, tente recarregar.</p>
        <button onclick="localStorage.clear();sessionStorage.clear();location.reload();" style="padding:12px 24px;border-radius:30px;background:#2563eb;color:white;border:none;cursor:pointer;font-weight:bold;box-shadow:0 4px 6px rgba(0,0,0,0.1);">Recarregar Sistema</button>
      </div>
    `;
  }
}


