import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  template: `
    <planet-login-form [isDialog]="true" (loginEvent)="login($event)"></planet-login-form>
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
    if(loginState === 'loggedIn') {
      this.dialogRef.close();
    }
  }

}
