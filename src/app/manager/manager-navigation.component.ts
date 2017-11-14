import { Component } from '@angular/core';

import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';

@Component({
  selector: 'planet-manager-navigation',
  template: `
    <ul>
      <li *ngFor="let comp of components"><a [routerLink]="'/' + comp.link">{{comp.name.toUpperCase()}}</a></li>
      <li><a href="#" class="km-logout" (click)="logoutClick()">LOGOUT</a></li>
    </ul>
  `,
  styleUrls: [ './manager-navigation.scss' ]
})
export class ManagerNavigationComponent {
  constructor(
    private couchService: CouchService,
    private router: Router
  ) {}

  components = [
    { link: 'manager/', name: 'Dashboard' },
    { link: 'manager/community', name: 'Community' },
    { link: 'manager/nation', name: 'Nation' },
  ];

  logoutClick() {
    this.couchService.delete('_session', { withCredentials: true }).then((data: any) => {
      if (data.ok === true) {
        this.router.navigate([ '/login' ], {});
      }
    });
  }

}
