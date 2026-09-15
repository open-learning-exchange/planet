export const identitySource = (user: any) => user?.doc ? { ...user.doc, _id: user.doc._id || user._id } : user;

// Associated accounts are materialized locally with an @planet suffix that is not part of their identity.
export const canonicalUserId = (user: object, fallbackPlanetCode?: string): string => {
  const source = identitySource(user);
  const userId = source?.couchId || source?.userId || source?._id;
  const planetCode = source?.userPlanetCode || source?.planetCode || fallbackPlanetCode;
  const associatedSuffix = planetCode ? `@${planetCode}` : '';
  const isAssociatedAccount = !!((source?.requestId || source?.sync) && associatedSuffix &&
    source?.name?.endsWith(associatedSuffix) && userId?.endsWith(associatedSuffix));
  return isAssociatedAccount ? userId.slice(0, -associatedSuffix.length) : userId;
};

export const userIdentity = (user: object, fallbackPlanetCode?: string) => {
  const source = identitySource(user);
  return {
    userId: canonicalUserId(source, fallbackPlanetCode),
    userPlanetCode: source?.userPlanetCode || source?.planetCode || fallbackPlanetCode
  };
};

// Rows written before ID normalization carry the materialized @planet ID, under either origin.
export const userIdentityCandidates = (user: object, fallbackPlanetCode?: string) => {
  const source = identitySource(user);
  const identity = userIdentity(source, fallbackPlanetCode);
  if (!identity.userId) {
    return [];
  }
  const candidates = [ identity ];
  if (source?._id && source._id !== identity.userId) {
    candidates.push({ ...identity, userId: source._id });
    if (fallbackPlanetCode && fallbackPlanetCode !== identity.userPlanetCode) {
      candidates.push({ userId: source._id, userPlanetCode: fallbackPlanetCode });
    }
  }
  return candidates;
};

export const identityPlanetCode = (identity: any, fallbackPlanetCode?: string) =>
  identity?.userPlanetCode || identity?.resolvedUserPlanetCode || identity?.planetCode || fallbackPlanetCode;

export const identityMatches = (identity1: any, identity2: any, fallbackPlanetCode?: string) =>
  identity1?.userId === identity2?.userId &&
  identityPlanetCode(identity1, fallbackPlanetCode) === identityPlanetCode(identity2, fallbackPlanetCode);

export const identityKey = (identity: any, fallbackPlanetCode?: string): string => identity?.userId ?
  `${identity.userId}\u0000${identityPlanetCode(identity, fallbackPlanetCode) || ''}` : '';

export const matchesUserIdentity = (row: any, user: object, serverPlanetCode?: string, rowPlanetCode = serverPlanetCode) =>
  Boolean(row?.userId) &&
  userIdentityCandidates(user, serverPlanetCode).some(identity => identityMatches(row, identity, rowPlanetCode));
