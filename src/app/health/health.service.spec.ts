import { HealthService } from './health.service';
import { stringToHex } from '../shared/utils';

describe('HealthService', () => {
  const stateService = { configuration: { code: 'pl-1' } } as any;
  const couchService = {} as any;
  const usersService = { requestUsers: () => {} } as any;
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService(couchService, stateService, usersService);
  });

  it('builds CouchDB user db names with encoded values', () => {
    const userId = 'org.couchdb.user:alice';

    expect(service.userDatabaseName(userId)).toBe(`userdb-${stringToHex('pl-1')}-${stringToHex('alice')}`);
  });

  it('decodes encoded user db names back to user ids', () => {
    const userDb = `userdb-${stringToHex('pl-1')}-${stringToHex('alice')}`;

    expect(service.userIdFromDatabaseName(userDb)).toBe('org.couchdb.user:alice');
  });

  it('returns null when user db name has a different encoded planet code', () => {
    const otherUserDb = `userdb-${stringToHex('other')}-${stringToHex('alice')}`;

    expect(service.userIdFromDatabaseName(otherUserDb)).toBeNull();
  });
});
