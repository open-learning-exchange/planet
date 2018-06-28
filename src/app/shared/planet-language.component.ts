import { Component, OnInit } from '@angular/core';
import { languages } from '../shared/languages';
import { Router } from '@angular/router';

@Component({
  selector: 'planet-language',
  templateUrl: './planet-language.component.html'
})
export class PlanetLanguageComponent implements OnInit {

  languages = languages;
  currentLanguage: any = { name: 'English', shortCode: 'eng' };

  constructor(private router: Router) {}

  ngOnInit() {
    this.currentLanguage = this.languages.find(language => {
      return window.location.href.indexOf('/' + language.shortCode + '/') > -1;
    }) || this.currentLanguage;

    this.languages = languages.filter(
      language => language.shortCode !== this.currentLanguage.shortCode);
  }

  getRouterUrl(language) {
    const newRoute = '/' + language.shortCode + this.router.url;
    if (this.router.url.indexOf('/' + this.currentLanguage.shortCode + '/') === 0) {
      newRoute.replace('/' + this.currentLanguage.shortCode + '/', '/' + language.shortCode + '/');
    }

    return newRoute;
  }
}
