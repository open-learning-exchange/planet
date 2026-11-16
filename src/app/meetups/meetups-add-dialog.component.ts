import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';

import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';
import { CanComponentDeactivate } from '@shared/unsaved-changes/unsaved-changes.guard';
import { guardDialogClose, leaveUnlessUnsaved } from '@shared/unsaved-changes/dialog-close-guard';

import { MeetupsAddComponent } from './add-meetups/meetups-add.component';
import { MeetupsViewComponent } from './view-meetups/meetups-view.component';

@Component({
  template: `
@switch (view) {
  @case ('add') {
    <planet-meetups-add #meetupsAdd [isDialog]="true" [link]="link"
      [sync]="sync" [meetup]="meetup" [editable]="editable" [leaderOfTeamId]="leaderOfTeamId"
      (goBackEvent)="checkUnsavedChangesAndClose()">
    </planet-meetups-add>
  }
  @case ('view') {
    <planet-meetups-view
      [isDialog]="true"
      [meetupDetail]="meetup"
      [editable]="editable"
      [leaderOfTeamId]="leaderOfTeamId"
      (switchView)="switchView($event)">
    </planet-meetups-view>
  }
}
`,
  imports: [MeetupsAddComponent, MeetupsViewComponent]
})
export class MeetupsAddDialogComponent implements CanComponentDeactivate {
  @ViewChild('meetupsAdd') meetupsAdd: MeetupsAddComponent;

  link: any = {};
  view = 'add';
  meetup: any = {};
  sync: { type: 'local' | 'sync', planetCode: string };
  editable = true;
  leaderOfTeamId?: string;

  constructor(
    public dialogRef: MatDialogRef<MeetupsAddDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService,
    private dialog: MatDialog
  ) {
    this.link = this.data.link || this.link;
    this.sync = this.data.sync || this.sync;
    this.view = this.data.view || this.view;
    this.meetup = this.data.meetup || this.meetup;
    this.editable = this.data.editable !== undefined && this.data.editable !== null ? this.data.editable : this.editable;
    this.leaderOfTeamId = this.data.leaderOfTeamId;
    guardDialogClose(this.dialogRef, this.dialog, () => !this.canDeactivate(), { close: () => this.discardAndClose() });
  }

  canDeactivate(): boolean {
    return this.meetupsAdd ? this.meetupsAdd.canDeactivate() : true;
  }

  private checkUnsavedChangesAndClose(): void {
    leaveUnlessUnsaved(this.dialog, () => !this.canDeactivate(), () => this.discardAndClose());
  }

  private discardAndClose() {
    if (this.meetupsAdd) {
      this.meetupsAdd.hasUnsavedChanges = false;
    }
    this.meetupsChange();
  }

  meetupsChange() {
    if (typeof this.data?.onMeetupsChange === 'function') {
      this.data.onMeetupsChange();
    }
    this.dialogsLoadingService.stop();
    this.dialogRef.close();
  }

  switchView(view: 'add' | 'view' | 'close') {
    if (view === 'close') {
      this.checkUnsavedChangesAndClose();
    }
    this.view = view;
  }

}
