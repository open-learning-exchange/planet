import { Component, Input, OnChanges } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetMessageService } from '../planet-message.service';
import { UserService } from '../user.service';
import { tap } from 'rxjs/operators';
import { DialogsFormService } from '../dialogs/dialogs-form.service';
import { RatingInfo, RatingService, RatingType } from './rating.service';
import { NgClass } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { PlanetStackedBarComponent } from './planet-stacked-bar.component';
import { PlanetRatingStarsComponent } from './planet-rating-stars.component';
import { ratingFormFields, RatingFormModel, RatingFormValue } from './rating-form';

interface RateFormModel {
  rate: FormControl<number>;
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
  @Input() ratingType: RatingType = 'resource';
  @Input() disabled = false;

  rateForm: FormGroup<RateFormModel>;
  popupForm: FormGroup<RatingFormModel>;
  isPopupOpen = false;
  stackedBarData = [];
  get rateFormField() {
    return { rate: this.rating.userRating.rate || 0 };
  }
  get commentField() {
    return { comment: this.rating.userRating.comment || '' };
  }

  constructor(
    private fb: NonNullableFormBuilder,
    private planetMessage: PlanetMessageService,
    private userService: UserService,
    private dialogsForm: DialogsFormService,
    private ratingService: RatingService
  ) {
    this.rateForm = this.fb.group({ rate: 0 });
    this.popupForm = this.fb.group({ rate: 0, comment: '' });
  }

  ngOnChanges() {
    // After any changes to ratings ensures all properties are set
    this.rating = this.ratingService.normalizeRatingInfo(this.rating);
    this.updateStackedBarData();
    if (!this.isPopupOpen) {
      this.resetRatingState();
    }
  }

  private updateStackedBarData() {
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
    return this.ratingService.deleteRating(deletedRating, {
      ...this.rating,
      allRatings: [ ...this.rating.allRatings ]
    }).pipe(
      tap(ratingInfo => {
        this.applyRatingInfo(ratingInfo);
        this.resetRatingState();
      })
    );
  }

  updateRating(form: FormGroup<RateFormModel> | FormGroup<RatingFormModel>) {
    const value = form.getRawValue();
    return this.ratingService.saveRating({
      item: this.item,
      type: this.ratingType,
      rate: value.rate,
      comment: 'comment' in value ? value.comment : this.rating.userRating.comment || '',
      existingRating: this.rating.userRating,
      ratingInfo: this.rating
    }).pipe(tap(ratingInfo => this.applyRatingInfo(ratingInfo)));
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
      .confirm<RatingFormValue>($localize`Rating`, ratingFormFields, this.popupForm)
      .subscribe((res) => {
        if (!res) {
          this.resetRatingState();
          return;
        }
        if (this.popupForm.controls.rate.value === 0) {
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
    this.resetRatingState();
  }

  private applyRatingInfo(ratingInfo: RatingInfo) {
    Object.assign(this.rating, ratingInfo);
    this.updateStackedBarData();
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
