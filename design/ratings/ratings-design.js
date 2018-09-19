module.exports = {
    "views": {
      "count_ratings": {
        "map": function (doc) {
          emit([doc.createdOn, doc.parentCode, doc.type, doc.item], 1);
        },
        "reduce": "_count"
      },
      "total_item_ratings": {
        "map": function (doc) {
          emit(doc.item, 1);
        },
        "reduce": "_count"
      }
    }
  }
  