export const memberCompare = (member1, member2) => member1.userId === member2.userId && member1.userPlanetCode === member2.userPlanetCode;

export const compareFunc = (member1, member2) => {
  const name1 = member1.userDoc.doc.lastName;
  const name2 = member2.userDoc.doc.lastName;
  if (name1 && name2) {
    return name1 < name2 ? -1 : 1;
  }
  return member1.userDoc._id < member2.userDoc._id ? -1 : 1;
};
