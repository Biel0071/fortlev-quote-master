import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { StoreProvider } from "@/contexts/StoreContext";

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  
  // Use a micro-task to defer non-critical initialization
  queueMicrotask(() => {
    root.render(
      <React.StrictMode>
        <StoreProvider>
          <App />
        </StoreProvider>
      </React.StrictMode>
    );
  });
}

