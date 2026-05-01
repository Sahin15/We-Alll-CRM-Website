import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "We Alll Office",
        short_name: "We Alll",
        start_url: "/app",
        display: "standalone",
        theme_color: "#6366F1",
        background_color: "#ffffff",
        icons: [
          {
            src: "/Wealll_mini.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/Wealll_mini.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkFirst",
            options: {
              networkTimeoutSeconds: 5,
              cacheName: "api-cache",
            },
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
