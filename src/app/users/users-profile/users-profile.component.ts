import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { environment } from '../../../environments/environment';
import { UserService } from '../../shared/user.service';
import { UsersAchievementsService } from '../users-achievements/users-achievements.service';
import { findDocuments } from '../../shared/mangoQueries';
import { StateService } from '../../shared/state.service';

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
  hasAchievement = false;
  totalLogins = 0;
  lastLogin = 0;

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router,
    private usersAchievementsService: UsersAchievementsService,
    private stateService: StateService
  ) { }

  ngOnInit() {
    this.user = this.userService.get();
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.urlName = params.get('name');
      this.planetCode = params.get('planet');
      this.profileView();
      this.getLoginInfo(this.urlName);
    });
  }

  getLoginInfo(name) {
    this.couchService.findAll('login_activities', findDocuments({ 'user': name }, 0, [ { 'loginTime': 'desc' } ]))
    .subscribe((logins: any) => {
      this.totalLogins = logins.length;
      this.lastLogin = logins.length ? logins[0].loginTime : '';
    });
  }

  checkHasAchievments() {
    const id = 'org.couchdb.user:' + this.userDetail.name + '@' + this.userDetail.planetCode;
    this.usersAchievementsService.getAchievements(id).subscribe((achievements) => {
      this.hasAchievement = !this.usersAchievementsService.isEmpty(achievements);
    }, (error) => {
      console.log(error);
      this.hasAchievement = false;
    });
  }

  profileView() {
    const relationship = this.planetCode === this.stateService.configuration.parentCode ? 'parent' : 'child';
    const dbName = this.planetCode === null ? this.dbName : `${relationship}_users`;
    const userId = this.planetCode === null || relationship === 'parent'
      ? 'org.couchdb.user:' + this.urlName : this.urlName + '@' + this.planetCode;
    this.editable = this.userService.doesUserHaveRole([ '_admin' ]) && userId.indexOf('@') === -1 && relationship !== 'parent';
    this.couchService.get(dbName + '/' + userId).subscribe((response) => {
      const { derived_key, iterations, password_scheme, salt, ...userDetail } = response;
      this.userDetail = userDetail;
      if (response['_attachments']) {
        const filename = Object.keys(response._attachments)[0];
        this.imageSrc = this.urlPrefix + '/org.couchdb.user:' + this.urlName + '/' + filename;
      }
      this.checkHasAchievments();
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
