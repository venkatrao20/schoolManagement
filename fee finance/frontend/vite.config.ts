import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // The Hub launches the Fee Finance API on 5004. Override this for a
        // different API endpoint with FEE_API_URL=http://host:port.
        target: process.env.FEE_API_URL || 'http://127.0.0.1:5004',
        changeOrigin: true,
      },
    },
  },
});
