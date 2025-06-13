import { Component, OnInit, OnDestroy, Input, HostListener } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CouchService } from '../../shared/couchdb.service';
import { environment } from '../../../environments/environment';
import { UserService } from '../../shared/user.service';
import { UsersAchievementsService } from '../users-achievements/users-achievements.service';
import { findDocuments } from '../../shared/mangoQueries';
import { StateService } from '../../shared/state.service';
import { educationLevel } from '../user-constants';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';
import { TeamsService } from '../../teams/teams.service';

@Component({
  selector: 'planet-users-profile',
  templateUrl: './users-profile.component.html',
  styleUrls: [ './users-profile.scss' ]
})
export class UsersProfileComponent implements OnInit, OnDestroy {
  private dbName = '_users';
  user: any = {};
  userDetail: any = {};
  imageSrc = '';
  urlPrefix = environment.couchAddress + '/' + this.dbName + '/';
  urlName = '';
  editable = false;
  hasAchievement = false;
  totalLogins = 0;
  lastLogin = 0;
  educationLevel = educationLevel;
  deviceType: DeviceType;
  isMobile: boolean;
  teams: any[] = [];
  enterprises: any[] = [];
  private onDestroy$ = new Subject<void>();
  @Input() planetCode: string | null = null;
  @Input() isDialog: boolean;
  @Input() userName: string;

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router,
    private usersAchievementsService: UsersAchievementsService,
    private stateService: StateService,
    private deviceInfoService: DeviceInfoService,
    private teamsService: TeamsService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isMobile = this.deviceType === DeviceType.MOBILE;
  }

  ngOnInit() {
    this.user = this.userService.get();
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.urlName = this.userName || params.get('name');
      this.planetCode = this.planetCode || params.get('planet');
      this.profileView();
      this.getLoginInfo(this.urlName);
      this.getTeamsAndEnterprises();
    });
    this.userService.userChange$.pipe(takeUntil(this.onDestroy$)).subscribe((user) => {
      if (user._id === this.userDetail._id && user.planetCode === this.userDetail.planetCode) {
        this.userDetail = user;
      }
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isMobile = this.deviceType === DeviceType.MOBILE || this.deviceType === DeviceType.SMALL_MOBILE;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getLoginInfo(name) {
    const createdOn = this.planetCode || this.stateService.configuration.code;
    this.couchService.findAll('login_activities', findDocuments({ 'user': name, createdOn }, 0, [ { 'loginTime': 'desc' } ]))
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
    const relationship = this.userRelationship(this.planetCode);
    const dbName = relationship === 'local' ? this.dbName : `${relationship}_users`;
    const userId = relationship === 'local' || relationship === 'parent'
      ? 'org.couchdb.user:' + this.urlName : this.urlName + '@' + this.planetCode;
    this.couchService.get(dbName + '/' + userId).subscribe((response) => {
      const { derived_key, iterations, password_scheme, salt, ...userDetail } = response;
      this.userDetail = userDetail;
      this.editable = relationship === 'local' && (
        userDetail.name === this.userService.get().name ||
        (this.userService.doesUserHaveRole([ '_admin' ]) && this.stateService.configuration.adminName.split('@')[0] !== this.urlName)
      );
      if (response['_attachments']) {
        const filename = Object.keys(response._attachments)[0];
        this.imageSrc = this.urlPrefix + '/org.couchdb.user:' + this.urlName + '/' + filename;
      }
      this.checkHasAchievments();
    }, (error) => {
      console.log(error);
    });
  }

  userRelationship(planetCode: string) {
    return planetCode === this.stateService.configuration.parentCode ?
      'parent' :
      planetCode === null || planetCode === this.stateService.configuration.code ?
      'local' :
      'child';
  }

  goBack() {
    const teamsUrl = this.router.url.split('/');
    const currentUser = this.userService.get();
    if (currentUser.isUserAdmin || teamsUrl[1] === 'teams') {
      this.router.navigate([ '../../' ], { relativeTo: this.route });
    } else {
      this.router.navigate([ '/' ]);
    }
  }

  getUserRoles(): string[] {
    const rolesSet = new Set<string>();
    if (this.userDetail.isUserAdmin) {
      rolesSet.add('admin');
    }
    if (this.userDetail.roles && this.userDetail.roles.length > 0) {
      this.userDetail.roles.forEach(role => rolesSet.add(role));
    }
    return Array.from(rolesSet);
  }

  getTeamsAndEnterprises() {
    this.teamsService.getTeamsByUser(this.urlName, this.planetCode).subscribe(teams => {
      this.teams = teams.filter((team: any) => !team.doc.type || team.doc.type === 'team');
      this.enterprises = teams.filter((team: any) => team.doc.type === 'enterprise');
    });
  }
}
