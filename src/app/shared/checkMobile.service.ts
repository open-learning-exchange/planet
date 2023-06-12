import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

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
    return this.getScreenWidth() <= environment.mobileBreakpoint ? true : false;
  }

  checkIsTablet(): boolean {
    this.setScreenWidth();
    return this.getScreenWidth() <= environment.tabletBreakpoint ? true : false;
  }
}
