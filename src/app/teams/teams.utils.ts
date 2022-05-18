export const memberCompare = (member1, member2) => member1.userId === member2.userId && member1.userPlanetCode === member2.userPlanetCode;

export const memberNameCompare = (member1, member2) => {
  const memberName = (member) => (member.userDoc && member.userDoc.doc.lastName) || member.userId.split(':')[1];
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

export const mapNews = (news, teamId) => {
  return news.map(post => ({
        ...post, public: ((post.doc.viewIn || []).find(view => view._id === teamId) || {}).public
      }));
};
