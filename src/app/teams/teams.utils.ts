import { identityMatches, identityPlanetCode } from '../shared/identity.utils';

export const memberIdentity = (member: any, team?: any) => ({
  userId: member?.userId,
  userPlanetCode: identityPlanetCode(member, team?.teamPlanetCode)
});

const memberNameCompare = (member1, member2) => {
  const memberName = (member) =>
    (member.userDoc && member.userDoc.doc.lastName) || (member.userId || '').split(':')[1] || member.userId || '';
  return memberName(member1).localeCompare(memberName(member2));
};

export const memberCompare = (member1, member2, localPlanetCode?: string) => identityMatches(member1, member2, localPlanetCode);

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
