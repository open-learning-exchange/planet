import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'planet-back',
  templateUrl: './back.component.html',
  styleUrls: [ './back.component.scss' ],
})

export class BackComponent {

  previousRoute: any;

  constructor(private location: Location) { }

  goBack() {
    this.location.back();
  }
}
