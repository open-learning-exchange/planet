import { Component, Inject, Directive, Input, HostListener } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';

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

  onSortChange(sortValue: string) {
    const [ field, direction ] = sortValue.split(',');
    this.ratings.sort((a, b) => +direction * (b[field] - a[field]));
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
