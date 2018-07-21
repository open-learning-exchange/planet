export const environment = {
  production: false,
  test: true,
  // couchAddress: 'http://127.0.0.1:5984/',
  couchAddress: window.location.origin + '/di/',
  centerAddress: 'earth.ole.org:2200',
  centerProtocol: 'https',
  parentProtocol: 'https',
  upgradeAddress: window.location.origin + '/upgrade'
};
