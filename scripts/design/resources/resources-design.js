module.exports = {
  "views": {
    "count_tags": {
      "map": function (doc) {
        for (var i = 0; i < doc.tags.length; i++) {
          emit(doc.tags[i], 1);
        }
      },
      "reduce": "_count"
    },
    "titles": {
      "map": function (doc) {
        emit(doc.title.toLowerCase().trim(), doc.privateFor);
      }
    }
  },
  "validate_doc_update":
  function (newDoc, oldDoc, userCtx, secObj) {
    var is_server_or_database_admin = function(userCtx, secObj) {
      // see if the user is a server admin
      if(userCtx.roles.indexOf('_admin') !== -1) {
        return true; // a server admin
      }

      // see if the user a database admin specified by name
      if(secObj && secObj.admins && secObj.admins.names) {
        if(secObj.admins.names.indexOf(userCtx.name) !== -1) {
          return true; // database admin
        }
      }

      // see if the user a database admin specified by role
      if(secObj && secObj.admins && secObj.admins.roles) {
        var db_roles = secObj.admins.roles;
        for(var idx = 0; idx < userCtx.roles.length; idx++) {
          var user_role = userCtx.roles[idx];
          if(db_roles.indexOf(user_role) !== -1) {
            return true; // role matches!
          }
        }
      }
      return false; // default to no admin
    }
    function writeAccess(userCtx, secObj) {
      var writeRoles = ['learner', 'leader'];
      return userCtx.roles.reduce(
        function(hasWriteRole, role) {
          return hasWriteRole || writeRoles.indexOf(role) > -1;
        },
        false
      ) || is_server_or_database_admin(userCtx, secObj);
    }
    var hasWriteAccess = writeAccess(userCtx);
    if(!hasWriteAccess) {
      throw { forbidden: 'You have only read-only access' };
    }
  }
}
