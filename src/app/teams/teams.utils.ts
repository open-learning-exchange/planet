export const memberCompare = (member1, member2) => member1.userId === member2.userId && member1.userPlanetCode === member2.userPlanetCode;

export const memberNameCompare = (member1, member2) => {
  const memberName = (member) =>
    (member.userDoc && member.userDoc.doc.lastName) || (member.userId || '').split(':')[1] || member.userId || '';
  return memberName(member1).localeCompare(memberName(member2));
};

export const requestDateCompare = (request1, request2) =>
  (request1.createdDate || 0) - (request2.createdDate || 0) ||
  (request1.userId || '').localeCompare(request2.userId || '');

export const memberSort = (member1, member2, leader) => memberCompare(member1, leader) ?
  -1 :
  memberCompare(member2, leader) ?
    1 :
    memberNameCompare(member1, member2);

export const convertUtcDate = (date) => {
  const dateObj = new Date(date);
  return date ? new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()) : undefined;
};
