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
