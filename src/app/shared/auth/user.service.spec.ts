import { of } from 'rxjs';
import { vi } from 'vitest';

import { UserService } from './user.service';

describe('UserService.addImageForReplication', () => {
  const replica = {
    _id: 'org.couchdb.user:ann@planet-a',
    _rev: '2-replica',
    userId: 'org.couchdb.user:ann',
    _attachments: { img: { digest: 'md5-old' } }
  };

  it('clears the replicated photo after the user removes theirs', () => {
    const couchService = {
      findAll: vi.fn().mockReturnValue(of([ replica ])),
      get: vi.fn().mockReturnValue(of({ _id: 'org.couchdb.user:ann', planetCode: 'planet-a', parentCode: 'parent' })),
      bulkDocs: vi.fn().mockReturnValue(of([]))
    };
    const service = new UserService(couchService as any, {} as any);

    service.addImageForReplication(true, [ { _id: 'org.couchdb.user:ann', planetCode: 'planet-a', _attachments: {} } ]).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledWith('attachments', [ {
      _id: replica._id,
      userId: 'org.couchdb.user:ann',
      planetCode: 'planet-a',
      parentCode: 'parent',
      _rev: replica._rev,
      _attachments: undefined
    } ]);
  });
});
