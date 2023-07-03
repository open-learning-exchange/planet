import { Component, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogsVideoComponent } from '../../shared/dialogs/dialogs-video.component';

import { environment } from '../../../environments/environment';
@Component({
  selector: 'planet-landing-hero',
  templateUrl: 'landing-hero.component.html',
  styleUrls: [ 'landing-hero.scss' ]
})
export class LandingHeroComponent {
  constructor(
    private dialog: MatDialog
  ) {}

  playVideo() {
    this.dialog.open(DialogsVideoComponent, {
      data: {
        videoUrl: environment.uPlanetVideo
      }
    });
  }
}
