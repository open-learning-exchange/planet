import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { NewsService } from './news.service';

describe('NewsService reaction saves', () => {
  const setup = () => {
    const saveResult = new Subject<any>();
    const savedDoc = {
      _id: 'voice-1', _rev: '2-rev', user: { _id: 'author' }, reactions: { '👍': [ 'reader' ] }
    };
    const couchService = {
      updateDocument: vi.fn(() => saveResult),
      findAll: vi.fn(() => of([ savedDoc ])),
      findAttachmentsByIds: vi.fn(() => of([]))
    };
    const messages = { showAlert: vi.fn() };
    const service = new NewsService(couchService as any, {} as any, {} as any, messages as any, {} as any);
    const newsUpdated = vi.fn();
    service.newsUpdated$.subscribe(newsUpdated);
    return { service, saveResult, savedDoc, couchService, messages, newsUpdated };
  };

  it('publishes fresh news after a successful save and preserves the revision response', () => {
    const { service, saveResult, savedDoc, couchService, newsUpdated, messages } = setup();
    const newsDoc = { ...savedDoc, _rev: '1-rev' };
    const next = vi.fn();
    service.saveReaction(newsDoc).subscribe(next);

    expect(couchService.updateDocument).toHaveBeenCalledWith('news', newsDoc);
    expect(newsUpdated).not.toHaveBeenCalled();

    const response = { ok: true, id: newsDoc._id, rev: '2-rev' };
    saveResult.next(response);
    saveResult.complete();

    expect(next).toHaveBeenCalledWith(response);
    expect(newsUpdated).toHaveBeenCalledOnce();
    expect(newsUpdated.mock.calls[0][0][0].doc).toBe(savedDoc);
    expect(messages.showAlert).not.toHaveBeenCalled();
  });

  it('refreshes stale news on a revision conflict and propagates the original error', () => {
    const { service, saveResult, savedDoc, newsUpdated, messages } = setup();
    const error = { status: 409 };
    const onError = vi.fn();
    service.saveReaction({ ...savedDoc, _rev: '1-rev' }).subscribe({ error: onError });

    saveResult.error(error);

    expect(newsUpdated).toHaveBeenCalledOnce();
    expect(newsUpdated.mock.calls[0][0][0].doc).toBe(savedDoc);
    expect(onError).toHaveBeenCalledWith(error);
    expect(messages.showAlert).toHaveBeenCalledWith('There was a problem saving your reaction.');
  });

  it('reports other failures without publishing a successful update', () => {
    const { service, saveResult, savedDoc, couchService, newsUpdated, messages } = setup();
    const error = { status: 500 };
    const onError = vi.fn();
    service.saveReaction(savedDoc).subscribe({ error: onError });

    saveResult.error(error);

    expect(couchService.findAll).not.toHaveBeenCalled();
    expect(newsUpdated).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(error);
    expect(messages.showAlert).toHaveBeenCalledWith('There was a problem saving your reaction.');
  });
});

describe('NewsService avatar metadata', () => {
  const service = new NewsService({} as any, {} as any, {} as any, {} as any, {} as any);
  const user = { _id: 'org.couchdb.user:ann', planetCode: 'community-a', _attachments: { img: { digest: 'md5-snapshot' } } };

  it('prefers the replicated attachment over the snapshot in the post', () => {
    const attachments = new Map([ [ 'org.couchdb.user:ann@community-a', { _attachments: { img: { digest: 'md5-current' } } } ] ]);

    expect(service.findAvatarAttachment(user, attachments)).toEqual({ digest: 'md5-current' });
  });

  it('falls back to the snapshot in the post when nothing was replicated', () => {
    expect(service.findAvatarAttachment(user, new Map())).toEqual({ digest: 'md5-snapshot' });
  });
});

describe('NewsService shared chats', () => {
  it('leaves out chat voices that copied the whole conversation', () => {
    const user = { _id: 'org.couchdb.user:ann', planetCode: 'community-a' };
    const voices = [
      { _id: 'link', user, chat: true, news: { shareId: 'share-1', title: 'Fractions' } },
      { _id: 'snapshot', user, chat: true, news: { _id: 'chat-1', conversations: [ { query: 'q', response: 'r' } ] } },
      { _id: 'plain', user, message: 'Hello' }
    ];
    const couchService = { findAll: vi.fn(() => of(voices)), findAttachmentsByIds: vi.fn(() => of([])) };
    const service = new NewsService(couchService as any, {} as any, {} as any, {} as any, {} as any);
    const newsUpdated = vi.fn();
    service.newsUpdated$.subscribe(newsUpdated);

    service.requestNews({ selectors: {}, viewId: 'community-a' });

    expect(newsUpdated.mock.calls[0][0].map(item => item._id)).toEqual([ 'link', 'plain' ]);
  });
});

describe('NewsService deleting a shared chat', () => {
  const setup = () => {
    const couchService = {
      updateDocument: vi.fn(() => of({ ok: true })),
      findAll: vi.fn(() => of([])),
      findAttachmentsByIds: vi.fn(() => of([]))
    };
    const userService = { get: () => ({ name: 'ann' }) };
    const stateService = { configuration: { code: 'community-a', parentCode: 'nation-a' } };
    const aiChatService = { stopSharing: vi.fn((): any => of(undefined)) };
    const messages = { showMessage: vi.fn() };
    const service = new NewsService(couchService as any, stateService as any, userService as any, messages as any, aiChatService as any);
    return { service, couchService, aiChatService };
  };
  const chatVoice = (name: string, viewIn = [ { _id: 'community-a@nation-a', section: 'community' } ]) => ({
    _id: 'voice-1', _rev: '1-a', chat: true, news: { shareId: 'share-1', title: 'Fractions' }, user: { name }, message: '', viewIn
  });

  it('stops the share before the author\'s voice is deleted, and keeps the voice if it can\'t', () => {
    const { service, couchService, aiChatService } = setup();
    const onError = vi.fn();

    service.deleteNews(chatVoice('ann'), 'community-a@nation-a').subscribe();
    expect(aiChatService.stopSharing).toHaveBeenCalledWith('share-1');
    expect(couchService.updateDocument).toHaveBeenCalledWith('news', expect.objectContaining({ _deleted: true }));

    couchService.updateDocument.mockClear();
    aiChatService.stopSharing.mockReturnValueOnce(throwError(() => ({ status: 502 })));
    service.deleteNews(chatVoice('ann'), 'community-a@nation-a').subscribe({ error: onError });
    expect(onError).toHaveBeenCalled();
    expect(couchService.updateDocument).not.toHaveBeenCalled();

    aiChatService.stopSharing.mockReturnValueOnce(throwError(() => ({ status: 404 })));
    service.deleteNews(chatVoice('ann'), 'community-a@nation-a').subscribe();
    expect(couchService.updateDocument).toHaveBeenCalledOnce();
  });

  it('keeps the share while the voice stays in another view, or when someone else deletes it', () => {
    const { service, aiChatService } = setup();
    const twoViews = [ { _id: 'community-a@nation-a', section: 'community' }, { _id: 'team-1', section: 'teams' } ];

    service.deleteNews(chatVoice('ann', twoViews), 'team-1').subscribe();
    service.deleteNews(chatVoice('manager'), 'community-a@nation-a').subscribe();

    expect(aiChatService.stopSharing).not.toHaveBeenCalled();
  });
});
