module.exports = {
  "views": {
    "shares": {
      "map": function (doc) {
        (doc.shares || []).forEach(function (share) {
          emit(share.id, null);
        });
      }
    }
  }
};
