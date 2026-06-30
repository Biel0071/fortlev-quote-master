import React, { Component, ErrorInfo, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const STALE_APP_RELOAD_KEY = "storefront_stale_app_reload_at";
const STALE_APP_RETRY_MS = 60_000;

const getErrorText = (reason: unknown) => {
  if (reason instanceof Error) return `${reason.name} ${reason.message} ${reason.stack ?? ""}`;
  if (typeof reason === "string") return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
};

const isStaleAppAssetError = (reason: unknown) => {
  const text = getErrorText(reason);
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|chunkloaderror|loading chunk \d+ failed|module script/i.test(text);
};

const clearStalePwaCache = async () => {
  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    if ("serviceWorker" in navigator) {
      const hadController = Boolean(navigator.serviceWorker.controller);
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      const alreadyReset = new URLSearchParams(window.location.search).has("pwa_reset");
      if (hadController && !alreadyReset) {
        const resetUrl = new URL(window.location.href);
        resetUrl.searchParams.set("pwa_reset", String(Date.now()));
        window.location.replace(resetUrl.toString());
      }
    }
  } catch {
    // Cache cleanup must never block React from rendering.
  }
};

const recoverFromStaleAppAssets = async () => {
  try {
    const lastAttempt = Number(sessionStorage.getItem(STALE_APP_RELOAD_KEY) || 0);
    if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < STALE_APP_RETRY_MS) return false;
    sessionStorage.setItem(STALE_APP_RELOAD_KEY, String(Date.now()));
    await clearStalePwaCache();
    const resetUrl = new URL(window.location.href);
    resetUrl.searchParams.set("app_refresh", String(Date.now()));
    window.location.replace(resetUrl.toString());
    return true;
  } catch {
    window.location.reload();
    return true;
  }
};

// Global error handlers for absolute resilience
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Global window error:", { message, source, lineno, colno, error });
  if (isStaleAppAssetError(error || message)) void recoverFromStaleAppAssets();
};

window.onunhandledrejection = (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  if (isStaleAppAssetError(event.reason)) void recoverFromStaleAppAssets();
};

void clearStalePwaCache();

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; errorInfo: string; isRecovering: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: "", isRecovering: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorInfo: error.message, isRecovering: isStaleAppAssetError(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical app error caught by Boundary:", error, errorInfo);
    if (isStaleAppAssetError(error)) {
      void recoverFromStaleAppAssets().then((started) => {
        if (started) this.setState({ isRecovering: true });
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-6 text-center text-foreground">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold">{this.state.isRecovering ? "Atualizando sistema" : "Sistema em Manutenção"}</h1>
            <p className="mt-3 text-muted-foreground">
              {this.state.isRecovering
                ? "Ajustando a versão carregada no navegador. A página será reaberta automaticamente."
                : "Estamos otimizando a sua experiência. Se a tela continuar branca, recarregue o sistema."}
            </p>
            {this.state.errorInfo && (
              <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-muted p-3 text-left text-[10px] text-muted-foreground">
                {this.state.errorInfo}
              </pre>
            )}
            {!this.state.isRecovering ? (
              <button
                onClick={() => void recoverFromStaleAppAssets()}
                className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all active:scale-95"
              >
                Recarregar sistema
              </button>
            ) : null}
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
