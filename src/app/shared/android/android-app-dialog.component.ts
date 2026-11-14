import { Component } from '@angular/core';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatAnchor, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ANDROID_APPS } from './android-apps';

@Component({
  templateUrl: './android-app-dialog.component.html',
  styleUrls: ['./android-app-dialog.component.scss'],
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatAnchor, MatButton, MatIcon]
})
export class AndroidAppDialogComponent {

  readonly apps = ANDROID_APPS;

  constructor(public dialogRef: MatDialogRef<AndroidAppDialogComponent>) {}

  close() {
    this.dialogRef.close();
  }
}
