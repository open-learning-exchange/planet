import { Component, OnInit } from '@angular/core';

@Component({
  template: `
  <planet-manager-navigation></planet-manager-navigation>
  <main class="container">
    <router-outlet></router-outlet>
  </main>
`,
styleUrls: [ './manager.component.scss' ]
})
export class ManagerComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
