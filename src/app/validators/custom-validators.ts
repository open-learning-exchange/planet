import { ValidatorFn, AbstractControl, ValidationErrors, Validators, FormGroup, FormControl } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

const isStringEdgeCase = (string: string) => {
  return string.trim() === '' || string.trim() !== string;
};

export class CustomValidators {

  // these validators are for cases when the browser does not support input type=date,time and color and the browser falls back to type=text
  static integerValidator(ac: AbstractControl<number | string | null>): ValidationErrors | null {
    const error = { invalidInt: true };
    const isValidInt = (number: number) => Number.isInteger(number) ? null : error;
    // Handle edge cases like Number(' ') => 0 and Number('  10 ') => 10
    return typeof ac.value !== 'string' ?
      isValidInt(ac.value) :
      isStringEdgeCase(ac.value) ?
      error :
      isValidInt(Number(ac.value));
  }

  static spaceValidator(ac: AbstractControl<string | null>): ValidationErrors | null {
    const value = ac.value ?? '';
    return value.replace(/\s/g, '') === value ? null : { whitespace: true };
  }

  static bpValidator(ac: AbstractControl<string | null>): ValidationErrors | null {
    const value = ac.value ?? '';
    return !value || /^\d{1,3}\/\d{1,3}$/.test(value) ? null : { bp: true };
  }

  static positiveNumberValidator(ac: AbstractControl<number | null>): ValidationErrors | null {
    if (!ac.value) {
      return null;
    }
    return (ac.value > 0) ? null : { invalidPositive : true };
  }

  static nonNegativeNumberValidator(ac: AbstractControl<number | null>): ValidationErrors | null {
    if (!ac.value) {
      return null;
    }
    return (ac.value >= 0) ? null : { invalidPositive: true };
  }

  static choiceSelected(requireCorrect: boolean) {
    // This validator expects a string (single select) or string[] (multi-select) control value.
    return (ac: AbstractControl<string[] | string | null>): ValidationErrors | null => {
      if (!ac.parent || !requireCorrect) {
        return null;
      }

      const inputtype = ac.parent.get('type');
      const hasNoSelection = !ac.value || ac.value.length === 0;

      if ((inputtype?.value === 'select' || inputtype?.value === 'selectMultiple') && hasNoSelection) {
        return { required: true };
      } else {
        return null;
      }
    };
  }

  // Allows us to supply a different errorType for specific patterns
  static pattern(pattern: string | RegExp, errorType = 'pattern') {
    return (ac: AbstractControl<string | null>): ValidationErrors | null => {
      return Validators.pattern(pattern)(ac) ? { [errorType]: true } : null;
    };
  }

  // for validating whether end date comes before start date or not
  static endDateValidator(): ValidatorFn {
    let startDate: AbstractControl<Date | string | null>;
    let endDate: AbstractControl<Date | string | null>;

    // for unsubscribing from Observables
    const ngUnsubscribe: Subject<void> = new Subject<void>();

    return (ac: AbstractControl<Date | string | null>): ValidationErrors | null => {
      if (!ac.parent) {
        return null;
      }

      if (!endDate) {
        endDate = ac;
        startDate = ac.parent.get('startDate');
        if (!startDate) {
          throw new Error(
            $localize`validateDates(): startDate control is not found in parent group`
          );
        }

        // run validators again on when start date's value changes
        startDate.valueChanges.pipe(takeUntil(ngUnsubscribe)).subscribe(() => {
          endDate.updateValueAndValidity();
        });
      }

      // if start date has not been given a value yet return back
      if (!startDate || !endDate.value) {
        return null;
      }

      // converts value from input type=date to Date obj for easy comparision
      if (
        new Date(startDate.value).getTime() > new Date(endDate.value).getTime()
      ) {
        return { invalidEndDate: true };
      }

      return null;
    };
  }

  private static formError(ac: AbstractControl, error: string, newError: boolean): ValidationErrors | null {
    if (ac.status === 'INVALID' && ac.errors && Object.keys(ac.errors).some(key => key !== error)) {
      return ac.errors;
    }
    return newError ? { [error]: newError } : null;
  }

  private static setFormError(ac: AbstractControl, error: string, newError: boolean): void {
    ac.setErrors(this.formError(ac, error, newError));
  }

  private static formDateToString(ac: AbstractControl<Date | string | null>): string {
    return (ac.value ?? '').toString();
  }

  // Start time becomes required if end time exists
  // End time becomes required for multi day events with a start time
  static meetupTimeValidator(): ValidatorFn {

    return (formGroup: FormGroup): ValidationErrors | null => {
      if (!formGroup) {
        return null;
      }

      const startTime = formGroup.get('startTime');
      const endTime = formGroup.get('endTime');
      const startDate = formGroup.get('startDate');
      const endDate = formGroup.get('endDate');

      if (!startTime || !endTime || !startDate || !endDate) {
        return null;
      }

      this.setFormError(startTime, 'required', !!formGroup.get('endTime').value && !startTime.value);
      this.setFormError(endTime, 'required',
        this.formDateToString(startDate) !== this.formDateToString(endDate) &&
        endDate.value &&
        startTime.value &&
        !endTime.value
      );
      this.setFormError(endTime, 'invalidEndTime', this.endTimeValidator(startDate, endDate, startTime, endTime));

      return null;
    };

  }

