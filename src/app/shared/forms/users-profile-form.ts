import { AbstractControl, FormControl, FormGroup, NonNullableFormBuilder, ValidatorFn, Validators } from '@angular/forms';

import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';

export interface UsersProfileFormGroup {
  firstName: FormControl<string>;
  middleName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  language: FormControl<string>;
  phoneNumber: FormControl<string>;
  birthDate: FormControl<string | Date | null>;
  birthYear: FormControl<number | null>;
  age: FormControl<number | null>;
  gender: FormControl<string>;
  level: FormControl<string>;
  betaEnabled: FormControl<boolean>;
}

export interface UsersProfileFormValue {
  age: number | null;
  betaEnabled: boolean;
  birthDate: string | Date | null;
  birthYear: number | null;
  email: string;
  firstName: string;
  gender: string;
  language: string;
  lastName: string;
  level: string;
  middleName: string;
  phoneNumber: string;
}

export type UsersProfileSubmissionPayload = Omit<UsersProfileFormValue, 'birthYear'>;

const conditionalValidator = (submissionMode: boolean, validator: ValidatorFn): ValidatorFn => (
  (ac) => submissionMode ? null : validator(ac)
);

export const createUsersProfileForm = (
  fb: NonNullableFormBuilder,
  validatorService: ValidatorService,
  submissionMode: boolean
): FormGroup<UsersProfileFormGroup> => fb.group<UsersProfileFormGroup>({
  firstName: fb.control('', conditionalValidator(submissionMode, CustomValidators.required)),
  middleName: fb.control(''),
  lastName: fb.control('', conditionalValidator(submissionMode, CustomValidators.required)),
  email: fb.control('', [ conditionalValidator(submissionMode, Validators.required), Validators.email ]),
  language: fb.control('', conditionalValidator(submissionMode, Validators.required)),
  phoneNumber: fb.control('', conditionalValidator(submissionMode, CustomValidators.required)),
  birthDate: fb.control<string | Date | null>(
    null,
    {
      validators: conditionalValidator(submissionMode, CustomValidators.dateValidRequired),
      asyncValidators: (ac: AbstractControl) => validatorService.notDateInFuture$(ac)
    }
  ),
  birthYear: fb.control<number | null>(
    null,
    [
      Validators.min(1900),
      Validators.max(new Date().getFullYear() - 1),
      Validators.pattern(/^\d{4}$/)
    ]
  ),
  age: fb.control<number | null>(null),
  gender: fb.control('', conditionalValidator(submissionMode, Validators.required)),
  level: fb.control('', conditionalValidator(submissionMode, Validators.required)),
  betaEnabled: fb.control(false)
});

export const normalizeUsersProfileSubmission = (
  formValue: UsersProfileFormValue
): UsersProfileSubmissionPayload => {
  const { birthYear, ...user } = formValue;
  const normalizedAge = birthYear && birthYear.toString().length === 4
    ? new Date().getFullYear() - Number(birthYear)
    : user.age;

  return {
    ...user,
    'age': normalizedAge
  };
};
