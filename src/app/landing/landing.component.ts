import { Component } from '@angular/core';

@Component({
  selector: 'planet-landing',
  template: `
    <div class="layoutbox">
      <planet-landing-nav></planet-landing-nav>
      <div class="childrenbox">
        <planet-landing-hero></planet-landing-hero>
        <planet-landing-home></planet-landing-home>
      </div>
      <planet-landing-footer></planet-landing-footer>
    </div>
  `,
  styles: [
    `
      .layoutbox {
        position: relative;
        min-height: 100vh;
        overflow-x: hidden;
        max-width: 100%;
        font-family: "Roboto", "Helvetica", "Arial", sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .childrenbox {
        padding-bottom: 6rem;
      }
    `,
  ],
})
export class LandingComponent {

}
