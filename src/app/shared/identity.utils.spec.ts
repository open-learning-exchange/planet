import { canonicalUserId, userIdentity } from './identity.utils';

describe('user identity utilities', () => {
  it('keeps native and associated same-named accounts distinct by origin', () => {
    const native = userIdentity({
      _id: 'org.couchdb.user:alex',
      name: 'alex',
      planetCode: 'nation'
    }, 'nation');
    const associated = userIdentity({
      _id: 'org.couchdb.user:alex@community',
      name: 'alex@community',
      planetCode: 'community',
      requestId: 'request-1'
    }, 'nation');

    expect(native).toEqual({
      userId: 'org.couchdb.user:alex',
      userPlanetCode: 'nation'
    });
    expect(associated).toEqual({
      userId: 'org.couchdb.user:alex',
      userPlanetCode: 'community'
    });
  });

  it('uses the wrapper id when a full user document omits its own id', () => {
    const user = {
      _id: 'org.couchdb.user:alex',
      doc: { planetCode: 'community' }
    };

    expect(canonicalUserId(user)).toBe(user._id);
    expect(userIdentity(user, 'nation')).toEqual({
      userId: user._id,
      userPlanetCode: 'community'
    });
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
});
