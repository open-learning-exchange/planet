const memberNameCompare = (member1, member2) => {
  const memberName = (member) =>
    (member.userDoc && member.userDoc.doc.lastName) || (member.userId || '').split(':')[1] || member.userId || '';
  return memberName(member1).localeCompare(memberName(member2));
};

export const memberCompare = (member1, member2) => member1.userId === member2.userId && member1.userPlanetCode === member2.userPlanetCode;

export const requestDateCompare = (request1, request2) =>
  (request1.createdDate || 0) - (request2.createdDate || 0) ||  (request1.userId || '').localeCompare(request2.userId || '');

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

// Monetary amounts are stored as decimal numbers, which cannot be represented exactly in binary floating point, so
// accumulating them directly compounds drift. Totals rounded to two decimals still display correctly, but the raw
// value also drives sign comparisons, where a drifted zero reads as negative. Converting to integer minor units
// (cents) keeps the accumulation exact, so finance figures are added and subtracted through the helpers below.
const minorUnitFactor = 100;

export const toMinorUnits = (amount) => {
  const value = +amount;
  if (!Number.isFinite(value)) {
    return 0;
  }
  // toFixed pulls values such as 1.005 * 100 = 100.49999999999999 back to the decimal they were entered as before
  // rounding, and rounding the magnitude keeps negative amounts symmetrical with positive ones.
  const scaled = +(value * minorUnitFactor).toFixed(4);
  const magnitude = Math.round(Math.abs(scaled));
  return scaled < 0 ? -magnitude : magnitude;
};

export const fromMinorUnits = (minorUnits: number) => minorUnits / minorUnitFactor;

export const roundCurrency = (amount) => fromMinorUnits(toMinorUnits(amount));

export const sumCurrency = (amounts: any[]) =>
  fromMinorUnits(amounts.reduce((total: number, amount) => total + toMinorUnits(amount), 0));
