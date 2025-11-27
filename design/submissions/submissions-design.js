module.exports = {
  "views": {
    "submissionCounts": {
      "map": function(doc) {
        if (doc.type === 'survey') {
          var teamId = doc.team && doc.team._id ? doc.team._id : (doc.parent && doc.parent.teamId ? doc.parent.teamId : null);
          var status = doc.status || 'pending';
          emit([doc.parentId, teamId, status], 1);
        }
      },
      "reduce": "_count"
    },
    "parentSurveys": {
      "map": function(doc) {
        if (doc.type === 'survey' && doc.parent && doc.parent._id) {
          var teamId = doc.team && doc.team._id ? doc.team._id : (doc.parent && doc.parent.teamId ? doc.parent.teamId : null);
          var status = doc.status || 'pending';
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
    }
  }
};
