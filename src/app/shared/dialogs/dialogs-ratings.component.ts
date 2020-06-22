import { Component, Inject, Directive, Input, HostListener } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material';

@Component({
  templateUrl: './dialogs-ratings.component.html'
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

}

@Directive({
  selector: 'button[planetDialogsRatings]'
})
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
