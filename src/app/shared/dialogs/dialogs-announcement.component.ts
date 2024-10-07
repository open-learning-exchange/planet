import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  template: `
    <planet-markdown [content]="announcement"></planet-markdown>
  `
})
export class DialogsAnnouncementComponent {
  announcement = `
    ## Planet issues challenge

    <img src="https://meetgor-cdn.pages.dev/github-filter-issues.png" alt="issues challenge" width="350" height="250">

    Get ready for virtual intern github issues challenge!

    **Duration:** 30 days

    ## Steps to participate:
    - Find an issue on Planet
    - Take a screenshot/record a video
    - Create an issue on our github repository using link below

    [open new Planet issue](https://github.com/open-learning-exchange/planet/issues/new)
  `


  constructor(
    public dialogRef: MatDialogRef<DialogsAnnouncementComponent>,
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}
