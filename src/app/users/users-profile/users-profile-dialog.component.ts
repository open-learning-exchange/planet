import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
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
      <button color="primary" *ngIf="usersProfileComponent?.user?.isUserAdmin" routerLink="/users/profile/{{usersProfileComponent.user.name}}" mat-raised-button mat-dialog-close i18n>View full profile</button>
      <button mat-raised-button mat-dialog-close i18n>Close</button>
    </mat-dialog-actions>
  `
})
export class UserProfileDialogComponent {

  @ViewChild(UsersProfileComponent, { static: false }) usersProfileComponent: UsersProfileComponent;
  name: string;
  planetCode: string;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.name = data.member.name;
    this.planetCode = data.member.userPlanetCode;
  }

}
