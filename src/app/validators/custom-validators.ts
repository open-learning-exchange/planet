import { ValidatorFn, AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export class CustomValidators {
  // these validators are for cases when the browser does not support input type=date,time and color and the browser falls back to type=text
  static integerValidator(ac: AbstractControl): ValidationErrors {
    const isValidInt = Number.isInteger(ac.value);
    return isValidInt ? null : { invalidInt: true };
  }

  static positiveNumberValidator(ac: AbstractControl): ValidationErrors {
    if (!ac.value) {
      return null;
    }
    return (ac.value > 0) ? null : { invalidPositive : true };
  }

  static choiceSelected(requireCorrect: boolean) {
    return (ac: AbstractControl): ValidationErrors => {
      if (!ac.parent || !requireCorrect) {
        return null;
      }

      const inputtype = ac.parent.get('type');
      if ((inputtype.value === 'select' || inputtype.value === 'selectMultiple') && ac.value.length === 0) {
        return { required: true };
      } else {
        return null;
      }
    };
  }

  static hexValidator(ac: AbstractControl): ValidationErrors {

    if (!ac.value) {
      return null;
    }

    const isValidHex = /^#[A-F0-9]{6}$/i.test(ac.value);

    return isValidHex ? null : { invalidHex: true };
  }

  // Allows us to supply a different errorType for specific patterns
  static pattern(pattern, errorType = 'pattern') {
    return (ac: AbstractControl): ValidationErrors => {
      return Validators.pattern(pattern)(ac) ? { [errorType]: true } : null;
    };
  }

  static timeValidator(ac: AbstractControl): ValidationErrors {

    if (!ac.value) {
      return null;
    }

    // the regex is for hh:mm because input type=time always evaluates to this form regardless of how it may appear to the user
    const isValidTime = /^([01]?[0-9]|2[0-3]):[0-5][0-9]?$/.test(ac.value);

    return isValidTime ? null : { invalidTime: true };
  }

  static notDateInPast(ac: AbstractControl): ValidationErrors {
    const now = new Date(),
      today = new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      formVal = ac.value;
    if (formVal < today) {
      return { dateInPast: true };
    }
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

  // Set this on both password and confirmation fields so it runs when either changes
  // confirm should be true for the confirmation field validator
  static matchPassword(match: string, confirm: boolean): ValidatorFn {

    return (ac: AbstractControl) => {
      if (!ac.parent) {
        return null;
      }

      const matchControl = ac.parent.get(match),
        val1 = ac.value,
        val2 = matchControl.value,
        confirmControl: AbstractControl = confirm ? ac : matchControl;

      // If passwords do not match, set error for confirmation field
      if (val1 !== val2) {
        confirmControl.setErrors({ matchPassword: false });
        // If this is set on the confirmation field, also return match password error
        if (confirm) {
          return { matchPassword: false };
        }
      } else {
        // Remove error if passwords match
        confirmControl.setErrors(null);
      }
      return null;
    };
  }

  // for validating whether time is a futureDate or not
  static notDateInFuture(ac: AbstractControl): ValidationErrors {
    if (ac.value > Date.now()) {
      return { invalidFutureDate: true };
    }
  }

  // matDatepicker returns null for date missing or invalid date
  // Use this validator for special date message
  static dateValidRequired(ac: AbstractControl): ValidationErrors {
    if (!ac.value) {
      return { dateRequired: true };
    }
  }

  static isQuestionValid(hasCorrectAnswer) {
    return (question) => {
      if (question.type === 'select' || question.type === 'selectMultiple') {
        return (
          (question.correctChoice.length === 0 && hasCorrectAnswer) ||
          question.choices.length === 0 ||
          question.choices.find((choice: any) => choice.text === '') !== undefined
        );
      }
      return question.body === '';
    };
  }

  static questionValidator(hasCorrectAnswer): ValidatorFn {
    return (ac: AbstractControl) => {
      const invalidQuestion = ac.value.find(this.isQuestionValid(hasCorrectAnswer));
      if (invalidQuestion !== undefined) {
        return { questionError: true };
      }
    };
  }

}
