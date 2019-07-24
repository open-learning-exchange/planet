import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { switchMap, takeUntil, finalize } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { findDocuments } from '../shared/mangoQueries';
import { PlanetMessageService } from '../shared/planet-message.service';
import { debug } from '../debug-operator';
import { FeedbackService } from './feedback.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { StateService } from '../shared/state.service';

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
  isActive = true;
  editTitleMode = false;
  @ViewChild('chatList') chatListElement: ElementRef;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private feedbackServive: FeedbackService,
    private router: Router,
    private dialogsLoadingService: DialogsLoadingService,
    private stateService: StateService
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getFeedback(params.get('id'))))
      .pipe(debug('Getting feedback'), takeUntil(this.onDestroy$))
      .subscribe((result) => {
        this.setFeedback(result);
        this.setCouchListener(result.docs[0]._id);
      }, error => console.log(error));
    this.user = this.userService.get();
  }

  ngOnDestroy() {
    this.isActive = false;
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setFeedback(result) {
    this.feedback = result.docs[0];
    this.feedback.messages = this.feedback.messages.sort((a, b) => a.time - b.time);
    this.scrollToBottom();
  }

  getFeedback(id) {
    return this.couchService.post(this.dbName + '/_find', findDocuments({ '_id': id }));
  }

  postMessage() {
    let reopen = {};
    if (this.feedback.status === 'Closed') {
      reopen = { status: 'Reopened', closeTime: '' };
    }
    const newFeedback = Object.assign({}, this.feedback, reopen);
    // Object.assign is a shallow copy, so also copy messages array so view only updates after success
    newFeedback.messages = [].concat(
      this.feedback.messages,
      { message: this.newMessage, user: this.user.name, time: this.couchService.datePlaceholder }
    );
    this.couchService.updateDocument(this.dbName, newFeedback)
      .pipe(switchMap((res) => {
        this.newMessage = '';
        return forkJoin([ this.getFeedback(res.id), this.sendNotifications() ]);
      })
      ).subscribe(
        ([ feedback, notificationRes ]) => { this.setFeedback(feedback); },
        error => this.planetMessageService.showAlert('There was an error adding your message')
      );
  }

  sendNotifications() {
    const link = '/feedback/view/' + this.feedback._id;
    const users: any[] = this.feedback.messages.filter((message, index, messages) =>
      messages.findIndex(m => m.user === message.user) === index && message.user !== this.user.name
    ).map(message => (
      { user: `org.couchdb.user:${message.user}`, userPlanetCode: message.userPlanetCode || this.stateService.configuration.code }
    ));
    const notificationDoc = ({ user, userPlanetCode }) => ({
      user,
      'message': 'You have unread messages in feedback',
      link,
      'type': 'feedbackReply',
      'priority': 1,
      'status': 'unread',
      'time': this.couchService.datePlaceholder,
      userPlanetCode
    });
    return this.couchService.findAll('notifications', findDocuments({ link, type: 'feedbackReply', status: 'unread' })).pipe(
      switchMap((notifications: any[]) => {
        const newNotifications = users.filter(user => notifications.findIndex(notification => notification.user === user.user) === -1)
          .map(user => notificationDoc(user));
        return newNotifications.length === 0 ? of({}) : this.couchService.bulkDocs('notifications', newNotifications);
      })
    );
  }

  editTitle(mode) {
    this.editTitleMode = mode;
  }

  setTitle() {
    this.couchService.put(this.dbName + '/' + this.feedback._id, this.feedback).subscribe(
      () => {
        this.editTitleMode = false;
      },
      error => this.planetMessageService.showAlert('There was an error changing title')
    );
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
        // Feed times out after one minute, so resubscribe until ngOnDestrpy runs.
        if (this.isActive) {
          this.setCouchListener(id);
        }
      });
  }

  closeFeedback(feedback) {
    this.feedbackServive.closeFeedback(feedback).subscribe(
      () => this.router.navigate([ '/feedback' ]),
      () => this.planetMessageService.showAlert('There was an error closing this feedback.')
    );
  }

  openFeedback(feedback) {
    this.dialogsLoadingService.start();
    this.feedbackServive.openFeedback(feedback)
      .pipe(switchMap(() => this.getFeedback(feedback.id)), finalize(() => this.dialogsLoadingService.stop()))
      .subscribe(
        res => this.setFeedback(res),
        error => this.planetMessageService.showAlert('There has been an error opening the feedback.')
      );
  }

  scrollToBottom() {
    this.chatListElement.nativeElement.scrollTo({ top: this.chatListElement.nativeElement.scrollHeight, behavior: 'smooth' });
  }

  feedbackTrackByFn(index, item) {
    return item._id;
  }

}
