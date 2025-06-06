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
