import { Component, Inject, ViewChild, AfterContentChecked } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
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
      <button color="primary" *ngIf="editable" (click)="closeDialog()" routerLink="/users/profile/{{usersProfileComponent.urlName}}"
       mat-raised-button mat-dialog-close i18n>
        View full profile
      </button>
    </mat-dialog-actions>
  `
})
export class UserProfileDialogComponent implements AfterContentChecked {

  @ViewChild(UsersProfileComponent) usersProfileComponent: UsersProfileComponent;
  name: string;
  planetCode: string;
  editable = false;
  dialogRef: any;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.name = data.member.name;
    this.planetCode = data.member.userPlanetCode;
    this.dialogRef = data.dialogRef;
  }

  ngAfterContentChecked() {
    this.editable = this.usersProfileComponent && this.usersProfileComponent.editable;
  }

  closeDialog() {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

}
