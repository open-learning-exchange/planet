module.exports = {
  "views": {
    "count_by_gender": {
      "map": function (doc) {
        if (doc.name !== 'satellite') {
          emit([doc.parentCode, doc.planetCode, doc.gender], 1);
        }
      },
      "reduce": "_count"
    }
  }
}
