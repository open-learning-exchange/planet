module.exports = {
  "views": {
    "count_activity": {
      "map": function (doc) {
        emit([doc.createdOn, doc.parentCode, doc.type, doc.user], 1);
      },
      "reduce": "_count"
    },
    "total_user_activity": {
      "map": function (doc) {
        emit(doc.type, doc.user, 1);
      },
      "reduce": "_count"
    }
  }
}
