import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UsersAchievementsService } from './users-achievements.service';
import { catchError } from 'rxjs/operators';
import { of, throwError } from 'rxjs';
import { StateService } from '../../shared/state.service';

@Component({
  templateUrl: './users-achievements.component.html',
  styleUrls: [ './users-achievements.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class UsersAchievementsComponent implements OnInit {
  user: any = {};
  achievements: any;
  infoTypes = this.usersAchievementsService.infoTypes;
  achievementNotFound = false;
  ownAchievements = false;
  redirectUrl = '/';

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private usersAchievementsService: UsersAchievementsService,
    private stateService: StateService
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe((params: ParamMap) => {
      let name = params.get('name'),
        id;
      const currentUser = this.userService.get();
      if (name === null || name === undefined) {
        this.user = currentUser;
        id = (this.user._id + '@' + this.stateService.configuration.code);
      } else {
        this.redirectUrl = '/users/profile/' + name;
        name = name.split('@')[0];
        this.initUser(name, params.get('planet'));
        id = 'org.couchdb.user:' + name + '@' + params.get('planet');
      }
      if (id === (currentUser._id + '@' + currentUser.planetCode)) {
        this.ownAchievements = true;
      }
      this.initAchievements(id);
    });
  }

  initAchievements(id) {
    this.usersAchievementsService.getAchievements(id).pipe(
      catchError((err) => this.ownAchievements ? this.usersAchievementsService.getAchievements(this.user._id) : throwError(err))
    ).subscribe((achievements) => {
      if (this.usersAchievementsService.isEmpty(achievements)) {
        this.achievementNotFound = true;
      } else {
        this.achievements = achievements._id && ({
          ...achievements,
          ...(achievements.otherInfo || []).reduce((otherInfoObj: any, info) =>
            ({ ...otherInfoObj, [info.type]: [ ...(otherInfoObj[info.type] || []), info ] }), {}
          )
        });
      }
    }, (error) => {
      if (error.status === 404) {
        this.achievementNotFound = true;
      } else {
        this.planetMessageService.showAlert('There was an error getting achievements');
      }
    });
  }

  initUser(name, planetCode) {
    const isLocal = this.stateService.configuration.code === planetCode;
    const db = isLocal ? '_users' : 'child_users';
    const id = isLocal ? 'org.couchdb.user:' + name : name + '@' + planetCode;
    this.couchService.get(db + '/' + id).subscribe((user) => this.user = user);
  }

  goBack() {
    this.router.navigate([ this.redirectUrl ]);
  }

}
