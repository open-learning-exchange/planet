module.exports = {
  "views": {
    "byPlanet": {
      "map": function (doc) {
        emit(doc.createdOn, 1);
      },
      "reduce": "_count"
    }
  }
}
