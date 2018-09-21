module.exports = {
  "views": {
    "count_activity": {
      "map": function (doc) {
        emit([doc.parentCode, doc.createdOn, doc.activity, doc.resource], 1);
      },
      "reduce": "_count"
    },
    "total_item_activity": {
      "map": function (doc) {
        emit(doc.activity, doc.item, 1);
      },
      "reduce": "_count"
    }
  }
}