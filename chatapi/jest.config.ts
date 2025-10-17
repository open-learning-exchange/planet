import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [ '<rootDir>/src' ],
  moduleFileExtensions: [ 'ts', 'js', 'json' ],
  collectCoverageFrom: [ 'src/**/*.ts', '!src/index.ts' ],
};

export default config;
