import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Ensure base path is set correctly for SPA
  server: {
    host: true,
    https: false, // Disabled due to mobile certificate issues - geolocation won't work on mobile via IP
    cors: true,
    strictPort: true,
    port: 5173, // Default Vite port
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable source maps for production
    minify: 'esbuild', // Use default esbuild minifier instead of terser
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      },
    },
    // Ensure the build fails if there are errors
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
  },
  preview: {
    port: 5173,
    host: true,
    strictPort: true,
  },
})
