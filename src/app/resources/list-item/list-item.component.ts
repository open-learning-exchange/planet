// THIS COMPONENT COULD BE REUSUABLE FOR OTHER COMPONENTS IF WE COULD HAVE PROPER DATA MODELING?
import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'planet-list-item',
  templateUrl: './list-item.component.html'
})
export class ListItemComponent implements OnInit {
  @Input() item;
  rating = 0;
  mRating;
  fRating;

  constructor() {}

  ngOnInit() {
    if (this.item.sum > 0 && this.item.timesRated > 0) {
      const temp = (this.item.sum / this.item.timesRated).toFixed(1);
      this.rating = parseFloat(temp);
    }

    // Temp fields to fill in for male and female rating
    this.fRating = Math.floor(Math.random() * 101);
    this.mRating = 100 - this.fRating;
  }
}
