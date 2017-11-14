import { Component, OnInit, ViewEncapsulation } from '@angular/core';

@Component({
  template: `
    <div><a routerLink="/community" i18n class="btn btn-primary">Communities</a> <a routerLink="/nation" i18n class="btn btn-primary">Nations</a></div>
  `,
  encapsulation: ViewEncapsulation.None
})
export class ManagerDashboardComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
