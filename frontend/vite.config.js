import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite chuyển tiếp /api/* sang backend Express ở cổng 3000 (mục 4.3.3)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});
