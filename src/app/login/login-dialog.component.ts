import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  template: `
    <mat-dialog-content>
      <planet-login-form [isDialog]="true" (loginEvent)="login($event)"></planet-login-form>
      <div class="myplanet-link">
        <span i18n class="margin-lr-3">On Android?</span>
        <a mat-button target="_blank" rel="noopener noreferrer"
          href="https://play.google.com/store/apps/details?id=org.ole.planet.myplanet">
          <ng-container i18n>Try myPlanet</ng-container>
          <mat-icon aria-hidden="true" class="margin-lr-3">open_in_new</mat-icon>
        </a>
      </div>
    </mat-dialog-content>
  `
})
export class LoginDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<LoginDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  close() {
    this.dialogRef.close();
  }

  login(loginState: 'loggedOut' | 'loggedIn') {
    if (loginState === 'loggedIn') {
      this.dialogRef.close(loginState);
    }
  }
}
