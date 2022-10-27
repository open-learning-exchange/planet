import { Injectable } from '@angular/core';

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
    return this.getScreenWidth() <= 780 ? true : false;
  }
}
