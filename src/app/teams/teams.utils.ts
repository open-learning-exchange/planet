export const memberCompare = (member1, member2) => member1.userId === member2.userId && member1.userPlanetCode === member2.userPlanetCode;

export const memberNameCompare = (member1, member2) => {
  const memberName = (member) => {
    const fallbackUserId = member?.userId || '';
    const splitUserId = fallbackUserId.includes(':') ? fallbackUserId.split(':')[1] : fallbackUserId;
    return (member.userDoc && member.userDoc.doc.lastName) || splitUserId;
  };
  return memberName(member1).localeCompare(memberName(member2));
};

export const memberSort = (member1, member2, leader) => memberCompare(member1, leader) ?
  -1 :
  memberCompare(member2, leader) ?
    1 :
    memberNameCompare(member1, member2);

export const convertUtcDate = (date) => {
  const dateObj = new Date(date);
  return date ? new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()) : undefined;
};
