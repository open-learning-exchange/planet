import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { DialogsLoadingService } from './dialogs-loading.service';

@Component({
  template: `
    <planet-meetups-add [isDialog]="true" [link]="link" (onGoBack)="meetupSubmitted($event)"></planet-meetups-add>
  `
})
export class DialogsAddMeetupsComponent {

  link: any = {};

  constructor(
    public dialogRef: MatDialogRef<DialogsAddMeetupsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.link = this.data.link;
  }

  meetupSubmitted(res) {
    this.data.onMeetupSubmitted(res);
    this.dialogsLoadingService.stop();
    this.dialogRef.close();
  }

}
