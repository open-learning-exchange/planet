import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { CouchService } from '../../shared/couchdb.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UserService } from '../../shared/user.service';
import { map } from 'rxjs/operators';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';

@Component({
  templateUrl: './resources-rating.component.html',
  selector: 'planet-resources-rating'
})
export class ResourcesRatingComponent implements OnChanges {

  @Input() rating: any = { userRating: {} };
  @Input() resourceId: string;
  @Output() onUpdate = new EventEmitter<any>();
  rateForm: FormGroup;
  stackedBarData = [];

  private dbName = 'ratings';

  constructor(
    private fb: FormBuilder,
    private couchService: CouchService,
    private planetMessage: PlanetMessageService,
    private userService: UserService,
    private dialogsForm: DialogsFormService
  ) {
    this.rateForm = this.fb.group({
      rate: this.rating.userRating.rate || 0
    });
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
    this.rateForm.setValue({
      rate: this.rating.userRating.rate || 0
    });
  }

  onStarClick() {
    this.updateRating().subscribe(res => {
      this.onUpdate.emit(this.rating.userRating);
      this.openDialog();
    }, (err) => {
      this.ratingError();
    });
  }

  updateRating() {
    // Later parameters of Object.assign will overwrite values from previous objects
    const newRating = Object.assign({
      type: 'resource',
      item: this.resourceId,
      user: this.userService.get()
    }, this.rating.userRating, this.rateForm.value, {
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
      this.rating.userRating = newRating;
      this.onUpdate.emit(newRating);
      return res;
    }));
  }

  openDialog() {
    this.rateForm.addControl('comment', new FormControl(this.rating.userRating.comment || ''));
    this.dialogsForm
      .confirm('Rating', popupFormFields, this.rateForm)
      .debug('Dialog confirm')
      .subscribe((res) => {
        this.postDialogRating();
      });
  }

  postDialogRating() {
    this.updateRating().subscribe(res => {
      this.onUpdate.emit(this.rating.userRating);
      this.rateForm.removeControl('comment');
    }, (err) => {
      this.ratingError();
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
