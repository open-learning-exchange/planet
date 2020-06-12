import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  templateUrl: './dialogs-ratings.component.html'
})
export class DialogsRatingsComponent {

  ratings: any[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.ratings = this.data.ratings;
  }

}
