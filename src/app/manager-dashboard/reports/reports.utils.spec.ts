import { chatActivityHasAttachments } from './reports.utils';

describe('chatActivityHasAttachments', () => {
  it('tracks indexed attachments even when the model emits no citation', () => {
    expect(chatActivityHasAttachments({
      conversations: [ { query: 'question', response: 'answer', hasAttachments: true } ]
    })).toEqual(true);
  });

  it('keeps legacy context and citation fallbacks', () => {
    expect(chatActivityHasAttachments({
      context: { resource: { attachments: { 'guide.pdf': {} } } }
    })).toEqual(true);
    expect(chatActivityHasAttachments({
      conversations: [ { citations: [ { title: 'guide.pdf' } ] } ]
    })).toEqual(true);
  });

  it('does not label ordinary chats as attachment-backed', () => {
    expect(chatActivityHasAttachments({
      conversations: [ { query: 'question', response: 'answer' } ]
    })).toEqual(false);
  });
});
