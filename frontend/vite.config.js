import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During dev, proxy /api to the backend on :3000.
// In production the backend serves the built dist/ directly.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
