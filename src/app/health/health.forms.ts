import { FormControl } from '@angular/forms';

export interface HealthEventForm {
  temperature: FormControl<number | ''>;
  pulse: FormControl<number | ''>;
  bp: FormControl<string>;
  height: FormControl<number | ''>;
  weight: FormControl<number | ''>;
  vision: FormControl<string>;
  hearing: FormControl<string>;
  notes: FormControl<string>;
  diagnosis: FormControl<string>;
  treatments: FormControl<string>;
  medications: FormControl<string>;
  immunizations: FormControl<string>;
  allergies: FormControl<string>;
  xrays: FormControl<string>;
  tests: FormControl<string>;
  referrals: FormControl<string>;
  conditions: FormControl<Record<string, boolean>>;
}

export interface HealthProfileForm {
  emergencyContactName: FormControl<string>;
  emergencyContactType: FormControl<string>;
  emergencyContact: FormControl<string>;
  specialNeeds: FormControl<string>;
  immunizations: FormControl<string>;
  allergies: FormControl<string>;
  notes: FormControl<string>;
}

export interface UserProfileForm {
  name: FormControl<string>;
  firstName: FormControl<string>;
  middleName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  language: FormControl<string>;
  phoneNumber: FormControl<string>;
  birthDate: FormControl<string>;
  birthplace: FormControl<string>;
}

export type HealthEventFormValue = {
  [K in keyof HealthEventForm]: HealthEventForm[K]['value'];
};

export type HealthProfileFormValue = {
  [K in keyof HealthProfileForm]: HealthProfileForm[K]['value'];
};

export type UserProfileFormValue = {
  [K in keyof UserProfileForm]: UserProfileForm[K]['value'];
};
