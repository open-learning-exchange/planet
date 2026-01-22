import { Component, OnInit, Input } from '@angular/core';
import { languages } from '../shared/languages';
import { Router } from '@angular/router';

@Component({
  selector: 'planet-language',
  templateUrl: './planet-language.component.html',
  styleUrls: [ './planet-language.scss' ]
})
export class PlanetLanguageComponent implements OnInit {

  languages = languages;
  currentLanguage: any = { name: 'English', shortCode: 'eng' };
  @Input() iconOnly: boolean;

  constructor(private router: Router) {}

  ngOnInit() {
    this.currentLanguage = this.languages.find(language => {
      return window.location.href.indexOf('/' + language.shortCode + '/') > -1;
    }) || this.currentLanguage;

    this.languages = languages.filter(
      language => language.shortCode !== this.currentLanguage.shortCode);
  }

  getRouterUrl(language) {
    return '/' + language.shortCode + this.router.url;
  }

}
