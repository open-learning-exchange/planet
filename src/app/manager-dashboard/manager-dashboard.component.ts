import { Component } from '@angular/core';

@Component({
  template: `
    <div><a routerLink="/community" i18n mat-raised-button>Communities</a> <a routerLink="/nation" i18n mat-raised-button>Nations</a></div>
  `
})
export class ManagerDashboardComponent {

  constructor() { }

}
