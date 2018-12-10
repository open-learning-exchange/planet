import { Component } from '@angular/core';

@Component({
  selector: 'planet-page-not-found',
  templateUrl: './page-not-found.component.html',
  styles: [ `
    .error {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10vh;
    }
  ` ]
})
export class PageNotFoundComponent {

  constructor() { }

}
