import { Injectable } from '@angular/core';

// Set the same as the screen sizes in _variables.scss
const mobileBreakpoint = 780;
const tabletBreakpoint = 1000;

interface DeviceSize {
  isMobile: boolean;
  isTablet: boolean;
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

  updateScreenWidth(): void {
    this.screenWidth = window.innerWidth;
  }

  getDeviceSize(): DeviceSize {
    const isMobile = this.screenWidth <= mobileBreakpoint;
    const isTablet = this.screenWidth >= mobileBreakpoint && this.screenWidth <= tabletBreakpoint;

    return { isMobile, isTablet };
  }
}
