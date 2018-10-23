import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'planet-home-modern',
  templateUrl: './home-modern.component.html',
  styleUrls: [ './home.scss' ]
})
export class HomeModernComponent {

  @Input() notifications = [];
  @Input() user: any = {};
  @Input() userImgSrc = '';
  @Input() sidenavState;
  @Output() sidenavStateChange = new EventEmitter<string>();
  @Input() animObs;
  // For disposable returned by observer to unsubscribe
  animDisp: any;

  @Input() logoutClick: any = () => {};
  @Input() readNotification: any = () => {};
  @Input() backgroundRoute: any = () => {};

  constructor() {}

  toggleNav() {
    this.sidenavState = this.sidenavState === 'open' ? 'closed' : 'open';
    this.sidenavStateChange.emit(this.sidenavState);
    this.animDisp = this.animObs.subscribe();
  }

  endAnimation() {
    if (this.animDisp) {
      this.animDisp.unsubscribe();
    }
  }

}
