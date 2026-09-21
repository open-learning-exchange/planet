import { identityPlanetCode, userIdentity, userIdentityCandidates } from './identity.utils';

describe('user identity utilities', () => {
  it('resolves an explicit origin before the team origin, and a blank or missing one from the team', () => {
    const row = { userId: 'org.couchdb.user:alex', teamPlanetCode: 'nation' };
    expect(identityPlanetCode({ ...row, userPlanetCode: 'community' }, 'server')).toBe('community');
    expect(identityPlanetCode({ ...row, planetCode: 'community' }, 'server')).toBe('community');
    expect(identityPlanetCode({ ...row, userPlanetCode: '' }, 'server')).toBe('nation');
    expect(identityPlanetCode(row, 'server')).toBe('nation');
    expect(identityPlanetCode({ userId: row.userId }, 'server')).toBe('server');
  });

  it('keeps native and associated same-named accounts distinct by origin', () => {
    expect(userIdentity({ _id: 'org.couchdb.user:alex', name: 'alex', planetCode: 'nation' }, 'nation'))
      .toEqual({ userId: 'org.couchdb.user:alex', userPlanetCode: 'nation' });
    expect(userIdentity({
      _id: 'org.couchdb.user:alex@community', name: 'alex@community', planetCode: 'community', requestId: 'request-1'
    }, 'nation')).toEqual({ userId: 'org.couchdb.user:alex', userPlanetCode: 'community' });
  });

  it('uses couchId as a replica\'s stable id and derives its materialized id rather than reusing the replica id', () => {
    expect(userIdentityCandidates({
      _id: 'alex@community',
      couchId: 'org.couchdb.user:alex',
      planetCode: 'community'
    }, 'nation')).toEqual([
      { userId: 'org.couchdb.user:alex', userPlanetCode: 'community' },
      { userId: 'org.couchdb.user:alex@community', userPlanetCode: 'community' },
      { userId: 'org.couchdb.user:alex@community', userPlanetCode: 'nation' }
    ]);
  });

  it('retains a historical materialized id as a read compatibility candidate', () => {
    expect(userIdentityCandidates({
      _id: 'org.couchdb.user:alex@community',
      name: 'alex@community',
      planetCode: 'community',
      requestId: 'request-1'
    }, 'nation')).toEqual([
      { userId: 'org.couchdb.user:alex', userPlanetCode: 'community' },
      { userId: 'org.couchdb.user:alex@community', userPlanetCode: 'community' },
      { userId: 'org.couchdb.user:alex@community', userPlanetCode: 'nation' }
    ]);
  });
});
