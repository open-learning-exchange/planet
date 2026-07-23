import { Component } from '@angular/core';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatAnchor, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

interface MobileApp {
  name: string;
  description: string;
  url: string;
}

@Component({
  templateUrl: './dialogs-android-app.component.html',
  styleUrls: ['./dialogs-android-app.component.scss'],
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatAnchor, MatButton, MatIcon]
})
export class DialogsAndroidAppComponent {

  apps: MobileApp[] = [
    {
      name: $localize`myPlanet`,
      description: $localize`Full-featured offline learning app`,
      url: 'https://play.google.com/store/apps/details?id=org.ole.planet.myplanet'
    },
    {
      name: $localize`myPlanet Lite`,
      description: $localize`Lightweight version that uses less storage`,
      url: 'https://play.google.com/store/apps/details?id=org.ole.planet.myplanet.lite'
    }
  ];

  constructor(public dialogRef: MatDialogRef<DialogsAndroidAppComponent>) {}

  close() {
    this.dialogRef.close();
  }
}
