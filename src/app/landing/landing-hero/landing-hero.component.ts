import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'planet-landing-hero',
  templateUrl: 'landing-hero.component.html',
  styleUrls: [ 'landing-hero.scss' ]
})
export class LandingHeroComponent {
  @Output() playVideoEvent = new EventEmitter<boolean>();

  playVideo() {
    this.playVideoEvent.emit(true);
  }
}
