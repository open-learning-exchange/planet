import { Component } from '@angular/core';

@Component({
  selector: 'planet-landing',
  templateUrl: './landing.component.html',
  styles: [ `
   .layoutbox {
    position: relative;
    min-height: 100vh;
    overflow-x: hidden;
    max-width: 100%;
  }

  .childrenbox {
    padding-bottom: 6rem;
  }
   ` ]
})
export class LandingComponent {

}

