module.exports = {
  "validate_doc_update":
  function (newDoc, oldDoc, userCtx, secObj) {
    var admins = (secObj && secObj.admins) || {};
    var isAdmin = userCtx.roles.indexOf('_admin') !== -1 ||
      (admins.names || []).indexOf(userCtx.name) !== -1 ||
      (admins.roles || []).some(function (role) { return userCtx.roles.indexOf(role) !== -1; });
    if (!isAdmin) {
      throw { forbidden: 'Only managers can change challenges' };
    }
  }
};
