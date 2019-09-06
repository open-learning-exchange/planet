import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { DialogsLoadingService } from './dialogs-loading.service';

@Component({
  template: `
    <ng-container [ngSwitch]="view">
      <planet-meetups-add *ngSwitchCase="'add'" [isDialog]="true" [link]="link" (onGoBack)="meetupSubmitted($event)"></planet-meetups-add>
      <planet-meetups-view *ngSwitchCase="'view'" [isDialog]="true" [meetupDetail]="meetup"></planet-meetups-view>
    </ng-container>
  `
})
export class DialogsAddMeetupsComponent {

  link: any = {};
  view = 'add';
  meetup: any = {};

  constructor(
    public dialogRef: MatDialogRef<DialogsAddMeetupsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.link = this.data.link;
    this.view = this.data.view;
    this.meetup = this.data.meetup;
  }

  meetupSubmitted(res) {
    this.data.onMeetupSubmitted(res);
    this.dialogsLoadingService.stop();
    this.dialogRef.close();
  }

}
