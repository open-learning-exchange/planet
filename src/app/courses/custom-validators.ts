import { FormControl } from '@angular/forms';

export class CustomValidators {
  static isValidNumber(fc: FormControl) {
    if (fc.value.match(/^\d+$/)) {
      return null;
    }

    return { invalidNumber: true };
  }
}
