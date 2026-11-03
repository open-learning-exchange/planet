module.exports = {
  validate_doc_update: function (newDoc, oldDoc, userCtx) {
    if (userCtx.roles.indexOf('_admin') !== -1) {
      return;
    }
    if (userCtx.roles.indexOf('leader') === -1) {
      throw { forbidden: 'Only community leaders can change pinned messages.' };
    }
    if (!/^(community|teams):.+$/.test(newDoc._id) ||
        (newDoc.messageId !== null && typeof newDoc.messageId !== 'string')) {
      throw { forbidden: 'A pin must identify a chat and one message.' };
    }
  }
};
