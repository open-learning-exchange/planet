import { identityMatches } from '../shared/identity.utils';

// Keep the resolved view identity behind one accessor so consumers cannot accidentally forget the
// fallback or reverse its precedence. Explicitly stored identity always wins.
export const memberPlanetCode = (member: any): string | undefined =>
  member?.userPlanetCode || member?.resolvedUserPlanetCode;

// Membership rows written before an explicit planet code was stored carry none. Their origin is the
// team's own planet, never the planet of whoever happens to be viewing the row.
export const memberIdentity = (member: any, team?: any) => ({
  userId: member?.userId,
  userPlanetCode: memberPlanetCode(member) || team?.teamPlanetCode
});

const memberNameCompare = (member1, member2) => {
  const memberName = (member) =>
    (member.userDoc && member.userDoc.doc.lastName) || (member.userId || '').split(':')[1] || member.userId || '';
  return memberName(member1).localeCompare(memberName(member2));
};

// Single composite-identity comparison for members. Delegates to the task comparator so a member card,
// a task assignment and a leadership check can never disagree about who a user is.
export const memberCompare = (member1, member2, localPlanetCode?: string) =>
  Boolean(member1?.userId) && identityMatches(member1, member2 || {}, localPlanetCode);

export const teamIdentityDocs = (docs: any[], team: any, identity: any | any[], fallbackPlanetCode?: string) => {
  const identities = Array.isArray(identity) ? identity : [ identity ];
  return docs.filter(doc => doc.teamId === team._id && identities.some(candidate => memberCompare(
    doc, candidate, team.teamPlanetCode || fallbackPlanetCode
  )));
};

export const requestDateCompare = (request1, request2) =>
  (request1.createdDate || 0) - (request2.createdDate || 0) ||  (request1.userId || '').localeCompare(request2.userId || '');

export const enterpriseJoinAgreement = () =>
  $localize`By requesting to join, you agree to follow this \
enterprise's rules and guidelines.`;

export const memberSort = (member1, member2, leader, localPlanetCode?: string) => memberCompare(member1, leader, localPlanetCode) ?
  -1 :
  memberCompare(member2, leader, localPlanetCode) ?
    1 :
    memberNameCompare(member1, member2);

export const convertUtcDate = (date) => {
  const dateObj = new Date(date);
  return date ? new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()) : undefined;
};
