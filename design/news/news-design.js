module.exports = {
  "views": {
    "by_section_and_id_and_date": {
      map: function (doc) {
        if (doc.docType !== 'message' || !Array.isArray(doc.viewIn)) { return; }

        payload = {
          message: doc.message,
          time: doc.time,
          updatedDate: doc.updatedDate,
          createdOn: doc.createdOn,
          labels: doc.labels,
          user: doc.user ? {
            name: doc.user.name,
            firstName: doc.user.firstName,
            middleName: doc.user.middleName,
            lastName: doc.user.lastName,
            planetCode: doc.user.planetCode
          } : null,
          viewIn: doc.viewIn,
          chat: doc.chat,
          news: doc.chat && doc.news ? {
            conversations: doc.news.conversations
          } : null
        }

        doc.viewIn.forEach(function (v) {
          if (v.section === 'community' || v.section === 'teams') {
            emit(
              [ v.section, v._id, doc.updatedDate ],
              payload
            );
          }
        });
      }
    },
  }
}
