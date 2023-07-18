import { Component } from '@angular/core';

@Component({
  selector: 'planet-landing-footer',
  template: `
  <div class="image-card">
    <img src="assets/landing-page/logos/ole.svg" width="100" height="100" alt="ole-logo" />
    <img src="assets/landing-page/logos/uaiki.svg" width="100" height="100" alt="uaiki-logo" />
    <img src="assets/landing-page/logos/onu.svg" width="100" height="100" alt="onu-logo" />
    <img src="assets/landing-page/logos/usaid.svg" width="100" height="100" alt="usaid-logo" />
  </div>
  `,
  styles: [ `
  .image-card {
    display: flex;
    background: #F4F4F4;
    justify-content: space-around;
    width: 100%;
    flex-wrap: wrap;
    padding: 8px;
    & img {
      margin: 12px;
      max-height: 50px;
      width: auto;
    };
    position: absolute;
    bottom: 0;
    min-height: 5.5rem;
  }
  ` ]
})

export class LandingFooterComponent {

}
