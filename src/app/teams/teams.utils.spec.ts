import { fromMinorUnits, roundCurrency, sumCurrency, toMinorUnits } from './teams.utils';

describe('teams currency utils', () => {

  describe('toMinorUnits', () => {

    it('converts decimal amounts to whole cents', () => {
      expect(toMinorUnits(0.3)).toBe(30);
      expect(toMinorUnits(1234.56)).toBe(123456);
      expect(toMinorUnits('12.34')).toBe(1234);
    });

    it('rounds half away from zero without floating point drift', () => {
      expect(toMinorUnits(1.005)).toBe(101);
      expect(toMinorUnits(-1.005)).toBe(-101);
    });

    it('treats missing and non-numeric amounts as zero', () => {
      expect(toMinorUnits(undefined)).toBe(0);
      expect(toMinorUnits(null)).toBe(0);
      expect(toMinorUnits('')).toBe(0);
      expect(toMinorUnits('abc')).toBe(0);
    });

  });

  describe('sumCurrency', () => {

    it('adds amounts that drift when summed as floats', () => {
      expect(0.1 + 0.2).not.toBe(0.3);
      expect(sumCurrency([ 0.1, 0.2 ])).toBe(0.3);
      expect(sumCurrency([ 0.7, 0.1 ])).toBe(0.8);
    });

    it('stays exact over a long list of two decimal amounts', () => {
      expect(sumCurrency(new Array(1000).fill(0.01))).toBe(10);
    });

    it('skips amounts that are missing', () => {
      expect(sumCurrency([ 1.5, undefined, null, 2.25 ])).toBe(3.75);
    });

  });

  describe('roundCurrency', () => {

    it('resolves a difference that should be zero to exactly zero', () => {
      const balance = 0.3 - (0.1 + 0.2);
      expect(balance).toBeLessThan(0);
      expect(roundCurrency(balance)).toBe(0);
      expect(roundCurrency(balance) < 0).toBe(false);
    });

    it('leaves genuinely negative balances negative', () => {
      expect(roundCurrency(0.3 - 0.4)).toBe(-0.1);
    });

  });

  describe('fromMinorUnits', () => {

    it('converts cents back to a decimal amount', () => {
      expect(fromMinorUnits(30)).toBe(0.3);
      expect(fromMinorUnits(-105)).toBe(-1.05);
    });

  });

});
