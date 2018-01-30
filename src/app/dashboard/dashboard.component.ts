import { Component, OnInit } from '@angular/core';

import { UserService } from '../shared/user.service';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.scss' ]
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
