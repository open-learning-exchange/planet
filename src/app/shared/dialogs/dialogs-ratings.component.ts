import { Component, Inject, Directive, Input, HostListener } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { PlanetRatingStarsComponent } from '../forms/planet-rating-stars.component';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './dialogs-ratings.component.html',
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, MatFormField, MatLabel, MatSelect, MatOption, NgFor, MatCard, MatCardHeader, MatCardTitle, PlanetRatingStarsComponent, NgIf, MatCardContent, MatDialogActions, MatButton, MatDialogClose, DatePipe]
})
export class DialogsRatingsComponent {

  ratings: any[] = [];
  title: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.ratings = this.data.ratings;
    this.title = this.data.title;
  }

  onSortChange(sortValue: string) {
    const [ field, direction ] = sortValue.split(',');
    this.ratings.sort((a, b) => +direction * (b[field] - a[field]));
  }

}

@Directive({ selector: 'button[planetDialogsRatings]' })
export class DialogsRatingsDirective {

  @Input('planetDialogsRatings') item: any;

  constructor(
    private dialog: MatDialog
  ) {}

  @HostListener('click') viewRatings() {
    const { doc, rating } = this.item;
    this.dialog.open(DialogsRatingsComponent, {
      data: { title: doc.courseTitle || doc.title, ratings: rating.allRatings },
      minWidth: '600px'
    });
  }

}
