module.exports = {
  "views": {
    "by_updated_date": {
      "map": function (doc) {
        if (doc.docType === 'message') {
          emit(doc.updatedDate, {
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
          });
        }
      }
    }
  }
}
