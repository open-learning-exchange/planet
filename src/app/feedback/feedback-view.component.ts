import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Subject } from 'rxjs/Subject';
import { switchMap, takeUntil } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { findDocuments } from '../shared/mangoQueries';

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
      .subscribe(this.setFeedback.bind(this), error => console.log(error));
    this.user = this.userService.get();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setFeedback(result) {
    this.feedback = result.docs[0];
  }

  getFeedback(id) {
    return this.couchService.post(this.dbName + '/_find', findDocuments({ '_id': id }));
  }

  postMessage() {
    const newFeedback = Object.assign({}, this.feedback);
    newFeedback.messages.push({ message: this.newMessage, user: this.user.name, time: Date.now() });
    this.couchService.put(this.dbName + '/' + this.feedback._id, newFeedback)
      .pipe(switchMap((res) => {
        return this.getFeedback(res.id);
      }))
      .subscribe(this.setFeedback.bind(this), error => console.log(error));
  }

}
