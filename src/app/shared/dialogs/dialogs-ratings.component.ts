import { Component, Inject, Directive, Input, HostListener } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material';

@Component({
  templateUrl: './dialogs-ratings.component.html'
})
export class DialogsRatingsComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  onSortChange(sortValue: string) {
    const [ field, direction ] = sortValue.split(',')
    this.data.rating.allRatings.sort((a, b) => +direction * (b[field] - a[field]));
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
