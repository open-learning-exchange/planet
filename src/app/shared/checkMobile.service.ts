import { Injectable } from '@angular/core';
// import { fromEvent } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class CheckMobileService {
  screenWidth: number;

  // constructor() {
  //   window.addEventListener('resize', (event) => {
  //     this.setScreenWidth();
  //   })
  // }

  setScreenWidth(): void {
    this.screenWidth = window.innerWidth;
  }

  getScreenWidth(): number {
    return this.screenWidth;
  }

  checkIsMobile(): boolean {
    this.setScreenWidth();
    // console.log(this.screenWidth);
    // console.log(typeof this.screenWidth);
    // console.log(this.getScreenWidth() <= 780);
    // console.log(this.getScreenWidth() <= 780 ? true : false);
    return this.getScreenWidth() <= 780 ? true : false;
  }
}
