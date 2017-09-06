const { SpecReporter } = require('jasmine-spec-reporter');

module.exports = function() {
  require('ts-node').register({
    project: '/e2e/tsconfig.e2e.json'
  });
  jasmine.getEnv().addReporter(new SpecReporter({ spec: { displayStacktrace: true } }));  
};