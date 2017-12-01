function (newDoc, oldDoc, userCtx, secObj) {
  function require(field) {
    var errMessage = field + ' is required';
    if (!newDoc[field]) {
      throw { forbidden: errMessage };
    }
  }
  if (!newDoc) {
    require('name');
    require('adminName');
    require('nationUrl');
  }
}