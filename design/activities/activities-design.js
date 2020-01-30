module.exports = {
  "views": {
    "byPlanet": {
      "map": function (doc) {
        emit(doc.createdOn, 1);
      },
      "reduce": "_count"
    },
    "byPlanetRecent": {
      "map": function (doc) {
        var today = new Date(Date.now()).setHours(0, 0, 0, 0);
        var docDate = doc.loginTime || doc.time;
        // 86400000 milliseconds per day
        // 29 previous days plus current day = most recent 30 days
        if ((today - docDate) < (29 * 86400000)) {
          emit(doc.createdOn, 1);
        }
      },
      "reduce": "_count"
    },
    "grouped": {
      "map": function (doc) {
        var time = doc.loginTime || doc.time;
        var date = new Date(time);
        emit({ createdOn: doc.createdOn, parentCode: doc.parentCode, month: date.getMonth(), year: date.getFullYear(), resourceId: doc.resourceId, title: doc.title, user: doc.user }, time);
      },
      "reduce": "_stats"
    }
  }
}
