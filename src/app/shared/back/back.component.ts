import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'planet-back',
  template: `<a mat-icon-button (click)="goBack()"><mat-icon>arrow_back</mat-icon></a>`,
})

export class BackComponent {

  previousRoute: any;

  constructor(private location: Location) { }

  goBack() {
    this.location.back();
  }
}
