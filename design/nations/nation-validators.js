module.exports = { "validate_doc_update":
  function (newDoc, oldDoc, userCtx, secObj) {
    function require(field) {
      var errMessage = field + ' is required';
      if (!newDoc[field]) {
        throw { forbidden: errMessage };
      }
    }
    function canWrite() {
      var CAN_WRITE = false;
      var writeAccess = ['_admin'];
      if(secObj && secObj.admins && secObj.admins.names) {
        CAN_WRITE = (secObj.admins.names.indexOf(userCtx.name) !== -1);
      }
      if(!CAN_WRITE && secObj && secObj.admins && secObj.admins.roles) {
        writeAccess.concat(secObj.admins.roles);
      }
      for (var i = 0; (!CAN_WRITE && i < userCtx.roles.length); i++) {
        if (writeAccess.indexOf(userCtx.roles[i]) !== -1) {
          CAN_WRITE = true;
        }
      }
      if(!CAN_WRITE) {
        throw { forbidden: 'You have only read-only access' };
      }
    }
    canWrite();
    if (!newDoc) {
      require('name');
      require('adminName');
      require('nationUrl');
    }
  }
}
