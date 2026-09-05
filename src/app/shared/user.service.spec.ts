import { vi } from 'vitest';
import { of } from 'rxjs';
import { CouchService } from './couchdb.service';
import { StateService } from './state.service';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let couchService: { put: ReturnType<typeof vi.fn>, get: ReturnType<typeof vi.fn> };

  const adminCredentials = { derived_key: 'admin-key', salt: 'admin-salt', iterations: 10 };
  const putBody = () => couchService.put.mock.calls[0][1];

  beforeEach(() => {
    couchService = {
      put: vi.fn(() => of({ ok: true })),
      get: vi.fn(() => of({ _id: 'org.couchdb.user:admin', name: 'admin', roles: [] }))
    };
    service = new UserService(
      couchService as any as CouchService,
      { configuration: { _id: 'configuration', adminName: 'other@local', code: 'local' }, requestData: vi.fn() } as any as StateService
    );
    service.set({ _id: 'org.couchdb.user:admin', name: 'admin', roles: [ 'manager' ] });
    service.credentials = adminCredentials;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('updateUser', () => {
    // TEMP NOTE (for review, strip before merge): this is the lockout described in
    // user.service.ts. The profile view strips credential fields before handing a doc to a
    // caller, so an admin editing that copy used to write their own password hash onto it.
    it('does not fall back to the editor credentials when saving another user', () => {
      service.updateUser({ _id: 'org.couchdb.user:ann', name: 'ann', roles: [] }).subscribe();

      expect(putBody().derived_key).toBeUndefined();
      expect(putBody().salt).toBeUndefined();
    });

    it('keeps the credential fallback for the logged in user own doc', () => {
      service.updateUser({ _id: 'org.couchdb.user:admin', name: 'admin', roles: [] }).subscribe();

      expect(putBody().derived_key).toBe('admin-key');
    });

    it('prefers the credentials already on the doc over the fallback', () => {
      service.updateUser({ _id: 'org.couchdb.user:admin', name: 'admin', roles: [], derived_key: 'own-key' }).subscribe();

      expect(putBody().derived_key).toBe('own-key');
    });

    it('strips underscore prefixed roles and writes to the user document id', () => {
      service.updateUser({ _id: 'org.couchdb.user:ann', name: 'ann', roles: [ '_admin', 'learner' ] }).subscribe();

      expect(couchService.put.mock.calls[0][0]).toBe('_users/org.couchdb.user:ann');
      expect(putBody().roles).toEqual([ 'learner' ]);
    });
  });

});
