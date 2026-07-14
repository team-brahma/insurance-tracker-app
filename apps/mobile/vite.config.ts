import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '@components': resolve(import.meta.dirname, './src/components'),
      '@features': resolve(import.meta.dirname, './src/features'),
      '@pages': resolve(import.meta.dirname, './src/pages'),
      '@layouts': resolve(import.meta.dirname, './src/layouts'),
      '@hooks': resolve(import.meta.dirname, './src/hooks'),
      '@services': resolve(import.meta.dirname, './src/services'),
      '@contexts': resolve(import.meta.dirname, './src/contexts'),
      '@routes': resolve(import.meta.dirname, './src/routes'),
      '@utils': resolve(import.meta.dirname, './src/utils'),
      '@types': resolve(import.meta.dirname, './src/types'),
      '@assets': resolve(import.meta.dirname, './src/assets'),
      '@styles': resolve(import.meta.dirname, './src/styles'),
      '@config': resolve(import.meta.dirname, './src/config'),
    },
  },

  // Ionic Web Components require explicit pre-bundling for fast dev startup
  optimizeDeps: {
    include: [
      '@ionic/react',
      '@ionic/react-router',
      'react-router',
      'react-router-dom',
      'ionicons',
    ],
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env['VITE_API_BASE_URL'] ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/')) {
              return 'react-vendor';
            }
            if (id.includes('@ionic/react') || id.includes('ionicons')) {
              return 'ionic-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (
              id.includes('@mui/material') ||
              id.includes('@emotion/react') ||
              id.includes('@emotion/styled')
            ) {
              return 'mui-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
          }
        },
      },
    },
  },
});
