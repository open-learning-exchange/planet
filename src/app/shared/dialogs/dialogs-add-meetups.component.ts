import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogsLoadingService } from './dialogs-loading.service';
import { MeetupsAddComponent } from '../../meetups/add-meetups/meetups-add.component';
import { UnsavedChangesService } from '../unsaved-changes.service';

@Component({
  template: `
    <ng-container [ngSwitch]="view">
      <planet-meetups-add #meetupsAdd *ngSwitchCase="'add'" [isDialog]="true" [link]="link"
        [sync]="sync" [meetup]="meetup" (onGoBack)="meetupsChange()">
      </planet-meetups-add>
      <planet-meetups-view *ngSwitchCase="'view'"
        [isDialog]="true"
        [meetupDetail]="meetup"
        [editable]="editable"
        (switchView)="switchView($event)">
      </planet-meetups-view>
    </ng-container>
  `
})
export class DialogsAddMeetupsComponent {
  @ViewChild('meetupsAdd') meetupsAdd: MeetupsAddComponent;

  link: any = {};
  view = 'add';
  meetup: any = {};
  sync: { type: 'local' | 'sync', planetCode: string };
  editable = true;

  constructor(
    public dialogRef: MatDialogRef<DialogsAddMeetupsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.link = this.data.link || this.link;
    this.sync = this.data.sync || this.sync;
    this.view = this.data.view || this.view;
    this.meetup = this.data.meetup || this.meetup;
    this.editable = this.data.editable !== undefined && this.data.editable !== null ? this.data.editable : this.editable;
    this.dialogRef.disableClose = true;
    this.dialogRef.backdropClick().subscribe(() => {
      if (this.meetupsAdd && this.meetupsAdd.hasUnsavedChanges) {
        const confirmClose = window.confirm(UnsavedChangesService.warningMsg);
        if (confirmClose) {
          this.meetupsAdd.hasUnsavedChanges = false;
          this.meetupsAdd.unsavedChangesService.setHasUnsavedChanges(false);
          this.dialogRef.close();
        }
      } else {
        this.dialogRef.close();
      }
    });
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
