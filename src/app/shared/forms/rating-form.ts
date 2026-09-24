import { FormControl } from '@angular/forms';
import { DialogField, DialogFormValueMap } from '../dialogs/dialogs-form.service';

export const ratingFormFields: DialogField[] = [
  {
    label: $localize`Rate`,
    type: 'rating',
    name: 'rate',
    required: false
  },
  {
    label: $localize`Comment`,
    type: 'textarea',
    name: 'comment',
    placeholder: $localize`Would you like to leave a comment?`,
    required: false
  }
];

export interface RatingFormValue extends DialogFormValueMap {
  rate: number;
  comment: string;
}

export interface RatingFormModel {
  rate: FormControl<number>;
  comment: FormControl<string>;
}
