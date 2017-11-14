import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';

@Component({
  selector: 'app-manager-dashboard',
   template: `
    <div style="float:right"><a routerLink=".." i18n class="btn btn-primary" >Normal View</a></div>
  `
})
export class ManagerDashboardComponent implements OnInit {

  constructor(
   private userService: UserService
   ) { }

  ngOnInit() {
  	Object.assign(this, this.userService.get());
  }

}
