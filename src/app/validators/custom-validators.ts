import { ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';

export class CustomValidators {
  // these validators are for cases when the browser does not support input type=date,time and color and the browser falls back to type=text
  static integerValidator(ac: AbstractControl): ValidationErrors {
    const errMessage = {
      invalidInt: {
        message: 'Please enter a valid number'
      }
    };

    const isValidInt = Number.isInteger(ac.value);
    return isValidInt ? null : errMessage;
  }

  static hexValidator(ac: AbstractControl): ValidationErrors {
    const errMessage = {
      invalidHex: {
        message: 'Hex is not valid'
      }
    };

    const isValidHex = /^#[A-F0-9]{6}$/i.test(ac.value);

    return isValidHex ? null : errMessage;
  }

  static timeValidator(ac: AbstractControl): ValidationErrors {
    const errMessage = {
      invalidTime: {
        message: 'Time must be in the form hh:mm'
      }
    };

    const isValidTime = /^([01]?[0-9]|2[0-3]):[0-5][0-9]?$/.test(ac.value);

    return isValidTime ? null : errMessage;
  }

  static dateValidator(ac: AbstractControl): ValidationErrors {
    const formErrMessage = {
      invalidDateFormat: {
        message: 'Date must be in the form of yyyy-mm-dd'
      }
    };

    const dateRegEx = /^\d{4}-\d{2}-\d{2}/;

    if (!ac.value.match(dateRegEx)) {
      return formErrMessage;
    }
    const date = new Date(ac.value);

    const errMessage = {
      invalidDate: {
        message: 'Date is invalid'
      }
    };

    if (!date.getTime()) {
      return errMessage;
    }

    return null;
  }

  // for validating whether end date comes before start date or not
  static endDateValidator(): ValidatorFn {
    let startDate: AbstractControl;
    let endDate: AbstractControl;

    // for unsubscribing from Observables
    const ngUnsubscribe: Subject<void> = new Subject<void>();

    const errMessage = {
      invalidEndDate: {
        message: 'The end date cannot be before the start date'
      }
    };

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
        startDate.valueChanges.takeUntil(ngUnsubscribe).subscribe(() => {
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
        return errMessage;
      }
    };
  }

  // for validating whether end time comes before start date or not
  static endTimeValidator(): ValidatorFn {
    let startTime: AbstractControl;
    let endTime: AbstractControl;
    const ngUnsubscribe: Subject<void> = new Subject<void>();
    const errMessage = {
      inavlidEndTime: {
        message: 'The end time cannot be before the start time'
      }
    };
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
        startTime.valueChanges.takeUntil(ngUnsubscribe).subscribe(() => {
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
        new Date('1970-1-1 ' + endTime.value).getTime()
      ) {
        return errMessage;
      }
    };
  }
}
