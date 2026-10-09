import { FormControl, FormGroup } from '@angular/forms';
import { startWith } from 'rxjs/operators';
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

export const disableCommentWhenUnrated = ({ controls: { rate, comment } }: FormGroup<RatingFormModel>) =>
  rate.valueChanges.pipe(startWith(rate.value)).subscribe(value => value > 0 ? comment.enable() : comment.disable());
