import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { languages } from '../shared/languages';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { NgIf, NgFor } from '@angular/common';

@Component({
    selector: 'planet-language',
    templateUrl: './planet-language.component.html',
    styleUrls: ['./planet-language.scss'],
    imports: [MatButton, MatMenuTrigger, MatIcon, NgIf, MatMenu, NgFor, MatMenuItem]
})
export class PlanetLanguageComponent implements OnInit {

  languages = languages;
  currentLanguage: any = { name: 'English', shortCode: 'eng' };
  @Input() iconOnly: boolean;
  @ViewChild(MatMenuTrigger) menuTrigger: MatMenuTrigger;

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

  openMenu() {
    this.menuTrigger?.openMenu();
  }
}
