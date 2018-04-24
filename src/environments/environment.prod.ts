export function calculateCouchAddress() {
  if (process.env.MULTIPLE_IPS) {
    return window.location.protocol + '//' + window.location.hostname + ':' + process.env.DB_PORT;
  } else {
    return window.location.protocol + '//' + process.env.DB_HOST + ':' + process.env.DB_PORT;
  }
}

export const environment = {
  production: true,
  test: false,
  couchAddress: calculateCouchAddress(),
  centerAddress: process.env.CENTER_ADDRESS,
};
