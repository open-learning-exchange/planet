module.exports = {
  "views": {
    "surveyData": {
      "map": function(doc) {
        if (doc.type === 'survey') {
          var teamId = doc.team && doc.team._id ? doc.team._id : null;
          var status = doc.status || 'pending';

          // Emit for counting
          emit([doc.parentId, teamId, status], 1);

          // Emit parent metadata
          if (doc.parent && doc.parent._id) {
            emit(['parent', doc.parent._id], {
              parentDoc: {
                _id: doc.parent._id,
                _rev: doc.parent._rev,
                name: doc.parent.name,
                description: doc.parent.description,
                questions: doc.parent.questions,
                type: doc.parent.type,
                sourcePlanet: doc.parent.sourcePlanet
              },
              status: status,
              teamId: teamId
            });
          }
        }
      },
      "reduce": "_count"
    }
  }
};
