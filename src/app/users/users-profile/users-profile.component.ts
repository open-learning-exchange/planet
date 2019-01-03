import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { environment } from '../../../environments/environment';
import { UserService } from '../../shared/user.service';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './users-profile.component.html',
  styles: [ `
    .profile-container {
      max-width: 900px;
      display: grid;
      grid-template-columns: 1fr 0.75fr 0.75fr;
      grid-column-gap: 2rem;
    }
  ` ]
})
export class UsersProfileComponent implements OnInit {
  private dbName = '_users';
  userDetail: any = {};
  user: any = {};
  imageSrc = '';
  urlPrefix = environment.couchAddress + '/' + this.dbName + '/';
  urlName = '';
  planetCode: string | null = null;
  editable = false;

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit() {
    this.user = this.userService.get();
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.urlName = params.get('name');
      this.planetCode = params.get('planet');
      this.profileView();
    });
  }

  profileView() {
    const dbName = this.planetCode === null ? this.dbName : 'child_users';
    const userId = this.planetCode === null ? 'org.couchdb.user:' + this.urlName : this.urlName + '@' + this.planetCode;
    this.editable = userId.indexOf('@') === -1;
    this.couchService.get(dbName + '/' + userId).subscribe((response) => {
      const { derived_key, iterations, password_scheme, salt, ...userDetail } = response;
      this.userDetail = userDetail;
      if (response['_attachments']) {
        const filename = Object.keys(response._attachments)[0];
        this.imageSrc = this.urlPrefix + '/org.couchdb.user:' + this.urlName + '/' + filename;
      }
    }, (error) => {
      console.log(error);
    });
  }

  goBack() {
    const currentUser = this.userService.get();
    if (currentUser.isUserAdmin) {
      this.router.navigate([ '../../' ], { relativeTo: this.route });
    } else {
      this.router.navigate([ '/' ]);
    }
  }

}
