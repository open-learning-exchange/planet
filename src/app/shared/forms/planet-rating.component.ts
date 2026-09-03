import { Component, Input, OnChanges } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CouchService } from '../couchdb.service';
import { PlanetMessageService } from '../planet-message.service';
import { UserService } from '../user.service';
import { finalize, tap } from 'rxjs/operators';
import { DialogFormValueMap, DialogsFormService } from '../dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../dialogs/dialogs-loading.service';
import { RatingService } from './rating.service';
import { StateService } from '../state.service';
import { NgClass } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { PlanetStackedBarComponent } from './planet-stacked-bar.component';
import { PlanetRatingStarsComponent } from './planet-rating-stars.component';

const popupFormFields = [
  {
    label: $localize`Rate`,
    type: 'rating',
    name: 'rate',
    placeholder: $localize`Your Rating`,
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

interface RateFormModel {
  rate: FormControl<number>;
}

interface PopupFormModel {
  rate: FormControl<number>;
  comment: FormControl<string>;
}

interface PopupFormValue extends DialogFormValueMap {
  rate: number;
  comment: string;
}

@Component({
  templateUrl: './planet-rating.component.html',
  styles: [` .list-item-rating {
    max-width: 225px;
  } `],
  selector: 'planet-rating',
  imports: [NgClass, MatIcon, PlanetStackedBarComponent, FormsModule, ReactiveFormsModule, PlanetRatingStarsComponent]
})
export class PlanetRatingComponent implements OnChanges {

  @Input() rating: any = { userRating: {} };
  @Input() item: any;
  @Input() parent;
  @Input() ratingType = '';
  @Input() disabled = false;

  rateForm: FormGroup<RateFormModel>;
  popupForm: FormGroup<PopupFormModel>;
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
    private fb: NonNullableFormBuilder,
    private couchService: CouchService,
    private planetMessage: PlanetMessageService,
    private userService: UserService,
    private dialogsForm: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private ratingService: RatingService,
    private stateService: StateService
  ) {
    this.rateForm = this.fb.group({ rate: 0 });
    this.popupForm = this.fb.group({ rate: 0, comment: '' });
  }

  ngOnChanges() {
    // After any changes to ratings ensures all properties are set
    this.rating = Object.assign({
      rateSum: 0,
      totalRating: 0,
      maleRating: 0,
      femaleRating: 0,
      userRating: {},
      allRatings: []
    }, this.rating);
    this.rating.allRatings = this.rating.allRatings || [];
    this.recalculateRating();
    if (!this.isPopupOpen) {
      this.resetRatingState();
    }
  }

  private recalculateRating() {
    this.rating.rateSum = this.rating.allRatings.reduce((sum, rating) => sum + (rating.rate || 0), 0);
    this.rating.totalRating = this.rating.allRatings.length;
    this.rating.maleRating = this.rating.allRatings.filter(rating => rating.user?.gender === 'male').length;
    this.rating.femaleRating = this.rating.allRatings.filter(rating => rating.user?.gender === 'female').length;
    this.stackedBarData = [
      { class: 'primary-color', amount: this.rating.maleRating },
      { class: 'primary-light-color',
        amount: this.rating.totalRating === 0 ?
          1 :
          this.rating.totalRating - this.rating.maleRating - this.rating.femaleRating,
        noLabel: true
      },
      { class: 'accent-color', amount: this.rating.femaleRating, align: 'right' }
    ];
  }

  isEnrolled(id: any, type: any): boolean {
    const idType = type === 'course' ? 'courseIds' : 'resourceIds';
    const { inShelf } = this.userService.countInShelf([ id ], idType);
    return inShelf;
  }

  onStarClick() {
    if (this.disabled) {
      this.resetRatingState();
      return;
    }

    if (!this.isEnrolled(this.item._id, this.ratingType)) {
      if (this.ratingType === 'course') {
        this.planetMessage.showMessage($localize`Please join the course before rating!`);
      } else {
        this.planetMessage.showMessage($localize`Please add the resource to your library before rating!`);
      }
      return;
    }

    if (this.rateForm.controls.rate.value === 0) {
      this.resetRatingState();
      return;
    }
    if (this.rateForm.controls.rate.value === this.rating.userRating.rate) {
      this.openDialog();
      return;
    }
    this.updateRating(this.rateForm).subscribe({
      next: () => {
        this.openDialog();
        this.planetMessage.showMessage($localize`Thank you, your rating is submitted!`);
      },
      error: () => this.ratingError()
    });
  }

  deleteRating() {
    const deletedRating = this.rating.userRating;
    const { _id, _rev } = deletedRating;
    this.dialogsLoadingService.start();
    return this.couchService.delete(`${this.dbName}/${_id}?rev=${_rev}`).pipe(
      tap(() => {
        this.rating.allRatings = this.rating.allRatings.filter(rating => rating._id !== deletedRating._id);
        this.rating.userRating = {};
        this.recalculateRating();
        this.resetRatingState();
        this.ratingService.newRatings(false);
      }),
      finalize(() => this.dialogsLoadingService.stop())
    );
  }

  updateRating(form: FormGroup<RateFormModel> | FormGroup<PopupFormModel>) {
    // Later parameters of Object.assign will overwrite values from previous objects
    const configuration = this.stateService.configuration;
    const previousRating = this.rating.userRating;
    const newRating = {
      type: this.ratingType,
      item: this.item._id,
      title: this.item.title || this.item.courseTitle,
      createdTime: this.couchService.datePlaceholder,
      ...this.rating.userRating,
      ...form.value,
      time: this.couchService.datePlaceholder,
      user: this.userService.get(),
      createdOn: configuration.code,
      parentCode: configuration.parentCode
    };
    this.dialogsLoadingService.start();
    return this.couchService.updateDocument(this.dbName, newRating).pipe(tap((res: any) => {
      newRating._rev = res.rev;
      newRating._id = res.id;
      const previousIndex = this.rating.allRatings.findIndex(rating => rating._id === previousRating?._id);
      this.rating.allRatings = previousIndex === -1 ?
        [ ...this.rating.allRatings, newRating ] :
        this.rating.allRatings.map((rating, index) => index === previousIndex ? newRating : rating);
      this.rating.userRating = newRating;
      this.recalculateRating();
      this.ratingService.newRatings(false);
    }), finalize(() => this.dialogsLoadingService.stop()));
  }

  openDialog() {
    if (this.isPopupOpen) {
      return;
    }
    this.popupForm.reset({
      rate: this.rateForm.controls.rate.value,
      comment: this.commentField.comment
    });
    this.isPopupOpen = true;
    this.dialogsForm
      .confirm<PopupFormValue>($localize`Rating`, popupFormFields, this.popupForm)
      .subscribe((res) => {
        if (!res) {
          this.resetRatingState();
          return;
        }
        if (res.rate === 0) {
          if (!this.rating.userRating?._id) {
            this.resetRatingState();
            return;
          }
          this.deleteRating().subscribe({
            next: () => this.planetMessage.showMessage($localize`Rating removed!`),
            error: () => this.ratingError()
          });
          return;
        }
        const ratingChanged = this.popupForm.controls.rate.value !== this.rating.userRating.rate;
        const commentChanged = this.popupForm.controls.comment.value !== this.commentField.comment;
        if (!ratingChanged && !commentChanged) {
          this.resetRatingState();
          return;
        }
        const hasAdditionalComment = commentChanged && this.popupForm.controls.comment.value !== '';
        this.updateRating(this.popupForm).subscribe({
          next: () => {
            this.resetRatingState();
            this.planetMessage.showMessage(hasAdditionalComment ?
              $localize`Thank you for your additional comments` :
              $localize`Thank you, your rating is submitted!`
            );
          },
          error: () => this.ratingError()
        });
      });
  }

  ratingError() {
    this.planetMessage.showAlert($localize`There was an issue updating your rating`);
    this.resetRatingState();
  }

  private resetRatingState() {
    this.rateForm.reset({ rate: this.rateFormField.rate });
    this.popupForm.reset({
      rate: this.rateFormField.rate,
      comment: this.commentField.comment
    });
    this.isPopupOpen = false;
  }
}
