export const environment = {
  production: true,
  test: false,
  // Change this to Docker address
  couchAddress: 'planet-db-host:planet-db-port/',
  centerAddress: 'planet-center-address',
  centerProtocol: 'https',
  parentProtocol: 'https',
  upgradeAddress: window.location.protocol + '//' + window.location.hostname + ':3100/upgrade'
};
