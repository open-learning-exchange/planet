import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CouchService } from './couchdb.service';

describe('CouchService', () => {
  it('keeps the documents already fetched when a later page of a find request fails', () => {
    const http = { post: vi.fn() };
    http.post
      .mockReturnValueOnce(of({ docs: [ { _id: 'resource-1' } ], bookmark: 'page-2' }))
      .mockReturnValueOnce(throwError(new Error('offline')));
    const service = new CouchService(http as any, { showAlert: vi.fn() } as any);
    let docs: any[];

    service.findAll('resources').subscribe((res: any[]) => docs = res);

    expect(docs).toEqual([ { _id: 'resource-1' } ]);
    expect(http.post).toHaveBeenCalledTimes(2);
  });
});
