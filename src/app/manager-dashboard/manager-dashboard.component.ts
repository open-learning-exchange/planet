import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';

@Component({
  template: `
    <div *ngIf="displayDashboard">
      <a routerLink="/community" i18n mat-raised-button>Communities</a>
      <a routerLink="/nation" i18n mat-raised-button>Nations</a>
      <a routerLink="/feedback" i18n mat-raised-button>Feedback</a>
    </div>
    <div>{{message}}</div>
  `
})

export class ManagerDashboardComponent implements OnInit {
  isUserAdmin = false;
  displayDashboard = true;
  message = '';

  constructor( private userService: UserService) { }

  ngOnInit() {
    Object.assign(this, this.userService.get());
    if (!this.isUserAdmin) {
      // A non-admin user cannot receive all user docs
      this.displayDashboard = false;
      this.message = 'Access restricted to admins';
    }
  }

}
