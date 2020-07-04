import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { UserService } from '../../shared/user.service';

@Component({
  template: `
    <div mat-dialog-title>
      <span i18n>Member Profile</span>
    </div>
    <mat-dialog-content>
      <planet-users-profile [isDialog]="true" [userName]="name" [planetCode]="planetCode"></planet-users-profile>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button color="primary" *ngIf="!isHidden" routerLink="/manager/users" mat-raised-button mat-dialog-close i18n>Manager Settings</button>
      <button mat-raised-button mat-dialog-close i18n>Close</button>
    </mat-dialog-actions>
  `
})
export class UserProfileDialogComponent {

  name: string;
  planetCode: string;
  isHidden: boolean;

  constructor(
  @Inject(MAT_DIALOG_DATA) public data: any,
  private userService: UserService
  ) {
    this.name = data.member.name;
    this.planetCode = data.member.userPlanetCode;
    const currentUser = this.userService.get();
    this.isHidden = !currentUser.isUserAdmin;
  }
}
