import { Injectable } from '@angular/core';

export enum DeviceType {
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  DESKTOP = 'DESKTOP'
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

  public getDeviceType(): DeviceType {
    if (this.screenWidth <= 780) {
      return DeviceType.MOBILE;
    } else if (this.screenWidth <= 1000) {
      return DeviceType.TABLET;
    } else {
      return DeviceType.DESKTOP;
    }
  }

  public isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

}
