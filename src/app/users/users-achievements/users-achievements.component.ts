import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';

@Component({
  templateUrl: './users-achievements.component.html',
  styles: [ `
    .profile-container {
      max-width: 900px;
      display: grid;
      grid-template-columns: 1fr 0.75fr 0.75fr;
      grid-column-gap: 2rem;
    }
  ` ]
})
export class UsersAchievementsComponent implements OnInit {
  private dbName = 'achievements';
  user: any = {};
  achievements: any;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private router: Router,
    private planetMessageService: PlanetMessageService
  ) { }

  ngOnInit() {
    this.user = this.userService.get();
    this.couchService.get(this.dbName + '/' + this.user._id).subscribe((achievements) => {
      this.achievements = achievements;
    }, (error) => {
      this.planetMessageService.showAlert('There was an error getting achievements');
      console.log(error);
    });
  }

  goBack() {
    this.router.navigate([ '/' ]);
  }

}
