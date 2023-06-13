import { Injectable } from '@angular/core';

const mobileBreakpoint = 768;
const tabletBreakpoint = 1024;

@Injectable({
  providedIn: 'root'
})
export class CheckMobileService {
  screenWidth: number;

  setScreenWidth(): void {
    this.screenWidth = window.innerWidth;
  }

  getScreenWidth(): number {
    return this.screenWidth;
  }

  checkIsMobile(): boolean {
    this.setScreenWidth();
    return this.getScreenWidth() <= mobileBreakpoint ? true : false;
  }

  checkIsTablet(): boolean {
    this.setScreenWidth();
    return this.getScreenWidth() <= tabletBreakpoint ? true : false;
  }
}
