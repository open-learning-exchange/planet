import { Component, Input, OnChanges } from '@angular/core';

@Component({
  templateUrl: './resources-rating.component.html',
  selector: 'planet-resources-rating'
})
export class ResourcesRatingComponent implements OnChanges {

  @Input() rating: any;

  stackedBarData = [];

  ngOnChanges() {
    // After any changes to ratings ensures all properties are set
    this.rating = Object.assign({ rateSum: 0, totalRating: 0, maleRating: 0, femaleRating: 0, userRating: {} }, this.rating);
    this.stackedBarData = [
      { class: 'primary-color', amount: this.rating.maleRating },
      { class: 'accent-color', amount: this.rating.femaleRating, align: 'right' }
    ];
  }

}
