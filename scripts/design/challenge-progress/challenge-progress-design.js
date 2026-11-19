module.exports = {
  "views": {
    "totals": {
      "map": function (doc) {
        if (doc.challengeId && doc.taskId && doc.taskId !== 'complete') {
          emit([ doc.challengeId, doc.planetCode, doc.user, doc.taskId, doc.day ], 1);
        }
      },
      "reduce": "_count"
    }
  },
  "validate_doc_update":
  function (newDoc, oldDoc, userCtx, secObj) {
    var admins = (secObj && secObj.admins) || {};
    var isAdmin = userCtx.roles.indexOf('_admin') !== -1 ||
      (admins.names || []).indexOf(userCtx.name) !== -1 ||
      (admins.roles || []).some(function (role) { return userCtx.roles.indexOf(role) !== -1; });
    if (isAdmin && !newDoc._deleted && newDoc.user === userCtx.name) {
      throw { forbidden: 'Managers do not take part in challenges' };
    }
    // Replication up to the parent writes as the planet's admin, not as the learner
    if (isAdmin) {
      return;
    }
    if (oldDoc || newDoc._deleted) {
      throw { forbidden: 'Challenge progress can only be added' };
    }
    if (newDoc.user !== userCtx.name) {
      throw { forbidden: 'Challenge progress can only be added for yourself' };
    }
    // Ids are read by prefix, so no part may contain ':'
    ['challengeId', 'planetCode', 'user', 'taskId'].forEach(function (field) {
      if (typeof newDoc[field] !== 'string' || !newDoc[field] || newDoc[field].indexOf(':') !== -1) {
        throw { forbidden: field + ' must be text without ":"' };
      }
    });
    if (!newDoc.time) {
      throw { forbidden: 'time is required' };
    }
    if (newDoc.taskId !== 'complete' && !newDoc.evidence) {
      throw { forbidden: 'evidence is required' };
    }
    var prefix = [ newDoc.challengeId, newDoc.planetCode, newDoc.user, newDoc.taskId ].join(':');
    if (newDoc._id !== prefix && newDoc._id.indexOf(prefix + ':') !== 0) {
      throw { forbidden: '_id must start with challengeId:planetCode:user:taskId' };
    }
  }
};
