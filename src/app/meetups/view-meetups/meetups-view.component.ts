import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { UserService } from '../../shared/user.service';
import { findDocuments } from '../../shared/mangoQueries';
import { of } from 'rxjs/observable/of';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { MeetupService } from '../meetups.service';

@Component({
  templateUrl: './meetups-view.component.html'
})

export class MeetupsViewComponent implements OnInit {

  meetupDetail: any = {};

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private meetupService: MeetupService
  ) { }

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getMeetup(params.get('id'))))
      .debug('Getting meetup id from parameters')
      .subscribe((meetup) => {
        this.meetupDetail = meetup;
        this.getMeetupMember(meetup._id);
      }, error => console.log(error));
  }

  getMeetupMember(id: string) {
    this.couchService.post(`shelf/_find`,
      findDocuments({ 'meetupIds': id }, 0 ))
      .pipe(switchMap(data => {
        console.log("First data",data)
        const memberId = this.userService.get()._id;
        if (memberId.indexOf(this.userService.get()._id) > -1) {
          return of(true);
        }
        return of(false);
      })).subscribe(data => {
        console.log("second data",data);
        (data) ? this.meetupDetail.participate = true : this.meetupDetail.participate = false;
      });
  }

  getMeetup(id: string) {
    return this.couchService.get('meetups/' + id);
  }

  attendMeetup(meetupIds) {
    this.couchService.post(`shelf/_find`,
      findDocuments({ 'meetupIds': meetupIds }, 0 ))
      .pipe(switchMap(data => {
        const meetupInfo = { ...data.docs[0] };
        const meetupIds = this.userService.get()._id;
        const username: string = this.userService.get()._id;
        //(meetupIds.indexOf(username) > -1) ? meetupIds.splice(meetupIds.indexOf(username), 1) : meetupIds.push(username);
        return this.couchService.put('shelf/' + meetupInfo._id , { ...meetupInfo, meetupIds });
      })).subscribe((res) => {
        (this.meetupDetail.participate) ? this.meetupDetail.participate = false : this.meetupDetail.participate = true;
        const msg = this.meetupDetail.participate ? 'join' : 'left';
        this.planetMessageService.showAlert('You have ' + msg + ' selected meetup.');
      });
  }

}
