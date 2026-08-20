import { FormControl } from '@angular/forms';
import { CustomValidators } from './custom-validators';

describe('CustomValidators.integerValidator', () => {
  it('returns null for empty or valid integer values', () => {
    expect(CustomValidators.integerValidator(new FormControl(''))).toBeNull();
    expect(CustomValidators.integerValidator(new FormControl(null))).toBeNull();
    expect(CustomValidators.integerValidator(new FormControl(2024))).toBeNull();
    expect(CustomValidators.integerValidator(new FormControl('2024'))).toBeNull();
  });

  it('returns invalidInt for non-integers, decimals, and text', () => {
    expect(CustomValidators.integerValidator(new FormControl('asdf'))).toEqual({ invalidInt: true });
    expect(CustomValidators.integerValidator(new FormControl('2024.5'))).toEqual({ invalidInt: true });
    expect(CustomValidators.integerValidator(new FormControl(2024.5))).toEqual({ invalidInt: true });
  });
});
