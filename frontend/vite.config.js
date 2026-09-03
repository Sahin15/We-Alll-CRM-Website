import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: false,
      injectRegister: "auto",
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /\/assets\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "assets-cache",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        // Use 127.0.0.1 — `localhost` can resolve to ::1 on Windows and fail
        // with ECONNREFUSED when the backend listens on IPv4 only.
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:5000",
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
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            if (id.includes("/pages/procurement/")) return "procurement";
            if (id.includes("/pages/projects/ProjectWorkspace")) return "project-workspace";
            if (id.includes("/pages/projects/")) return "projects";
            if (id.includes("/pages/calendar/")) return "calendar";
            if (id.includes("/pages/assets/")) return "assets";
            if (id.includes("/pages/licenses/")) return "licenses";
            if (id.includes("/pages/reports/")) return "reports";
            if (id.includes("/pages/hr/Hiring")) return "hiring";
            if (id.includes("/components/hr/EmployeeProfileManagement"))
              return "employee-profile";
            if (id.includes("/components/admin/Enhanced")) return "admin-tools";
            // Per-role dashboard chunks (do NOT merge all dashboards into one ~700KB file)
            if (id.includes("/pages/dashboard/AdminDashboard")) return "dashboard-admin";
            if (id.includes("/pages/dashboard/SuperAdminDashboard"))
              return "dashboard-superadmin";
            if (id.includes("/pages/dashboard/HRDashboard")) return "dashboard-hr";
            if (id.includes("/pages/employee/EmployeeDashboard"))
              return "dashboard-employee";
            if (id.includes("/pages/hod/HoDDashboard")) return "dashboard-hod";
            if (id.includes("/pages/dashboard/")) return "dashboard-other";
            if (id.includes("/pages/attendance/")) return "attendance-pages";
            if (id.includes("/pages/expenses/")) return "expenses";
            return undefined;
          }

          if (id.includes("firebase")) return "firebase";
          if (id.includes("chart.js") || id.includes("react-chartjs-2"))
            return "charts";
          if (id.includes("recharts")) return "recharts";
          if (id.includes("xlsx")) return "xlsx";
          if (
            id.includes("jspdf") ||
            id.includes("jspdf-autotable") ||
            id.includes("html2canvas")
          )
            return "pdf-export";
          if (id.includes("react-big-calendar") || id.includes("moment"))
            return "calendar-libs";
          if (id.includes("react-dom") || id.match(/[/\\]react[/\\]/))
            return "react-vendor";
          if (id.includes("react-router")) return "react-router";
          if (
            id.includes("react-bootstrap") ||
            id.includes("bootstrap")
          )
            return "ui";
          if (id.includes("react-icons")) return "icons";
          if (id.includes("date-fns")) return "date-fns";
          if (id.includes("axios")) return "axios";
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
    chunkSizeWarningLimit: 1500,
    cssCodeSplit: true,
    reportCompressedSize: true,
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
