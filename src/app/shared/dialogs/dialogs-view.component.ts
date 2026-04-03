import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogTitle, MatDialogContent } from '@angular/material/dialog';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { NgIf, DatePipe } from '@angular/common';
@Component({
  templateUrl: './dialogs-view.component.html',
  styles: [`
  	.close {
      float: right;
    }
    .content {
      max-height: 55vh;
      overflow-y: auto;
    }
  `],
  imports: [MatIconButton, MatDialogClose, MatIcon, MatDialogTitle, CdkScrollable, MatDialogContent, NgIf, DatePipe]
})
export class DialogsViewComponent {
  message = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }

  closeAlert() {
    this.message = '';
  }

}
