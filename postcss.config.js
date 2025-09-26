const purgecss = require('@fullhuman/postcss-purgecss')({
  content: [
    './src/index.html',
    './src/app/**/*.{html,ts}'
  ],
  defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
  safelist: {
    standard: [
      /^mat-/,
      /^cdk-/,
      /^fa-/,
      /^planet-/,
      /^td-/,
      /^fc-/,
      'cdk-global-overlay-wrapper',
      'cdk-overlay-container'
    ],
    deep: [/^mat-/, /^cdk-/]
  }
});

module.exports = ({ env }) => ({
  plugins: [
    require('autoprefixer'),
    ...(env === 'production' ? [purgecss] : [])
  ]
});
