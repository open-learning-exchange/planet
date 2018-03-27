import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { CouchService } from '../../shared/couchdb.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UserService } from '../../shared/user.service';
import { map } from 'rxjs/operators';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { ResourcesService } from '../resources.service';

@Component({
  templateUrl: './resources-rating.component.html',
  selector: 'planet-resources-rating'
})
export class ResourcesRatingComponent implements OnChanges {

  @Input() rating: any = { userRating: {} };
  @Input() resourceId: string;

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
    private resourcesService: ResourcesService
  ) {
    this.rateForm = this.fb.group(this.rateFormField);
    this.popupForm = this.fb.group(Object.assign({}, this.rateFormField, this.commentField));
  }

  ngOnChanges() {
    // After any changes to ratings ensures all properties are set
    this.rating = Object.assign({ rateSum: 0, totalRating: 0, maleRating: 0, femaleRating: 0, userRating: {} }, this.rating);
    this.stackedBarData = [
      { class: 'primary-color', amount: this.rating.maleRating },
      { class: 'primary-light-color',
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
    this.updateRating(form).subscribe(res => {
      this.resourcesService.updateResources();
      if (!this.isPopupOpen) {
        this.openDialog();
      } else {
        this.rateForm.setValue({ rate: this.popupForm.controls.rate.value });
        this.isPopupOpen = false;
      }
    }, (err) => {
      this.ratingError();
    });
  }

  updateRating(form) {
    // Later parameters of Object.assign will overwrite values from previous objects
    const newRating = Object.assign({
      type: 'resource',
      item: this.resourceId,
      user: this.userService.get()
    }, this.rating.userRating, form.value, {
      time: Date.now()
    });
    let couchRequest = this.couchService.post,
      couchUrl = this.dbName;
    if (newRating._rev) {
      couchRequest = this.couchService.put;
      couchUrl = couchUrl + '/' + newRating._id;
    }
    // Use call because 'this' will be undefined otherwise
    return couchRequest.call(this.couchService, couchUrl, newRating).pipe(map((res: any) => {
      newRating._rev = res.rev;
      newRating._id = res.id;
      this.rating.userRating = newRating;
      return res;
    }));
  }

  openDialog() {
    this.popupForm.patchValue(this.rateForm.value);
    this.isPopupOpen = true;
    this.dialogsForm
      .confirm('Rating', popupFormFields, this.popupForm)
      .debug('Dialog confirm')
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
    'placeholder': 'Leave your comment',
    'required': false
  }
];
