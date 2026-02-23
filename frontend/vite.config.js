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
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    // Target modern browsers including mobile Safari
    target: ['es2015', 'safari11'],
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep React and ReactDOM together in one chunk
          'react-vendor': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          'ui': ['react-bootstrap', 'bootstrap'],
          'icons': ['react-icons'],
          'charts': ['chart.js', 'react-chartjs-2'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000,
    // Ensure compatibility with older mobile browsers
    cssCodeSplit: true,
    // Improve mobile performance
    reportCompressedSize: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    // Force optimization of these packages for mobile
    esbuildOptions: {
      target: 'es2015',
    },
  },
  base: '/',
  // Ensure proper MIME types for mobile
  assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.eot'],
});
