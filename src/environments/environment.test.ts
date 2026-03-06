export const environment = {
  production: false,
  test: true,
  chatAddress: window.location.protocol + '//' + window.location.hostname + ':5000',
  couchAddress: 'http://127.0.0.1:5984',
  centerAddress: 'planet.earth.ole.org/db',
  centerProtocol: 'https',
  parentProtocol: 'https',
  upgradeAddress: window.location.origin + '/upgrade',
  syncAddress: window.location.protocol + '//localhost:5984'
};
