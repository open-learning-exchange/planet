import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CouchService } from './couchdb.service';

describe('CouchService paginated queries', () => {
  const createService = (postResponses: any[]) => {
    const http = {
      post: vi.fn().mockImplementation(() => postResponses.shift() || of({ docs: [] }))
    };
    const planetMessageService = { showAlert: vi.fn() };
    return { service: new CouchService(http as any, planetMessageService as any), http };
  };

  afterEach(() => vi.restoreAllMocks());

  it('reports a failed find as an empty result on the default path', () => {
    const { service } = createService([ throwError(new Error('find failed')) ]);
    const next = vi.fn();
    const error = vi.fn();

    service.findAll('teams').subscribe({ next, error });

    expect(next).toHaveBeenCalledWith([]);
    expect(error).not.toHaveBeenCalled();
  });

  it('propagates an initial page failure on the strict path', () => {
    const { service } = createService([ throwError(new Error('find failed')) ]);
    const next = vi.fn();
    const error = vi.fn();

    service.findAllStrict('teams').subscribe({ next, error });

    expect(next).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'find failed' }));
  });

  it('propagates a later page failure on the strict path', () => {
    const { service, http } = createService([
      of({ docs: [ { _id: 'membership-1' } ], bookmark: 'page-2' }),
      throwError(new Error('find failed'))
    ]);
    const next = vi.fn();
    const error = vi.fn();

    service.findAllStrict('teams').subscribe({ next, error });

    expect(http.post).toHaveBeenCalledTimes(2);
    expect(next).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'find failed' }));
  });

  it('collects every page of a successful strict query', () => {
    const { service, http } = createService([
      of({ docs: [ { _id: 'membership-1' } ], bookmark: 'page-2' }),
      of({ docs: [ { _id: 'membership-2' } ], bookmark: 'page-3' }),
      of({ docs: [] })
    ]);
    const next = vi.fn();

    service.findAllStrict('teams', { selector: {}, limit: 1 }).subscribe({ next });

    expect(http.post).toHaveBeenCalledTimes(3);
    expect(JSON.parse(http.post.mock.calls[1][1])).toEqual({ selector: {}, limit: 1, bookmark: 'page-2' });
    expect(next).toHaveBeenCalledWith([ { _id: 'membership-1' }, { _id: 'membership-2' } ]);
  });
});
