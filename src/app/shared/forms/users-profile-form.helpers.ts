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
export type UsersProfileDemographicsSubmissionPayload = Partial<Pick<UsersProfileSubmissionPayload, 'age' | 'gender'>>;

const getNormalizedAge = (birthYear: number | null, age: number | null) => {
  const currentYear = new Date().getFullYear();
  const isValidBirthYear = Number.isInteger(birthYear) && birthYear >= 1900 && birthYear <= currentYear - 1;

  if (isValidBirthYear) {
    return currentYear - Number(birthYear);
  }

  return age;
};

const conditionalValidator = (submissionMode: boolean, validator: ValidatorFn): ValidatorFn => (
  (ac) => submissionMode ? null : validator(ac)
);

export const createUsersProfileForm = (
  fb: NonNullableFormBuilder,
  validatorService: ValidatorService,
  submissionMode: boolean,
  validateBirthDateInFuture = true
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
      asyncValidators: validateBirthDateInFuture ? [ (ac: AbstractControl) => validatorService.notDateInFuture$(ac) ] : []
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
  const normalizedAge = getNormalizedAge(birthYear, user.age);

  return {
    ...user,
    'age': normalizedAge
  };
};

export const normalizeUsersProfileDemographicsSubmission = (
  formValue: UsersProfileFormValue
): UsersProfileDemographicsSubmissionPayload | undefined => {
  const normalizedAge = getNormalizedAge(formValue.birthYear, formValue.age);
  const normalizedGender = formValue.gender.trim();
  const user: UsersProfileDemographicsSubmissionPayload = {};

  if (normalizedAge !== null) {
    user.age = normalizedAge;
  }

  if (normalizedGender) {
    user.gender = normalizedGender;
  }

  return Object.keys(user).length > 0 ? user : undefined;
};
