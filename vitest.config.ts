import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'src/pages/**/__tests__/**',
      '**/node_modules/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
        '.next/',
      ],
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      {
        find: path.resolve(__dirname, 'functions/pdf-worker/src/lib/pdfTemplateBuilder'),
        replacement: path.resolve(__dirname, 'src/lib/pdfTemplateBuilder'),
      },
      {
        find: path.resolve(__dirname, 'functions/pdf-worker/node_modules/node-appwrite/dist/index.mjs'),
        replacement: path.resolve(__dirname, 'node_modules/node-appwrite/dist/index.mjs'),
      },
      {
        find: path.resolve(__dirname, 'functions/pdf-worker/node_modules/node-appwrite/dist/index.js'),
        replacement: path.resolve(__dirname, 'node_modules/node-appwrite/dist/index.js'),
      },
    ],
  },
});
