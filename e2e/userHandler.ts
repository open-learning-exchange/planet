const rp = require('request-promise');

module.exports = function(timeStamp) {
  const user = 'e2e_' + timeStamp;

  return {
    get: function() {
      return user;
    },
    create: function() {
      return rp({
        method: 'PUT',
        uri: 'http://127.0.0.1:5984/_users/org.couchdb.user:' + user,
        headers: { 'Content-Type': 'application/json' },
        body: { name: user, password: 'e2e', roles: [ 'learner' ], type: 'user' },
        json: true
      });
    },
    delete: function() {
      return rp('http://' + user + ':e2e@127.0.0.1:5984/_users/org.couchdb.user:' + user).then(function(res) {
        const rev = JSON.parse(res)._rev;
        return rp({
          method: 'DELETE',
          uri: 'http://' + user + ':e2e@127.0.0.1:5984/_users/org.couchdb.user:' + user + '?rev=' + rev,
          headers: { 'Content-Type': 'application/json' },
          json: true
        });
      });
    }
  };
};
