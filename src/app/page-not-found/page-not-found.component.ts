import { Component } from '@angular/core';

@Component({
  selector: 'planet-page-not-found',
  templateUrl: './page-not-found.component.html',
  styles: [ `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 10vh;
    }
  ` ]
})
export class PageNotFoundComponent {

  constructor() { }

}
