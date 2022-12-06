export const environment = {
  production: true,
  test: false,
  // Change this to Docker address
  // couchAddress: 'planet-db-host:planet-db-port/',
  couchAddress: window.location.origin + '/db',
  centerAddress: 'planet-center-address',
  uplanetAddress: 'https://uplanet.gt',
  centerProtocol: 'https',
  parentProtocol: 'planet-parent-protocol',
  uPlanetCode: 'guatemala',
  uParentCode: 'guatemala@earth',
  upgradeAddress: window.location.origin + '/upgrade',
  syncAddress: 'planet-sync-address'
};
