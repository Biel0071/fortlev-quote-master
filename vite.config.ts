import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import https from "node:https";
import { componentTagger } from "lovable-tagger";
// VitePWA removed to avoid caching issues causing white screens
// import { VitePWA } from "vite-plugin-pwa";

const vpsKeepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 64,
  rejectUnauthorized: false,
});

const vpsStoreProxy = {
  target: "https://209.50.241.22",
  changeOrigin: true,
  secure: false,
  agent: vpsKeepAliveAgent,
  headers: {
    Host: "loja.209-50-241-22.sslip.io",
    Connection: "keep-alive",
  },
};

const sharedProxy = {
  "/rest/v1": vpsStoreProxy,
  "/auth/v1": vpsStoreProxy,
  "/storage/v1": vpsStoreProxy,
  "/functions/v1": vpsStoreProxy,
  "/api/store-publish": vpsStoreProxy,
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: sharedProxy,
  },
  preview: {
    host: "::",
    port: 8081,
    proxy: sharedProxy,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // VitePWA disabled to prevent offline cache conflicts and white screen issues

  ].filter(Boolean),
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    minify: "esbuild",
    // NOTE: do NOT add manualChunks that split React from libs that depend on it
    // (radix, react-router, @tanstack, etc.). It causes
    // "Cannot read properties of undefined (reading 'forwardRef')" in production
    // due to module init order. Let Rollup handle chunking automatically.
    chunkSizeWarningLimit: 1500,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
