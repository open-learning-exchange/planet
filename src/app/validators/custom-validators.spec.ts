import { FormControl, FormGroup } from '@angular/forms';
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

describe('CustomValidators.atLeastOneTruthy', () => {
  it('requires at least one named control to be truthy', () => {
    const form = new FormGroup({
      first: new FormControl(false),
      second: new FormControl(false)
    });
    const validator = CustomValidators.atLeastOneTruthy([ 'first', 'second' ]);

    expect(validator(form)).toEqual({ required: true });
    form.controls.second.setValue(true);
    expect(validator(form)).toBeNull();
  });
});
