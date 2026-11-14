import { of, Subject } from 'rxjs';
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
    const service = new NewsService(couchService as any, {} as any, {} as any, messages as any);
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
