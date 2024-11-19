import { Component, Inject, ViewChild, AfterContentChecked, HostListener } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CanComponentDeactivate } from '../../shared/guards/unsaved-changes.guard';
import { UsersProfileComponent } from './users-profile.component';

@Component({
  template: `
    <div mat-dialog-title>
      <span i18n>Member Profile</span>
    </div>
    <mat-dialog-content>
      <planet-users-profile [isDialog]="true" [userName]="name" [planetCode]="planetCode"></planet-users-profile>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-raised-button mat-dialog-close i18n>Close</button>
      <button color="primary" *ngIf="editable" (click)="closeDialog()" routerLink="/users/profile/{{usersProfileComponent.urlName}}" mat-raised-button mat-dialog-close i18n>View full profile</button>
    </mat-dialog-actions>
  `
})
export class UserProfileDialogComponent implements AfterContentChecked, CanComponentDeactivate {

  @ViewChild(UsersProfileComponent) usersProfileComponent: UsersProfileComponent;
  name: string;
  planetCode: string;
  editable = false;
  dialogRef: any;
  hasUnsavedChanges = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.name = data.member.name;
    this.planetCode = data.member.userPlanetCode;
    this.dialogRef = data.dialogRef;
  }

  ngAfterContentChecked() {
    this.editable = this.usersProfileComponent && this.usersProfileComponent.editable;
  }

  closeDialog() {
    if (this.hasUnsavedChanges) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmLeave) {
        return; // Prevent dialog from closing
      }
    }
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  // Custom logic for detecting unsaved changes
  setUnsavedChanges(flag: boolean) {
    this.hasUnsavedChanges = flag;
  }

  canDeactivate(): boolean {
    if (this.hasUnsavedChanges) {
      return window.confirm('You have unsaved changes. Are you sure you want to leave?');
    }
    return true;
  }

  @HostListener('window:beforeunload', [ '$event' ])
  unloadNotification($event: any): void {
    if (this.hasUnsavedChanges) {
      $event.returnValue = true;
    }
  }
}
