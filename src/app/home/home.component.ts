import { Component, OnInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  templateUrl: './home.component.html',
  styleUrls: [ './home.scss' ]
})
export class HomeComponent {
  name = '';
  roles: string[] = [];
  constructor(
    private couchService: CouchService,
    private router: Router,
    private userService: UserService
  ) {}

  logoutClick() {
    this.couchService.delete('_session', { withCredentials: true }).subscribe((data: any) => {
      if (data.ok === true) {
        this.router.navigate([ '/login' ], {});
      }
    });
  }

  ngOnInit() {
    Object.assign(this, this.userService.get());
  }


  backgroundRoute() {
    const routesWithBackground = [ 'resources' ];
    return routesWithBackground.findIndex((route) => this.router.url.indexOf(route) > -1) > -1;
  }
}
