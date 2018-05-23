import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { takeUntil, switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { MeetupService } from '../meetups.service';
import { Subject } from 'rxjs/Subject';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';

@Component({
  templateUrl: './meetups-view.component.html'
})

export class MeetupsViewComponent implements OnInit, OnDestroy {
  private onDestroy$ = new Subject<void>();
  meetupDetail: any = {};
  parent = this.route.snapshot.data.parent;
  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private meetupService: MeetupService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
  ) { }

  ngOnInit() {
    this.route.paramMap
      .debug('Getting meetup id from parameters')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((params: ParamMap) => {
        const meetupId = params.get('id');
        const getOpts: any = { meetupIds: [ meetupId ] };
        if (this.parent) {
          getOpts.opts = { domain: this.userService.getConfig().parentDomain };
        }
        this.meetupService.updateMeetups(getOpts);
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

  joinMeetup() {
    this.meetupService.attendMeetup(this.meetupDetail._id, this.meetupDetail.participate).subscribe((res) => {
      const msg = res.participate ? 'left' : 'joined';
      this.planetMessageService.showMessage('You have ' + msg + ' selected meetup.');
    });
  }

}
