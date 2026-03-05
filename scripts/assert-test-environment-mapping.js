#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const angularJsonPath = path.resolve(__dirname, '..', 'angular.json');
const angularConfig = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));

const expectedFileReplacementBlock = [
  {
    replace: 'src/environments/environment.ts',
    with: 'src/environments/environment.test.ts'
  }
];

const testBuildConfig =
  angularConfig.projects?.['planet-app']?.architect?.build?.configurations?.test;

if (!testBuildConfig) {
  throw new Error(
    'Missing angular.json block: projects["planet-app"].architect.build.configurations.test'
  );
}

const actualFileReplacements = testBuildConfig.fileReplacements;

if (
  JSON.stringify(actualFileReplacements) !==
  JSON.stringify(expectedFileReplacementBlock)
) {
  throw new Error(
    [
      'Unexpected test environment file replacement config in angular.json.',
      'Expected exact block at projects["planet-app"].architect.build.configurations.test.fileReplacements:',
      JSON.stringify(expectedFileReplacementBlock, null, 2),
      'Received:',
      JSON.stringify(actualFileReplacements, null, 2)
    ].join('\n')
  );
}

console.log(
  'Verified angular.json projects["planet-app"].architect.build.configurations.test.fileReplacements maps environment.ts to environment.test.ts.'
);
