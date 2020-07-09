export const memberCompare = (member1, member2) => member1.userId === member2.userId && member1.userPlanetCode === member2.userPlanetCode;

export const compareFunc = (member1, member2) => {
  const name1 = member1.userDoc && member1.userDoc.doc.lastName ? member1.userDoc.doc.lastName : member1.userId;
  const name2 = member2.userDoc && member2.userDoc.doc.lastName ? member2.userDoc.doc.lastName : member2.userId;
  return name1.localeCompare(name2);
};
