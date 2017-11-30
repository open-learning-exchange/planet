import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'planet-app',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent implements OnInit {

  lang: string = localStorage.getItem('lang') ? localStorage.getItem('lang') : navigator.language;
  direction: string;

  ngOnInit() {
    // there are en-US, en-GB,etc...
    if (this.lang.indexOf('en') !== -1) {
      localStorage.setItem('direction', 'ltr');
      localStorage.setItem('lang', 'en');
    } else if (this.lang === 'ar') {
      localStorage.setItem('direction', 'rtl');
      localStorage.setItem('lang', this.lang);
    }
  }

}
