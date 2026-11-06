module.exports = {
  "views": {
    "submissionsByParent": {
      "map": function(doc) {
        if (doc.type === 'survey' && doc.parentId) {
          var baseSurveyId = doc.parentId.split('@')[0];
          var teamId = doc.team && doc.team._id ? doc.team._id : (doc.parent && doc.parent.teamId ? doc.parent.teamId : null);
          var parentInfo = null;
          if (doc.parent && doc.parent.sourcePlanet) {
            parentInfo = {
              _id: doc.parent._id,
              name: doc.parent.name,
              sourcePlanet: doc.parent.sourcePlanet,
              teamShareAllowed: doc.parent.teamShareAllowed,
              isArchived: doc.parent.isArchived,
              createdDate: doc.parent.createdDate
            };
          }

          emit([baseSurveyId, teamId], {
            status: doc.status || 'pending',
            teamId: teamId,
            parent: parentInfo
          });
        }
      }
    }
  }
};
