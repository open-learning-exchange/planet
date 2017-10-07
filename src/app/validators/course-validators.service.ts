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

    return (ac: AbstractControl) => {
      if (!ac.parent) {
        return null;
      }

      if (!endDate) {
        endDate = ac;
        startDate = ac.parent.get('startDate');
        if (!endDate) {
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
        console.log('should be false');
        return { isNumber: false };
      }
    };
  }
}
