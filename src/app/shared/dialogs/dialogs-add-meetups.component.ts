import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { DialogsLoadingService } from './dialogs-loading.service';

@Component({
  template: `
    <ng-container [ngSwitch]="view">
      <planet-meetups-add *ngSwitchCase="'add'" [isDialog]="true" [link]="link" [meetup]="meetup" (onGoBack)="meetupsChange()">
      </planet-meetups-add>
      <planet-meetups-view *ngSwitchCase="'view'" [isDialog]="true" [meetupDetail]="meetup" (switchView)="switchView($event)">
      </planet-meetups-view>
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
    this.link = this.data.link || this.link;
    this.view = this.data.view || this.view;
    this.meetup = this.data.meetup || this.meetup;
  }

  meetupsChange() {
    this.data.onMeetupsChange();
    this.dialogsLoadingService.stop();
    this.dialogRef.close();
  }

  switchView(view: 'add' | 'view' | 'close') {
    if (view === 'close') {
      this.meetupsChange();
    }
    this.view = view;
  }

}
