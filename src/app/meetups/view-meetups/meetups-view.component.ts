import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { takeUntil, switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { MeetupService } from '../meetups.service';
import { Subject } from 'rxjs/Subject';
import { UserService } from '../../shared/user.service';

@Component({
  templateUrl: './meetups-view.component.html'
})

export class MeetupsViewComponent implements OnInit, OnDestroy {
  private onDestroy$ = new Subject<void>();
  meetupDetail: any = {};
  meetupId: any = {} ;

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    // meetupService made public because of error Property is private and only accessible within class during prod build
    public meetupService: MeetupService,
    public userService: UserService
  ) { }

  ngOnInit() {
    this.route.paramMap
      .debug('Getting meetup id from parameters')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((params: ParamMap) => {
        const meetupId = params.get('id');
        this.meetupId = meetupId;
        this.meetupService.updateMeetups({ meetupIds: [ meetupId ] });
      }, error => console.log(error), () => console.log('complete getting meetup id'));
    this.meetupService.meetupUpdated$.pipe(takeUntil(this.onDestroy$))
      .subscribe((meetupArray) => {
        this.meetupDetail = meetupArray[0];
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  openDialogService() {
    console.log('current user', this.userService.get());
    this.meetupService.inviteMemberForm(this.meetupDetail);
  }
}
