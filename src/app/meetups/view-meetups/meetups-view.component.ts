import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { UserService } from '../../shared/user.service';
import { findDocuments } from '../../shared/mangoQueries';
import { of } from 'rxjs/observable/of';

@Component({
  templateUrl: './meetups-view.component.html'
})

export class MeetupsViewComponent implements OnInit {

  meetupDetail: any = {};

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private userService: UserService
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
    this.couchService.post(`usermeetups/_find`,
      findDocuments({ 'meetupId': id }, 0 ))
      .pipe(switchMap(data => {
        const memberId = data.docs[0].memberId;
        if (memberId.indexOf(this.userService.get().name) > -1) {
          return of(true);
        }
        return of(false);
      })).subscribe(data => {
        (data) ? this.meetupDetail.participate = true : this.meetupDetail.participate = false;
      });
  }

  getMeetup(id: string) {
    return this.couchService.get('meetups/' + id);
  }

  attendMeetup(meetupId) {
  this.couchService.post(`usermeetups/_find`,
    findDocuments({ 'meetupId': meetupId }, 0 ))
    .pipe(switchMap(data => {
      const meetupInfo = { ...data.docs[0] };
      const memberId = data.docs[0].memberId;
      (this.meetupDetail.participate) ? memberId.splice(this.userService.get().name.string, 1) : memberId.push(this.userService.get().name);
      return of({ ...meetupInfo, memberId });
    })).subscribe((usermeetup) => {
      this.couchService.put('usermeetups/' + usermeetup._id , { ...usermeetup }).subscribe(() => {
        (this.meetupDetail.participate) ? this.meetupDetail.participate = false : this.meetupDetail.participate = true;
      });
    });
  }

}
