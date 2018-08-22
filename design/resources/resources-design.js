module.exports = {
  "views": {
    "count_tags": {
      "map": function (doc) {
        for (var i = 0; i < doc.tags.length; i++) {
          emit(doc.tags[i], 1);
        }
      },
      "reduce": "_count"
    }
  }
}
