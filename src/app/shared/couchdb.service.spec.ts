import { of } from 'rxjs';

import { CouchService } from './couchdb.service';

describe('CouchService', () => {
  let service: CouchService;
  let http: { post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    http = { post: vi.fn() };
    service = new CouchService(http as any, { raiseAlert: vi.fn() } as any);
  });

  describe('bulkGet', () => {
    const bulkGet = (results: any[], ids: string[]) => {
      http.post.mockReturnValue(of({ results }));
      let docs: any[];
      service.bulkGet('resources', ids).subscribe(response => docs = response);
      return docs;
    };

    it('returns the docs which were found', () => {
      const docs = bulkGet([
        { id: 'a', docs: [ { ok: { _id: 'a', _rev: '1-one', title: 'Resource A' } } ] },
        { id: 'b', docs: [ { ok: { _id: 'b', _rev: '2-two', title: 'Resource B' } } ] }
      ], [ 'a', 'b' ]);
      expect(docs.map(doc => doc._id)).toEqual([ 'a', 'b' ]);
    });

    it('skips ids which are missing from the database without dropping the rest', () => {
      const docs = bulkGet([
        { id: 'a', docs: [ { ok: { _id: 'a', _rev: '1-one', title: 'Resource A' } } ] },
        { id: 'gone', docs: [ { error: { id: 'gone', rev: 'undefined', error: 'not_found', reason: 'missing' } } ] },
        { id: 'b', docs: [ { ok: { _id: 'b', _rev: '1-one', title: 'Resource B' } } ] }
      ], [ 'a', 'gone', 'b' ]);
      expect(docs.map(doc => doc._id)).toEqual([ 'a', 'b' ]);
    });

    it('skips ids whose only revision is deleted', () => {
      const docs = bulkGet([
        { id: 'a', docs: [ { ok: { _id: 'a', _rev: '1-one', title: 'Resource A' } } ] },
        { id: 'deleted', docs: [ { ok: { _id: 'deleted', _rev: '3-three', _deleted: true } } ] }
      ], [ 'a', 'deleted' ]);
      expect(docs.map(doc => doc._id)).toEqual([ 'a' ]);
    });

    it('picks the highest revision when a doc is conflicted', () => {
      const docs = bulkGet([
        { id: 'a', docs: [
          { ok: { _id: 'a', _rev: '2-two', title: 'Older' } },
          { ok: { _id: 'a', _rev: '10-ten', title: 'Newer' } }
        ] }
      ], [ 'a' ]);
      expect(docs).toEqual([ { _id: 'a', _rev: '10-ten', title: 'Newer' } ]);
    });

    it('returns an empty array when every id is missing', () => {
      const docs = bulkGet([
        { id: 'gone', docs: [ { error: { id: 'gone', rev: 'undefined', error: 'not_found', reason: 'missing' } } ] }
      ], [ 'gone' ]);
      expect(docs).toEqual([]);
    });
  });
});
