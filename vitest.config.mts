import { defineConfig } from 'vitest/config';

// Runner options the angular.json test target can't set; it owns the spec list and environment
export default defineConfig({
  test: {
    globals: true,
    // The Angular builder turns this off, which lets specs leak into each other
    isolate: true,
    reporters: [ 'default' ],
    server: {
      // Showdown is CommonJS; inlining keeps the named exports MarkdownRenderService uses
      deps: {
        inline: [ 'showdown' ],
      },
    },
  },
});
