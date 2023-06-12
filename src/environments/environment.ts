// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  test: false,
  couchAddress: window.location.protocol + '//' + window.location.hostname + ':2200',
  centerAddress: 'planet.earth.ole.org/db',
  uplanetAddress: window.location.origin,
  centerProtocol: 'https',
  parentProtocol: 'https',
  uPlanetCode: 'guatemala',
  uParentCode: 'guatemala@earth',
  upgradeAddress: window.location.origin + '/upgrade',
  syncAddress: window.location.protocol + '//localhost:5984',
  mobileBreakpoint: 780,
  tabletBreakpoint: 1024,
};
