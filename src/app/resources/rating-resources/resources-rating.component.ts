import { Component, Input, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  templateUrl: './resources-rating.component.html',
  selector: 'planet-resources-rating'
})
export class ResourcesRatingComponent implements OnChanges {

  @Input() rating: any = { userRating: {} };
  rateForm: FormGroup;
  stackedBarData = [];

  constructor(
    private fb: FormBuilder
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

}
