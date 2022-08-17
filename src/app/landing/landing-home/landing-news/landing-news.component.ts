import { Component } from '@angular/core';

@Component({
  selector: 'planet-landing-news',
  templateUrl: './landing-news.component.html',
  styles: [ `
  .newscard-container {
    min-height: 300px;
    margin-top: 24px;
  }

  .error-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .loading-block {
    padding: 0;
    margin-top: 24px;
  }

  .skeleton-container {
    margin: 16px;
    align-items: center;
  }
   ` ]
})
export class LandingNewsComponent {

}
