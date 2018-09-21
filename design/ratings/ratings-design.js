module.exports = {
    "views": {
      "count_ratings": {
        "map": function (doc) {
          emit([doc.parentCode, doc.createdOn, doc.type, doc.item], 1);
        },
        "reduce": "_count"
      },
      "avg_ratings": {
        "map": function (doc) {
          emit([doc.parentCode, doc.createdOn, doc.type, doc.item], doc.rate);
        },
        "reduce": function(keys, docs) {
          var rating = 0;
          docs.forEach(function(doc) {
            rating = rating + doc;
          });
          return rating / docs.length;
        }
      },
      "total_item_ratings": {
        "map": function (doc) {
          emit(doc.item, 1);
        },
        "reduce": "_count"
      }
    }
  }
  