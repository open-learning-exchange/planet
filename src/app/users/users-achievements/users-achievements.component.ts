import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UsersAchievementsService } from './users-achievements.service';

@Component({
  templateUrl: './users-achievements.component.html',
  styles: [ `
    .achievements-container {
      text-align: center;
      max-width: 800px;
      margin: 0 auto;
    }
    .achievements-container mat-list {
      text-align: left;
    }
  ` ]
})
export class UsersAchievementsComponent implements OnInit {
  private dbName = 'achievements';
  user: any = {};
  achievements: any;
  infoTypes = this.usersAchievementsService.infoTypes;
  // hasError = false;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private router: Router,
    private planetMessageService: PlanetMessageService,
    private usersAchievementsService: UsersAchievementsService
  ) { }

  ngOnInit() {
    this.user = this.userService.get();
    this.couchService.get(this.dbName + '/' + this.user._id).subscribe((achievements) => {
      this.achievements = achievements._id && ({
        ...achievements,
        ...(achievements.otherInfo || []).reduce((otherInfoObj: any, info) =>
          ({ ...otherInfoObj, [info.type]: [ ...(otherInfoObj[info.type] || []), info ] }), {}
        )
      });
    }, (error) => {
      // this.planetMessageService.showAlert('There was an error getting achievements');
      // this.hasError = true;
      console.log(error);
    });
  }

  goBack() {
    this.router.navigate([ '/' ]);
  }

}
