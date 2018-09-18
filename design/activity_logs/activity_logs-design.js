module.exports = {
  "views": {
    "count_activity": {
      "map": function (doc) {
        emit([doc.createdOn, doc.parentDomain, doc.type], 1);
      },
      "reduce": "_count"
    },
    "count_activity_by_type": {
      "map": function (doc) {
        emit([doc.type, doc.createdOn, doc.parentDomain], 1);
      },
      "reduce": "_count"
    }
  }
}
