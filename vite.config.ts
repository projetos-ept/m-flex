import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("proxyReq", (proxyRequest, request) => {
            // Translate only Vite's own origin; retain foreign origins for API rejection.
            if (request.headers.origin === `http://${request.headers.host}`)
              proxyRequest.setHeader("Origin", "http://127.0.0.1:8787");
          });
        },
      },
    },
  },
  build: { target: "es2022", chunkSizeWarningLimit: 1500 },
});
