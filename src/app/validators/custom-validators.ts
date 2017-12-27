import { ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject } from 'rxjs/Subject';
import { takeUntil } from 'rxjs/operators';

export class CustomValidators {
  // these validators are for cases when the browser does not support input type=date,time and color and the browser falls back to type=text
  static integerValidator(ac: AbstractControl): ValidationErrors {
    const isValidInt = Number.isInteger(ac.value);
    return isValidInt ? null : { invalidInt: true };
  }

  static hexValidator(ac: AbstractControl): ValidationErrors {

    if (!ac.value) {
      return null;
    }

    const isValidHex = /^#[A-F0-9]{6}$/i.test(ac.value);

    return isValidHex ? null : { invalidHex: true };
  }

  static timeValidator(ac: AbstractControl): ValidationErrors {

    if (!ac.value) {
      return null;
    }

    // the regex is for hh:mm because input type=time always evaluates to this form regardless of how it may appear to the user
    const isValidTime = /^([01]?[0-9]|2[0-3]):[0-5][0-9]?$/.test(ac.value);

    return isValidTime ? null : { invalidTime: true };
  }

  static dateValidator(ac: AbstractControl): ValidationErrors {

    if (!ac.value) {
      return null;
    }

    // the regex is for yyyy-mm-dd because input type=date always evaluates to this form regardless of how it may appear to the user
    const dateRegEx = /^\d{4}-\d{2}-\d{2}/;

    if (!ac.value.match(dateRegEx)) {
      return { invalidDateFormat: true };
    }

    const date = new Date(ac.value);

    if (!date.getTime()) {
      return { invalidDate: true };
    }

    return null;
  }

  // for validating whether end date comes before start date or not
  static endDateValidator(): ValidatorFn {
    let startDate: AbstractControl;
    let endDate: AbstractControl;

    // for unsubscribing from Observables
    const ngUnsubscribe: Subject<void> = new Subject<void>();

    return (ac: AbstractControl): ValidationErrors => {
      if (!ac.parent) {
        return null;
      }

      if (!endDate) {
        endDate = ac;
        startDate = ac.parent.get('startDate');
        if (!startDate) {
          throw new Error(
            'validateDates(): startDate control is not found in parent group'
          );
        }

        // run validators again on when start date's value changes
        startDate.valueChanges.pipe(takeUntil(ngUnsubscribe)).subscribe(() => {
          endDate.updateValueAndValidity();
        });
      }

      // if start date has not been given a value yet return back
      if (!startDate) {
        return null;
      }

      // converts value from input type=date to Date obj for easy comparision
      if (
        new Date(startDate.value).getTime() > new Date(endDate.value).getTime()
      ) {
        return { invalidEndDate: true };
      }
    };
  }

  // for validating whether end time comes before start date or not
  static endTimeValidator(): ValidatorFn {
    let startTime: AbstractControl;
    let endTime: AbstractControl;
    const ngUnsubscribe: Subject<void> = new Subject<void>();

    return (ac: AbstractControl): { [key: string]: any } => {
      if (!ac.parent) {
        return null;
      }

      if (!endTime) {
        endTime = ac;
        startTime = ac.parent.get('startTime');
        if (!startTime) {
          throw new Error(
            'validateTimes(): startTime control is not found in parent group'
          );
        }

        // run validators again on when start time's value changes
        startTime.valueChanges.pipe(takeUntil(ngUnsubscribe)).subscribe(() => {
          endTime.updateValueAndValidity();
        });
      }

      // if start time has not been given a value yet return back
      if (!startTime) {
        return null;
      }

      // cannot directly convert time (HH:MM) to Date object so changed it to a Unix time date
      if (
        new Date('1970-1-1 ' + startTime.value).getTime() >
        new Date(endTime.value && '1970-1-1 ' + endTime.value).getTime()
      ) {
        return { invalidEndTime: true };
      }
    };
  }
}
