import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';

@Component({
  templateUrl: './health.component.html',
  styles: [ `
    .profile-container {
      display: grid;
      grid-template-columns: minmax(200px, 1fr) 3fr;
      grid-column-gap: 2rem;
    }
    .profile-container mat-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, 200px);
      grid-column-gap: 0.5rem;
    }
    .full-width {
      grid-column: 1 / -1;
    }
  ` ]
})
export class HealthComponent implements OnInit {

  userDetail = this.userService.get();

  constructor(
    private userService: UserService
  ) {}

}
