// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

const { SpecReporter } = require('jasmine-spec-reporter'),
  userHandler = require('./e2e/userHandler.ts'),
  timeStamp = Date.now(),
  user = userHandler(timeStamp);

exports.config = {
  allScriptsTimeout: 110000,
  specs: [
    './e2e/**/*.e2e-spec.ts'
  ],
  capabilities: {
    'browserName': 'chrome',
    'chromeOptions': {
      args: [ "--headless", "--disable-gpu", "--window-size=1280,800" ]
    }
  },
  directConnect: true,
  baseUrl: 'http://localhost:4200/',
  framework: 'jasmine',
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 30000,
    print: function() {}
  },
  onPrepare() {
    var defer = protractor.promise.defer();
    require('ts-node').register({
      project: './e2e/tsconfig.e2e.json'
    });
    jasmine.getEnv().addReporter(new SpecReporter({ spec: { displayStacktrace: true } }));
    browser.params.user = user.get();

    return user.create().then(function(res) {
      defer.fulfill();
    })
    .catch(function(err) {
      console.log(err);
    });
  },
  onComplete() {
    return user.delete().then(function(res) {
      console.log('Completed tests and removed new user: ' + user.get());
    })
    .catch(function(err) {
      console.log(err);
    });
  }
};
