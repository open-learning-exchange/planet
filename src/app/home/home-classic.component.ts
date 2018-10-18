import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-home-classic',
  templateUrl: './home-classic.component.html',
  styleUrls: [ './home.scss' ]
})
export class HomeClassicComponent {

  @Input() notifications = [];
  @Input() user: any = {};
  @Input() userImgSrc = '';
  @Input() logoutClick: any = () => {};
  @Input() readNotification: any = () => {};
  @Input() backgroundRoute: any = () => {};

  constructor() {}

}
