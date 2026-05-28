/// <reference types="vitest" />

import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import viteTsConfigPaths from 'vite-tsconfig-paths';


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [angular(), viteTsConfigPaths()],
  optimizeDeps: {
    include: ['@angular/compiler', '@angular/localize/init'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
  },
  define: {
    'import.meta.vitest': mode !== 'production',
  },
}));
