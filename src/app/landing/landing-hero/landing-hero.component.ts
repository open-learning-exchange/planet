import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogsVideoComponent } from '../../shared/dialogs/dialogs-video.component';

@Component({
  selector: 'planet-landing-hero',
  templateUrl: 'landing-hero.component.html',
  styleUrls: [ 'landing-hero.scss' ]
})
export class LandingHeroComponent {
  constructor(private dialog: MatDialog) {
    this.playVideo();
  }

  playVideo() {
    this.dialog.open(DialogsVideoComponent, {
      data: {
        videoUrl: 'assets/landing-page/video/landing.mp4'
      }
    });
  }
}
