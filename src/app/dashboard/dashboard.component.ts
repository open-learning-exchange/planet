import { Component, OnInit } from '@angular/core';

import { UserService } from '../shared/user.service';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.scss' ]
})

export class DashboardComponent implements OnInit {
  myLibrary = [
    { text: 'library one' },
    { text: 'library two' },
    { text: 'library three' },
    { text: 'library four' },
    { text: 'library five' },
    { text: 'library six' },
    { text: 'library seven' },
    { text: 'library Eight' },
    { text: 'library nine' },
    { text: 'library ten' },
  ];
  myTeam = [
    { text: 'team one' },
    { text: 'team two' },
    { text: 'team three' },
    { text: 'team four' },
    { text: 'team five' },
    { text: 'team six' },
  ];
  myMeetups = [
    { text: 'meetup one' },
    { text: 'meetup two' },
    { text: 'meetup three' },
    { text: 'meetup four' },
    { text: 'meetup five' },
    { text: 'meetup six' },
    { text: 'meetup seven' },
  ];
  myCourses = [
  { text: 'courses one' },
  { text: 'courses two' },
  { text: 'courses three' },
  { text: 'courses four' },
  { text: 'courses five' },
  { text: 'courses six' },
  { text: 'courses seven' },
  ];
  constructor(
    private userService: UserService
  ) {}

  ngOnInit() {
    Object.assign(this, this.userService.get());
  }

  nextLibrary() {
    this.myLibrary = this.myLibrary.concat( this.myLibrary.splice( 0, 4 ) );
  }

  previousLibrary() {
    for ( let i = 0; i < 4; i++) {
      this.myLibrary.unshift(this.myLibrary.pop());
    }
  }

  nextMyTeam() {
    this.myTeam = this.myTeam.concat( this.myTeam.splice( 0, 4) );
  }

  previousMyTeam() {
    for ( let i = 0; i < 4; i++ ) {
      this.myTeam.unshift( this.myTeam.pop() );
    }
  }

  nextMyMeetups() {
    this.myMeetups = this.myMeetups.concat( this.myMeetups.splice( 0, 4 ) );
  }

  previousMyMeetups() {
    for ( let i = 0; i < 4; i++ ) {
      this.myMeetups.unshift( this.myMeetups.pop() );
    }
  }

  nextMyCourses() {
    this.myCourses = this.myCourses.concat( this.myCourses.splice( 0, 4 ) );
  }

  previousMyCourses() {
    for ( let i = 0; i < 4; i++ ) {
      this.myCourses.unshift( this.myCourses.pop() );
    }
 }
}
