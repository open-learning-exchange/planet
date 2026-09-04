/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';

// The `@angular/build:unit-test` builder owns the spec list, jsdom environment and
// setup files (see the `test` target in angular.json); it only reads this file for
// options it does not expose itself.
export default defineConfig({
  test: {
    globals: true,
    reporters: [ 'default' ],
    server: {
      // Covalent imports Showdown's CommonJS API as an ESM namespace. Let Vite
      // transform both packages so named exports such as `Converter` survive.
      deps: {
        inline: [ '@covalent/markdown', 'showdown' ],
      },
    },
  },
});
