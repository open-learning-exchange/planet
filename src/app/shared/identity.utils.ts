const identitySource = (user: any) => user?.doc ? { ...user.doc, _id: user.doc._id || user._id } : user;

// Membership and request rows stored without a code belong to their team's origin.
export const identityPlanetCode = (identity: any, fallbackPlanetCode?: string) =>
  identity?.userPlanetCode || identity?.planetCode || identity?.teamPlanetCode || fallbackPlanetCode;

// Associated accounts are materialized locally with an @planet suffix that is not part of their identity.
const canonicalUserId = (user: object, fallbackPlanetCode?: string): string => {
  const source = identitySource(user);
  const userId = source?.couchId || source?.userId || source?._id;
  const planetCode = identityPlanetCode(source, fallbackPlanetCode);
  const associatedSuffix = planetCode ? `@${planetCode}` : '';
  const isAssociatedAccount = !!((source?.requestId || source?.sync) && associatedSuffix &&
    source?.name?.endsWith(associatedSuffix) && userId?.endsWith(associatedSuffix));
  return isAssociatedAccount ? userId.slice(0, -associatedSuffix.length) : userId;
};

export const userIdentity = (user: object, fallbackPlanetCode?: string) => {
  const source = identitySource(user);
  return {
    userId: canonicalUserId(source, fallbackPlanetCode),
    userPlanetCode: identityPlanetCode(source, fallbackPlanetCode)
  };
};

// Rows written before ID normalization carry an associated account's materialized @planet ID, under either origin.
// A replica (couchId) of another planet's account names that same materialized ID.
export const userIdentityCandidates = (user: object, fallbackPlanetCode?: string) => {
  const source = identitySource(user);
  const identity = userIdentity(source, fallbackPlanetCode);
  if (!identity.userId) {
    return [];
  }
  const candidates = [ identity ];
  const materializedId = source.requestId || source.sync ? source._id :
    source.couchId ? `${identity.userId}@${identity.userPlanetCode}` : undefined;
  if (materializedId && materializedId !== identity.userId) {
    candidates.push({ ...identity, userId: materializedId });
    if (fallbackPlanetCode && fallbackPlanetCode !== identity.userPlanetCode) {
      candidates.push({ userId: materializedId, userPlanetCode: fallbackPlanetCode });
    }
  }
  return candidates;
};

export const identityMatches = (identity1: any, identity2: any, fallbackPlanetCode?: string) =>
  Boolean(identity1?.userId) && identity1.userId === identity2?.userId &&
  identityPlanetCode(identity1, fallbackPlanetCode) === identityPlanetCode(identity2, fallbackPlanetCode);

export const identityKey = (identity: any, fallbackPlanetCode?: string): string => identity?.userId ?
  `${identity.userId}\u0000${identityPlanetCode(identity, fallbackPlanetCode) || ''}` : '';

export const matchesUserIdentity = (row: any, user: object, serverPlanetCode?: string) =>
  userIdentityCandidates(user, serverPlanetCode).some(identity => identityMatches(row, identity, serverPlanetCode));

/** Supports raw user docs, replicated fullUserDoc wrappers, and team-member rows. */
export const notificationRecipient = (user: any, legacyPlanetCode?: string) => {
  const identity = userIdentity(user, legacyPlanetCode);
  return {
    user: identity.userId,
    ...(identity.userPlanetCode ? { userPlanetCode: identity.userPlanetCode } : {})
  };
};

export const teamIdentityDocs = (docs: any[], team: any, identities: any[], fallbackPlanetCode?: string) =>
  docs.filter(doc => doc.teamId === team._id && identities.some(candidate => identityMatches(
    doc, candidate, team.teamPlanetCode || fallbackPlanetCode
  )));
