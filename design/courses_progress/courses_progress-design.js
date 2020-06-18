module.exports = {
  "views": {
    "enrollment": {
      "map": function (doc) {
        emit({ userId: doc.userId, courseId: doc.courseId } , doc.createdDate);
      },
      "reduce": "_stats"
    },
    "completion": {
      "map": function (doc) {
        if (doc.passed) {
          emit({ userId: doc.userId, courseId: doc.courseId } , doc.updatedDate);
        }
      },
      "reduce": "_stats"
    }
  }
}
