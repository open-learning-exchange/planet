import { Component, Input, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CouchService } from '../couchdb.service';
import { PlanetMessageService } from '../planet-message.service';
import { UserService } from '../user.service';
import { map } from 'rxjs/operators';
import { DialogsFormService } from '../dialogs/dialogs-form.service';
import { debug } from '../../debug-operator';
import { RatingService } from './rating.service';
import { StateService } from '../state.service';

const popupFormFields = [
  {
    'label': 'Rate',
    'type': 'rating',
    'name': 'rate',
    'placeholder': 'Your Rating',
    'required': false
  },
  {
    'label': 'Comment',
    'type': 'textarea',
    'name': 'comment',
    'placeholder': 'Would you like to leave a comment?',
    'required': false
  }
];

@Component({
  templateUrl: './planet-rating.component.html',
  styles: [ ` .list-item-rating {
    max-width: 225px;
  } ` ],
  selector: 'planet-rating'
})
export class PlanetRatingComponent implements OnChanges {

  @Input() rating: any = { userRating: {} };
  @Input() item: any;
  @Input() parent;
  @Input() ratingType = '';
  @Input() disabled = false;

  rateForm: FormGroup;
  popupForm: FormGroup;
  isPopupOpen = false;
  stackedBarData = [];
  get rateFormField() {
    return { rate: this.rating.userRating.rate || 0 };
  }
  get commentField() {
    return { comment: this.rating.userRating.comment || '' };
  }

  private dbName = 'ratings';

  constructor(
    private fb: FormBuilder,
    private couchService: CouchService,
    private planetMessage: PlanetMessageService,
    private userService: UserService,
    private dialogsForm: DialogsFormService,
    private ratingService: RatingService,
    private stateService: StateService
  ) {
    this.rateForm = this.fb.group(this.rateFormField);
    this.popupForm = this.fb.group(Object.assign({}, this.rateFormField, this.commentField));
  }

  ngOnChanges() {
    // After any changes to ratings ensures all properties are set
    this.rating = Object.assign({ rateSum: 0, totalRating: 0, maleRating: 0, femaleRating: 0, userRating: {} }, this.rating);
    this.stackedBarData = [
      { class: 'primary-color', amount: this.rating.maleRating },
      { class: 'secondary-light-color',
        amount: this.rating.totalRating === 0 ? 1
          : this.rating.totalRating - this.rating.maleRating - this.rating.femaleRating,
        noLabel: true
      },
      { class: 'accent-color', amount: this.rating.femaleRating, align: 'right' }
    ];
    this.rateForm.setValue(this.rateFormField);
    this.popupForm.setValue(Object.assign({}, this.rateFormField, this.commentField));
  }

  onStarClick(form = this.rateForm) {
    if (this.disabled) {
      return;
    }
    this.updateRating(form).subscribe(res => {
      if (!this.isPopupOpen) {
        this.openDialog();
        this.planetMessage.showMessage('Thank you, your rating is submitted!');
      } else {
        this.rateForm.setValue({ rate: this.popupForm.controls.rate.value });
        this.isPopupOpen = false;
        if (this.popupForm.controls.comment.dirty && this.popupForm.controls.comment.value !== '') {
          this.planetMessage.showMessage('Thank you for your additional comments');
        }
      }
    }, (err) => {
      this.ratingError();
    });
  }

  updateRating(form) {
    // Later parameters of Object.assign will overwrite values from previous objects
    const configuration = this.stateService.configuration;
    const newRating = Object.assign({
      type: this.ratingType,
      item: this.item._id,
      title: this.item.title || this.item.courseTitle
    }, this.rating.userRating, form.value, {
      time: this.couchService.datePlaceholder,
      user: this.userService.get(),
      createdOn: configuration.code,
      parentCode: configuration.parentCode
    });
    // Use call because 'this' will be undefined otherwise
    return this.couchService.updateDocument(this.dbName, newRating).pipe(map((res: any) => {
      newRating._rev = res.rev;
      newRating._id = res.id;
      this.rating.userRating = newRating;
      this.ratingService.newRatings(false);
      return res;
    }));
  }

  openDialog() {
    this.popupForm.patchValue(this.rateForm.value);
    this.isPopupOpen = true;
    this.dialogsForm
      .confirm('Rating', popupFormFields, this.popupForm)
      .pipe(debug('Dialog confirm'))
      .subscribe((res) => {
        if (res) {
          this.onStarClick(this.popupForm);
        }
      });
  }

  ratingError() {
    this.planetMessage.showAlert('There was an issue updating your rating');
    this.rateForm.patchValue({ rate: this.rating.userRating.rate || 0 });
    // If the dialog is open, then there will also be a comment control to reset
    if (this.rateForm.controls.comment) {
      this.rateForm.patchValue({ comment: this.rating.userRating.comment || '' });
    }
  }
}