  // for validating whether end time comes before start date or not
  private static endTimeValidator(
    startDate: AbstractControl<Date | string | null> | null,
    endDate: AbstractControl<Date | string | null> | null,
    startTime: AbstractControl<string | null> | null,
    endTime: AbstractControl<string | null> | null
  ): boolean {
    // if start time has not been given a value yet return back
    if (!startTime || !endTime.value) {
      return false;
    }

    const startDateString = new Date(startDate.value || '1970-1-1').toLocaleDateString('en-US');
    const endDateString = new Date(endDate.value || startDateString).toLocaleDateString('en-US');

    // cannot directly convert time (HH:MM) to Date object so changed it to a Unix time date
    if (
      new Date(startDateString + ' ' + startTime.value).getTime() >
      new Date(endDateString + ' ' + endTime.value).getTime()
    ) {
      return true;
    }

    return false;
  }

  static timeValidator(): ValidatorFn {
    return (ac: AbstractControl<string | null>): ValidationErrors | null => {
      const timeRegExp = new RegExp('^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$');
      if (!ac.value) {
        return null;
      }
      if (!timeRegExp.test(ac.value)) {
        return { invalidTimeFormat: true };
      }
      return null;
    };
  }

  // Set this on both password and confirmation fields so it runs when either changes
  // confirm should be true for the confirmation field validator
  // match is true by default, for unmatching passwords, match should be false
  static matchPassword(matchField: string, confirm: boolean, match: boolean = true): ValidatorFn {

    return (ac: AbstractControl<string | null>): ValidationErrors | null => {
      if (!ac.parent) {
        return null;
      }

      const matchControl = ac.parent.get(matchField),
        val1 = ac.value,
        val2 = matchControl?.value,
        confirmControl: AbstractControl<string | null> | null = confirm ? ac : matchControl,
        errorType = match ? 'matchPassword' : 'unmatchPassword';

      if (!confirmControl || !matchControl) {
        return null;
      }

      // If passwords do not match when match=true, set error for confirmation field
      // If passwords match when match=false, set error for confirmation field
      if (match === (val1 !== val2)) {
        confirmControl.setErrors({ [errorType]: false });
        // If this is set on the confirmation field, also return error
        if (confirm) {
          return { [errorType]: false };
        }
      } else {
        // Remove error
        confirmControl.setErrors(null);
      }
      return null;
    };
  }

  // matDatepicker returns null for date missing or invalid date
  // Use this validator for special date message
  static dateValidRequired(ac: AbstractControl<Date | string | null>): ValidationErrors | null {
    if (!ac.value) {
      return { dateRequired: true };
    }

    return null;
  }

  static required(ac: AbstractControl<string | null>): ValidationErrors | null {
    const value = ac.value ?? '';
    return /\S/.test(value) ? null : { 'required': true };
  }

  static requiredMarkdown(ac: AbstractControl<{ text: string }>): ValidationErrors | null {
    // Markdown editors provide a value object with a text property; coerce to a string control for reuse.
    return CustomValidators.required(new FormControl<string | null>(ac.value?.text ?? ''));
  }

  static fileMatch(ac: AbstractControl<string | null>, fileList: string[]): ValidationErrors | null {
    if (fileList.length > 1 && ac.value !== '' && !fileList.includes(ac.value)) {
      return { 'notFileMatch': true };
    }
    return null;
  }

  static validLink(ac: AbstractControl<string | null>): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return new Promise((resolve, reject) => {
      if (!ac.value) {
        resolve(null);
      } else {
        const trimmedValue = ac.value.trim();
        if (/\s/.test(trimmedValue)) {
          resolve({ 'invalidLink': true });
        } else {
          const domainRegex = /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\.[a-zA-Z]{2,})*(\/.*)?$/;
          if (!domainRegex.test(trimmedValue)) {
            resolve({ 'invalidLink': true });
          } else {
            try {
              const url = new URL(trimmedValue);
              resolve(null);
            } catch (_) {
              resolve({ 'invalidLink': true });
            }
          }
        }
      }
    });
  }

  static atLeastOneDaySelected(): ValidatorFn {
    // Control value should be the array of selected weekday identifiers.
    return (control: AbstractControl<string[] | null>): ValidationErrors | null => {
        if (!control.parent) { return null; }
        const recurringControl = control.parent.get('recurring');
        if (!recurringControl || recurringControl.value !== 'weekly') {
            return null;
        }
        const selectedDays = control.value;
        return selectedDays && selectedDays.length > 0 ? null : { noDaysSelected: true };
    };
  }
}
