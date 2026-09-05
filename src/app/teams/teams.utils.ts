const memberNameCompare = (member1, member2) => {
  const memberName = (member) =>
    (member.userDoc && member.userDoc.doc.lastName) || (member.userId || '').split(':')[1] || member.userId || '';
  return memberName(member1).localeCompare(memberName(member2));
};

export const memberCompare = (member1, member2) => member1.userId === member2.userId && member1.userPlanetCode === member2.userPlanetCode;

export const requestDateCompare = (request1, request2) =>
  (request1.createdDate || 0) - (request2.createdDate || 0) ||  (request1.userId || '').localeCompare(request2.userId || '');

// Teams created before a limit was stored, and teams synced up from myPlanet, can arrive with no
// limit or a limit of 0.  Treating that literally makes `members.length >= limit` true from the
// start, which greys out the Accept button on every join request while Reject stays live.
export const defaultTeamLimit = 12;

export const isTeamFull = (memberCount: number, limit) =>
  memberCount >= (typeof limit === 'number' && limit > 0 ? limit : defaultTeamLimit);

export const enterpriseJoinAgreement = () =>
  $localize`By requesting to join, you agree to follow this \
enterprise's rules and guidelines.`;

export const memberSort = (member1, member2, leader) => memberCompare(member1, leader) ?
  -1 :
  memberCompare(member2, leader) ?
    1 :
    memberNameCompare(member1, member2);

export const convertUtcDate = (date) => {
  const dateObj = new Date(date);
  return date ? new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()) : undefined;
};
