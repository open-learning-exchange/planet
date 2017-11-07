function (newDoc, oldDoc, userCtx, secObj) {
  function require(field) {
    var errMessage = field + ' is required';
    if (!newDoc[field]) {
      throw { forbidden: errMessage };
    }
  }
  function isInteger(field) {
    var val = newDoc[field];
    var errMessage = field + ' must be a number';

    if (isNan(parseInt(val)) || !isFinite(val)) {
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
  function isTime(field) {
    var val = newDoc[field];
    var errMessage = field + ' must be in the form of hh:mm';

    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]?$/.test(val)) {
      throw { forbidden: errMessage };
    }
  }
  function isDate(field) {
    var val = newDoc[field];
    var errMessage = field + ' must be in the form of yyyy-mm-dd';

    if (!/^\d{4}-\d{2}-\d{2}/.test(val)) {
      throw { forbidden: errMessage };
    }
    var date = new Date(val);
    var errMessage = field + ' is an invalid date';
    if (!date.getTime()) {
      return errMessage;
    }
  }
  function endTimeValidator() {
    var startTime = newDoc['startTime'];
    var endTime = newDoc['endTime'];
    var errMessage = 'The end time cannot be before the start time';

    if (
      new Date('1970-1-1 ' + startTime.value).getTime() >
      new Date('1970-1-1 ' + endTime.value).getTime()
    ) {
      return errMessage;
    }
  }
  function endDateValidator() {
    var startDate = newDoc['startDate'];
    var endDate = newDoc['endDate'];
    var errMessage = 'The end date cannot be before the start date';

    if (
      new Date(startDate.value).getTime() > new Date(endDate.value).getTime()
    ) {
      return errMessage;
    }
  }
  if (!newDoc._deleted) {
    require('courseTitle');
    require('description');

    if (newDoc['endTime']) {
      require('startTime');
      isTime('startTime');
      isTime('endTime');
      endTimeValidator();
    }
    if (newDoc['endDate']) {
      require('startDate');
      isDate('startDate');
      isDate('endDate');
      endDateValidator();
    }
  }
}
