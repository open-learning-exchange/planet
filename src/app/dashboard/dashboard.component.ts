import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { Router } from '@angular/router';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  name = '';
  message = '';
  communities = [];
  nation =[];
  roles: string[] = [];

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private router: Router
  ) {}

  getcommunitylist() {
    this.couchService.get('communityregistrationrequests/_all_docs?include_docs=true&limit=3')
     .then((data) => {
       this.communities = data.rows;
     }, (error) => this.message = 'There was a problem getting Communities');
  }

  getNationList() {
    this.couchService.get('nations/_all_docs?include_docs=true&limit=3')
      .then((data) => {
        this.nation = data.rows;
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  viewNation() {
    this.router.navigateByUrl('/nation');
  }

  viewCommunity() {
    this.router.navigateByUrl('/community');
  }

  ngOnInit() {
    Object.assign(this, this.userService.get());
    this.getcommunitylist();
    this.getNationList();
  }
}
