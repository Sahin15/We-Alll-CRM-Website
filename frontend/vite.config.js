import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      // We manage manifests manually (manifest.json + manifest-pwa.json)
      // so disable the auto-injected manifest to avoid conflicts
      manifest: false,
      injectRegister: "auto",
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallbackDenylist: [],
        cleanupOutdatedCaches: true,
        // Do not cache API calls — stale responses broke salary, attendance, and other live data
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: "oxc",
    target: ["es2015", "safari11"],
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react/"))
              return "react-vendor";
            if (id.includes("react-router")) return "react-router";
            if (
              id.includes("react-bootstrap") ||
              id.includes("bootstrap")
            )
              return "ui";
            if (id.includes("react-icons")) return "icons";
            if (id.includes("chart.js") || id.includes("react-chartjs"))
              return "charts";
          }
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    reportCompressedSize: false,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
  base: "/",
  assetsInclude: ["**/*.woff", "**/*.woff2", "**/*.ttf", "**/*.eot"],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
  },
});
