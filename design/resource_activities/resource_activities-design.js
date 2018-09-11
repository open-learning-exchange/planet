module.exports = {
    "views": {
      "count_activity": {
        "map": function (doc) {
          emit([doc.createdOn, doc.parentDomain, doc.activity, doc.item], 1);
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
  