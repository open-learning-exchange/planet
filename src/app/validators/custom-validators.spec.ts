import { FormControl } from '@angular/forms';
import { CustomValidators } from './custom-validators';

describe('CustomValidators', () => {
  describe('integerValidator', () => {
    it.each([
      { desc: 'null value', input: null, expected: null },
      { desc: 'undefined value', input: undefined, expected: null },
      { desc: 'empty string', input: '', expected: null },
      { desc: 'valid integer number (2024)', input: 2024, expected: null },
      { desc: 'valid integer number (0)', input: 0, expected: null },
      { desc: 'valid integer number (-5)', input: -5, expected: null },
      { desc: 'valid integer string ("2024")', input: '2024', expected: null },
      { desc: 'valid integer string ("0")', input: '0', expected: null },
      { desc: 'valid integer string ("-100")', input: '-100', expected: null },
      { desc: 'decimal number (2024.5)', input: 2024.5, expected: { invalidInt: true } },
      { desc: 'decimal string ("2024.5")', input: '2024.5', expected: { invalidInt: true } },
      { desc: 'non-numeric string ("asdf")', input: 'asdf', expected: { invalidInt: true } },
      { desc: 'alphanumeric string ("2024a")', input: '2024a', expected: { invalidInt: true } },
      { desc: 'whitespace-only string ("   ")', input: '   ', expected: { invalidInt: true } },
      { desc: 'padded integer string ("  2024 ")', input: '  2024 ', expected: { invalidInt: true } },
      { desc: 'NaN value', input: NaN, expected: { invalidInt: true } },
      { desc: 'Infinity value', input: Infinity, expected: { invalidInt: true } }
    ])('should validate $desc correctly', ({ input, expected }) => {
      const control = new FormControl(input);
      expect(CustomValidators.integerValidator(control)).toEqual(expected);
    });
  });

  describe('spaceValidator', () => {
    it('returns null when there is no whitespace', () => {
      const control = new FormControl('validPassword123');
      expect(CustomValidators.spaceValidator(control)).toBeNull();
    });

    it('returns error when whitespace is present', () => {
      const control = new FormControl('invalid password');
      expect(CustomValidators.spaceValidator(control)).toEqual({ whitespace: true });
    });
  });

  describe('required', () => {
    it('returns null for non-empty string', () => {
      const control = new FormControl('Title');
      expect(CustomValidators.required(control)).toBeNull();
    });

    it('returns error for empty or whitespace-only string', () => {
      expect(CustomValidators.required(new FormControl(''))).toEqual({ required: true });
      expect(CustomValidators.required(new FormControl('   '))).toEqual({ required: true });
      expect(CustomValidators.required(new FormControl(null))).toEqual({ required: true });
    });
  });
});
