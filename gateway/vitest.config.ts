import { defineConfig } from 'vitest/config';

export default defineConfig({
  'test': {
    'environment': 'node',
    'include': [ 'src/**/*.test.ts' ],
    // The baseline gateway has no tests. The first test-bearing commit removes this.
    'passWithNoTests': true
  }
});
