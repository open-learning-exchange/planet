import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef, MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogsLoadingService } from './dialogs-loading.service';
import { MeetupsAddComponent } from '../../meetups/add-meetups/meetups-add.component';
import { CanComponentDeactivate } from '../unsaved-changes.guard';
import { UnsavedChangesPromptComponent } from '../unsaved-changes.component';

@Component({
  template: `
    <ng-container [ngSwitch]="view">
      <planet-meetups-add #meetupsAdd *ngSwitchCase="'add'" [isDialog]="true" [link]="link"
        [sync]="sync" [meetup]="meetup" (onGoBack)="checkUnsavedChangesAndClose()">
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
export class DialogsAddMeetupsComponent implements CanComponentDeactivate {
  @ViewChild('meetupsAdd') meetupsAdd: MeetupsAddComponent;

  link: any = {};
  view = 'add';
  meetup: any = {};
  sync: { type: 'local' | 'sync', planetCode: string };
  editable = true;

  constructor(
    public dialogRef: MatDialogRef<DialogsAddMeetupsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService,
    private dialog: MatDialog
  ) {
    this.link = this.data.link || this.link;
    this.sync = this.data.sync || this.sync;
    this.view = this.data.view || this.view;
    this.meetup = this.data.meetup || this.meetup;
    this.editable = this.data.editable !== undefined && this.data.editable !== null ? this.data.editable : this.editable;
    this.dialogRef.disableClose = true;
    this.dialogRef.backdropClick().subscribe(() => {
      this.checkUnsavedChangesAndClose();
    });
  }

  canDeactivate(): boolean {
    return this.meetupsAdd ? this.meetupsAdd.canDeactivate() : true;
  }

  private checkUnsavedChangesAndClose(): void {
    if (this.meetupsAdd && this.meetupsAdd.canDeactivate() === false) {
      const dialogResult = UnsavedChangesPromptComponent.open(this.dialog);
      dialogResult.subscribe(confirmed => {
        if (confirmed) {
          this.meetupsAdd.hasUnsavedChanges = false;
          this.meetupsChange();
        }
      });
    } else {
      this.meetupsChange();
    }
  }

  meetupsChange() {
    this.data.onMeetupsChange();
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
