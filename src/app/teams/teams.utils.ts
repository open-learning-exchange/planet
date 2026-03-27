export const memberCompare = (member1, member2) => member1.userId === member2.userId && member1.userPlanetCode === member2.userPlanetCode;

/**
 * Shared name comparator key for member-like docs so external modules can apply consistent team-member sorting.
 */
export const memberSortName = (member) =>
  member?.userDoc?.doc?.lastName || member?.userDoc?.lastName || member?.userDoc?.fullName || member?.name || member?.userId?.split(':')[1] || '';

export const memberNameCompare = (member1, member2) => memberSortName(member1).localeCompare(memberSortName(member2));

export const memberSort = (member1, member2, leader) => memberCompare(member1, leader) ?
  -1 :
  memberCompare(member2, leader) ?
    1 :
    memberNameCompare(member1, member2);

export const convertUtcDate = (date) => {
  const dateObj = new Date(date);
  return date ? new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()) : undefined;
};
