const identitySource = (user: any) => user?.doc ?
  { ...user.doc, _id: user.doc._id || user._id } :
  user;

// Replicated users carry their original CouchDB ID in couchId. Associated accounts are
// materialized locally with an @planet suffix, which is routing data rather than part of
// the user's stable identity.
export const canonicalUserId = (user: object, fallbackPlanetCode?: string): string => {
  const source = identitySource(user);
  const userId = source?.couchId || source?.userId || source?._id;
  const planetCode = source?.userPlanetCode || source?.planetCode || fallbackPlanetCode;
  const associatedSuffix = planetCode ? `@${planetCode}` : '';
  const isAssociatedAccount = !!((source?.requestId || source?.sync) && associatedSuffix &&
    source?.name?.endsWith(associatedSuffix) && userId?.endsWith(associatedSuffix));
  return isAssociatedAccount ? userId.slice(0, -associatedSuffix.length) : userId;
};

// Authorization needs both the stable CouchDB identity and its explicit origin. The server code is
// only a fallback for native/legacy user objects that do not carry an origin of their own.
export const userIdentity = (user: object, fallbackPlanetCode?: string) => {
  const source = identitySource(user);
  return {
    userId: canonicalUserId(source, fallbackPlanetCode),
    userPlanetCode: source?.userPlanetCode || source?.planetCode || fallbackPlanetCode
  };
};

// Pre-normalization membership rows can carry the locally materialized @planet ID. Keep both IDs
// paired with the account's single origin when reading or deleting existing identity documents.
export const userIdentityCandidates = (user: object, fallbackPlanetCode?: string) => {
  const source = identitySource(user);
  const identity = userIdentity(source, fallbackPlanetCode);
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
