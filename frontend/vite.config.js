import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild', // Changed from 'terser' to 'esbuild' (faster and built-in)
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          // Router
          if (id.includes('node_modules/react-router-dom')) {
            return 'router';
          }
          // UI Libraries
          if (id.includes('node_modules/react-bootstrap') || id.includes('node_modules/bootstrap')) {
            return 'ui-bootstrap';
          }
          // Icons
          if (id.includes('node_modules/react-icons')) {
            return 'icons';
          }
          // Charts
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2') || id.includes('node_modules/recharts')) {
            return 'charts';
          }
          // Calendar
          if (id.includes('node_modules/react-big-calendar') || id.includes('node_modules/moment')) {
            return 'calendar';
          }
          // Utilities
          if (id.includes('node_modules/axios') || id.includes('node_modules/date-fns')) {
            return 'utils';
          }
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Optimize chunk sizes
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: []
  },
  base: '/', // Ensure assets are loaded from root
});
