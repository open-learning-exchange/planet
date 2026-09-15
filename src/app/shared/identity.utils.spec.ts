import { userIdentity, userIdentityCandidates } from './identity.utils';

describe('user identity utilities', () => {
  it('keeps native and associated same-named accounts distinct by origin', () => {
    expect(userIdentity({ _id: 'org.couchdb.user:alex', name: 'alex', planetCode: 'nation' }, 'nation'))
      .toEqual({ userId: 'org.couchdb.user:alex', userPlanetCode: 'nation' });
    expect(userIdentity({
      _id: 'org.couchdb.user:alex@community', name: 'alex@community', planetCode: 'community', requestId: 'request-1'
    }, 'nation')).toEqual({ userId: 'org.couchdb.user:alex', userPlanetCode: 'community' });
  });

  it('uses couchId as the replicated user stable id', () => {
    expect(userIdentity({
      _id: 'alex@community',
      couchId: 'org.couchdb.user:alex',
      planetCode: 'community'
    }, 'nation')).toEqual({
      userId: 'org.couchdb.user:alex',
      userPlanetCode: 'community'
    });
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
