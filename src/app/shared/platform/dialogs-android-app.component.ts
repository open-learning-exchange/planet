import { Component } from '@angular/core';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatAnchor, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ANDROID_APPS } from './android-apps';

@Component({
  templateUrl: './dialogs-android-app.component.html',
  styleUrls: ['./dialogs-android-app.component.scss'],
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatAnchor, MatButton, MatIcon]
})
export class DialogsAndroidAppComponent {

  readonly apps = ANDROID_APPS;

  constructor(public dialogRef: MatDialogRef<DialogsAndroidAppComponent>) {}

  close() {
    this.dialogRef.close();
  }
}
