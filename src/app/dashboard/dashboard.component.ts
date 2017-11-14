import { Component, OnInit } from '@angular/core';

import { UserService } from '../shared/user.service';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  template: `
    <div id="greeting">Hi, {{name}}</div>
    <div style="float:right"><a href="manager" i18n class="btn btn-primary" >Manager View</a></div>
  `
})
export class DashboardComponent implements OnInit {
  name = '';
  roles: string[] = [];

  constructor(
    private userService: UserService
  ) {}

  ngOnInit() {
    Object.assign(this, this.userService.get());
  }
}
