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
  ) {}

  onSortChange(sortValue: string) {
    const allRatings = this.data.rating.allRatings;
    switch (sortValue) {
      case 'Highest':
        allRatings.sort((a, b) => b.rate - a.rate);
        break;
      case 'Lowest':
        allRatings.sort((a, b) => a.rate - b.rate);
        break;
      case 'Recent':
        allRatings.sort((a, b) => b.time - a.time);
        break;
      case 'Oldest':
        allRatings.sort((a, b) => a.time - b.time);
        break;
    }
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
    this.dialog.open(DialogsRatingsComponent, {
      data: this.item,
      minWidth: '600px'
    });
  }

}
