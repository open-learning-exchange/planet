// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  test: false,
  couchAddress: window.location.protocol + '//' + window.location.hostname + ':2200',
  centerAddress: 'earth.ole.org:2200',
  centerProtocol: 'https',
  parentProtocol: 'https',
  upgradeAddress: window.location.origin + '/upgrade',
  syncAddress: window.location.protocol + '//localhost:5984'
};
