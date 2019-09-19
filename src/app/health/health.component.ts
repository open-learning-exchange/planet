import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';

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

  userDetail = this.healthService.userDetail || this.userService.get();
  healthDetail = this.healthService.healthDetail;
  events = this.healthService.events;

  constructor(
    private userService: UserService,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    if (this.userDetail.name !== this.userService.get().name) {
      this.router.navigate([ 'update' ], { relativeTo: this.route });
    }
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

}
