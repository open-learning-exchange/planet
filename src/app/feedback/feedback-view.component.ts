import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Subject } from 'rxjs/Subject';
import { switchMap, takeUntil } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { findDocuments } from '../shared/mangoQueries';
import { HttpRequest } from '@angular/common/http';

@Component({
  templateUrl: './feedback-view.component.html',
  styleUrls: [ './feedback-view.scss' ]
})
export class FeedbackViewComponent implements OnInit, OnDestroy {
  readonly dbName = 'feedback';
  private onDestroy$ = new Subject<void>();
  feedback: any = {};
  user: any = {};
  newMessage = '';

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getFeedback(params.get('id'))))
      .debug('Getting feedback')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((result) => {
        this.setFeedback(result);
        this.setCouchListener(result.docs[0]._id);
      }, error => console.log(error));
    this.user = this.userService.get();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setFeedback(result) {
    this.feedback = result.docs[0];
    this.feedback.messages = this.feedback.messages.sort((a, b) => b.time - a.time);
  }

  getFeedback(id) {
    return this.couchService.post(this.dbName + '/_find', findDocuments({ '_id': id }));
  }

  postMessage() {
    const newFeedback = Object.assign({}, this.feedback);
    newFeedback.messages.push({ message: this.newMessage, user: this.user.name, time: Date.now() });
    this.couchService.put(this.dbName + '/' + this.feedback._id, newFeedback)
      .pipe(switchMap((res) => {
        this.newMessage = '';
        return this.getFeedback(res.id);
      }))
      .subscribe(this.setFeedback.bind(this), error => console.log(error));
  }

  setCouchListener(id) {
    this.couchService.stream('GET', this.dbName + '/_changes?feed=continuous&since=now')
      .pipe(
        takeUntil(this.onDestroy$),
        switchMap(() => {
          return this.getFeedback(id);
        })
      )
      .subscribe(this.setFeedback.bind(this), error => console.log(error), () => {
        // Feed times out after one minute, so consider resubscribing here.
        // Problem is if we recursively call this function here it will
        // indefinitely run, even if the user moves on to a new route.
      });
  }

}
