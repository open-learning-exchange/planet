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
    exclude: [
      // TODO: Update tests in these files and remove from exclusion list
      'src/**/form-error-messages.component.spec.ts',
      'src/**/meetups-view.component.spec.ts',
      'src/**/courses-view.component.spec.ts',
      'src/**/notifications.component.spec.ts',
      'src/**/login.component.spec.ts',
      'src/**/resources.component.spec.ts',
      'src/**/meetups.component.spec.ts',
      'src/**/dashboard.component.spec.ts',

    ],
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
