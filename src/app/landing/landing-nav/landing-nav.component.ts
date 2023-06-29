import { Component, HostListener, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'planet-landing-nav',
  templateUrl: './landing-nav.component.html',
  styleUrls: [ './landing-nav.scss' ],
  animations: [
    trigger('slideInOut', [
      state('in', style({
        transform: 'translate3d(0,0,0)'
      })),
      state('out', style({
        transform: 'translate3d(-100%, 0, 0)'
      })),
      transition('in => out', animate('400ms ease-in-out')),
      transition('out => in', animate('400ms ease-in-out'))
    ]),
  ]
})

export class LandingNavbarComponent {
  @ViewChild('sidenav') sidenav: MatSidenav;
  baseUrl = environment.uplanetAddress;

  menuState = 'out';
  isExpanded = false;
  deviceType: DeviceType;
  deviceTypes = DeviceType;

  constructor(
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  @HostListener('window:resize') OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  toggleNav() {
    this.menuState = this.menuState === 'out' ? 'in' : 'out';
    this.isExpanded = !this.isExpanded;
  }

  closeMenu() {
    if ( this.menuState === 'in' && !this.isExpanded ) {
      this.menuState = 'out' ;
     }
    this.isExpanded = false;
  }
}
