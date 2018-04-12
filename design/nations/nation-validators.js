function (newDoc, oldDoc, userCtx, secObj) {
  function require(field) {
    var errMessage = field + ' is required';
    if (!newDoc[field]) {
      throw { forbidden: errMessage };
    }
  }
  function canWrite() {
    var CAN_WRITE = true;
    var readOnly = ['learner'];
    if (!userCtx.isUserAdmin) {
      if (userCtx.roles.length < 1) {
        CAN_WRITE = false;
      } else {
        for (var i = 0; i < userCtx.roles.length; i++) {
          if (readOnly.indexOf(userCtx.roles[i]) !== -1) {
            CAN_WRITE = false;
          }
        }
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