module.exports = {
  "views": {
    "count_activity": {
      "map": function (doc) {
        emit([doc.parentCode, doc.createdOn, doc.type], 1);
      },
      "reduce": "_count"
    },
    "count_activity_by_type": {
      "map": function (doc) {
        emit([doc.type, doc.parentCode, doc.createdOn], 1);
      },
      "reduce": "_count"
    },
    "last_activity_by_type": {
      "map": function (doc) {
        emit([doc.type, doc.parentCode, doc.createdOn], doc.createdTime);
      },
      "reduce": function(keys, docs) {
        var last_record = 0;
        docs.forEach(function(doc) {
            last_record = doc > last_record ? doc : last_record
        });
        return last_record;
      }
    }
  }
}
