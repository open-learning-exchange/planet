/// <reference types="vitest" />

import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import viteTsConfigPaths from 'vite-tsconfig-paths';


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({

  plugins: [angular(), viteTsConfigPaths()],

  test: {
    globals: true,

    environment: 'jsdom',

    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    exclude: [],
    reporters: ['default'],
    server: {
      deps: {
        inline: [/fesm2022/]
      }
    }
  },
  define: {
    'import.meta.vitest': mode !== 'production',
  },
}));
