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
  parent = this.route.snapshot.data.parent;
  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    // meetupService made public because of error Property is private and only accessible within class during prod build
    public meetupService: MeetupService,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.route.paramMap
      .debug('Getting meetup id from parameters')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((params: ParamMap) => {
        const meetupId = params.get('id');
        const getOpts: any = { meetupIds: [ meetupId ] };
        if (this.parent) {
          getOpts.opts = { domain: this.userService.getConfig()[0].parentDomain };
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

}
