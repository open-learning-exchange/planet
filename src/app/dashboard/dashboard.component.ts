import { Component, OnInit } from '@angular/core';

import { UserService } from '../shared/user.service';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  template: `
    <div id="greeting">Hi, {{name}}</div>
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
