// IMPORTANT: This file is wired into Angular production builds via
// `angular.json` -> `projects.planet-app.architect.build.configurations.production.fileReplacements`,
// where `src/environments/environment.ts` is replaced with this file.
// Keep both the filename and exported symbol (`environment`) intact.
//
// Risk note: removing this file, renaming it, or changing/removing its export
// will break production builds immediately.
export const environment = {
  production: true,
  test: false,
  // Change this to Docker address
  // couchAddress: 'planet-db-host:planet-db-port/',
  chatAddress: window.location.origin + '/ml/',
  couchAddress: window.location.origin + '/db',
  centerAddress: 'planet-center-address',
  centerProtocol: 'https',
  parentProtocol: 'planet-parent-protocol',
  upgradeAddress: window.location.origin + '/upgrade',
  syncAddress: 'planet-sync-address'
};
