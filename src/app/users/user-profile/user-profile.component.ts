import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';

@Component({
  templateUrl: './user-profile.component.html'
})
export class UserProfileComponent implements OnInit {
  userDetail = [];
  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.profileView();
  }

  profileView() {
    this.couchService.get('_users/org.couchdb.user:' + this.route.snapshot.paramMap.get('name')).subscribe((response) => {
      this.userDetail = response;
    }, (error) => {
      console.log(error);
    });
  }
}
