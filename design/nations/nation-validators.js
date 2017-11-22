unction (newDoc, oldDoc, userCtx, secObj) {
  function require(field) {
    var errMessage = field + ' is required';
    if (!newDoc[field]) {
      throw { forbidden: errMessage };
    }
  }
    function isHex(field) {
    var val = newDoc[field];
    var errMessage = field + ' is not a valid hex';
    if (!/^#[A-F0-9]{6}$/i.test(val)) {
      throw { forbidden: errMessage };
    }
  }
  if (!newDoc) {
    require('name');
    require('adminName');
    require('nationUrl');
  }
}