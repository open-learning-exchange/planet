import { Component } from '@angular/core';
import { MatAnchor } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'planet-page-not-found',
  templateUrl: './page-not-found.component.html',
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 10vh;
    }
  `],
  imports: [MatAnchor, RouterLink]
})
export class PageNotFoundComponent {

  constructor() { }

}
