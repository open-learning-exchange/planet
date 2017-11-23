import { Component, OnInit, ViewEncapsulation } from '@angular/core';

@Component({
  template: `
    <div><a mat-raised-button routerLink="/community" i18n>Communities</a> <a routerLink="/nation" i18n mat-raised-button>Nations</a></div>
  `,
  encapsulation: ViewEncapsulation.None
})
export class ManagerDashboardComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
