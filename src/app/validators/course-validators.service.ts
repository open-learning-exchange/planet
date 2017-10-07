import { Injectable } from '@angular/core';
import { ValidatorFn, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';

@Injectable()
export class CourseValidatorsService {
  constructor() {}

  static validateDates(): ValidatorFn {
    let startDate: AbstractControl;
    let endDate: AbstractControl;
    const ngUnsubscribe: Subject<void> = new Subject<void>();

    return (ac: AbstractControl): { [key: string]: any } => {
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
        startDate.valueChanges.takeUntil(ngUnsubscribe).subscribe(() => {
          endDate.updateValueAndValidity();
        });
      }

      if (!startDate) {
        return null;
      }

      if (
        new Date(startDate.value).getTime() > new Date(endDate.value).getTime()
      ) {
        return { isNumber: false };
      }
    };
  }

  static validateTimes(): ValidatorFn {
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

        startTime.valueChanges.takeUntil(ngUnsubscribe).subscribe(() => {
          endTime.updateValueAndValidity();
        });
      }

      if (!startTime) {
        return null;
      }

      // cannot directly convert time (HH:MM) to Date object so added Unix time date
      if (
        new Date('1970-1-1 ' + startTime.value).getTime() >
        new Date('1970-1-1 ' + endTime.value).getTime()
      ) {
        return { isNumber: false };
      }
    };
  }
}
