import { defineConfig, PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

// Helper to keep manualChunks logic tidy
const manualChunks = (id: string) => {
  if (id.includes('node_modules')) {
    if (id.includes('antd')) return 'vendor-ui';
    if (id.includes('@ant-design/icons')) return 'vendor-icons';
    if (id.includes('recharts')) return 'vendor-charts';
    if (id.includes('react-router')) return 'vendor-router';
    if (id.includes('dayjs') || id.includes('date-fns')) return 'vendor-date';
    if (id.includes('zustand')) return 'vendor-state';
    return 'vendor'; // fallback bucket
  }
};

export default defineConfig({
  plugins: [react() as PluginOption],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  define: {
    'process.env': {}
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks,
      },
  // NOTE: Rely on default treeshake so that side-effectful style imports from antd etc. are preserved.
    }
  },
  optimizeDeps: {
    // Pre-bundle heavy deps explicitly (optional but can speed dev server cold start)
    include: ['react', 'react-dom', 'react-router-dom', 'antd', 'recharts']
  }
});