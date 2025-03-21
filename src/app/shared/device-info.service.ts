import { Injectable } from '@angular/core';

export enum DeviceType {
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  DESKTOP = 'DESKTOP'
}

export interface DeviceBreakpoints {
  tablet?: number;
  mobile?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceInfoService {
  private screenWidth: number;

  constructor() {
    this.screenWidth = window.innerWidth;
    window.addEventListener('resize', this.updateScreenWidth.bind(this));
  }

  private updateScreenWidth(): void {
    this.screenWidth = window.innerWidth;
  }

  public getDeviceType(breakpoints: DeviceBreakpoints = {}): DeviceType {
    const mobileWidth = breakpoints.mobile || 780;
    const tabletWidth = breakpoints.tablet || 1000;

    if (this.screenWidth <= mobileWidth) {
      return DeviceType.MOBILE;
    } else if (this.screenWidth <= tabletWidth) {
      return DeviceType.TABLET;
    } else {
      return DeviceType.DESKTOP;
    }
  }

  public isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

}
