import { Component } from '@angular/core';

@Component({
  selector: 'planet-landing-footer',
  templateUrl: './landing-footer.component.html',
  styles: [ `
    .image-card {
      display: 'flex';
      background: '#F4F4F4';
      justify-content: 'space-around';
      width: '100%';
      flex-wrap: 'wrap';
      padding: '8px';
      position: 'absolute';
      bottom: '0';
      min-height: '5.5rem';
      & img {
        margin: '12px';
        max-height: '50px';
        width: 'auto';
      };
    }
  ` ]
})

export class LandingFooterComponent {

}
