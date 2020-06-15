import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  template: `
    <div mat-dialog-title>
      <span i18n>Member Profile</span>
    </div>
    <mat-dialog-content>
      <planet-users-profile [isDialog]="true" [userDetail]="userDetail"></planet-users-profile>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-raised-button mat-dialog-close i18n>Cancel</button>
    </mat-dialog-actions>
  `
})
export class UserProfileDialogComponent {

  userDetail: any = {};
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.userDetail = this.data.member.userDoc.doc;
  }

}
