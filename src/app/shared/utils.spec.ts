import { ageFromBirthDate } from './utils';

describe('ageFromBirthDate', () => {
  it('should calculate age correctly', () => {
    const birthDate = '2000-01-01';
    const currentTime = new Date('2023-01-01').getTime();
    expect(ageFromBirthDate(currentTime, birthDate)).toBe(23);
  });

  it('should calculate age correctly when birthday has not passed in the current year', () => {
    const birthDate = '2000-12-31';
    const currentTime = new Date('2023-01-01').getTime();
    expect(ageFromBirthDate(currentTime, birthDate)).toBe(22);
  });

  it('should calculate age correctly when birthday has not passed in the current year but day of week is later', () => {
    // Birthday: Oct 15, 2000 (Sunday, day 0).
    // Current: Oct 10, 2023 (Tuesday, day 2).
    // Birthday NOT passed in 2023 (Oct 10 < Oct 15).
    const birthDate = '2000-10-15';
    const currentTime = new Date('2023-10-10').getTime();
    expect(ageFromBirthDate(currentTime, birthDate)).toBe(22);
  });
});
