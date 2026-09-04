/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';

// The `@angular/build:unit-test` builder owns the spec list, jsdom environment and
// setup files (see the `test` target in angular.json); it only reads this file for
// options it does not expose itself.
export default defineConfig({
  test: {
    globals: true,
    reporters: [ 'default' ],
  },
});
