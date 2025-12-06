import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // Relative paths for easy deployment anywhere
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor', '@monaco-editor/react'],
          aggrid: ['ag-grid-community', 'ag-grid-react'],
          vendor: ['react', 'react-dom', 'zustand', 'immer'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
});

