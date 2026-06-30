import { Directive, HostListener, Input } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { Router } from '@angular/router';
import { FeedbackService } from './feedback.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { CustomValidators } from '../validators/custom-validators';
import { AuthService } from '../shared/auth-guard.service';
import {
  FEEDBACK_PRIORITY_OPTIONS, FEEDBACK_TYPE_OPTIONS, FeedbackTitleContext,
  normalizeFeedbackPriority, normalizeFeedbackStatus, normalizeFeedbackType,
} from './feedback.utils';

export class Message {
  message: string;
  user: string;
  time: any;
}
export class Feedback {
  type: string;
  priority: string;
  owner: string;
  title: string;
  titleContext?: FeedbackTitleContext;
  openTime: any;
  closeTime: any;
  source: string;
  url: string;
  messages: Array<Message>;
  params: object;
}

const dialogFieldOptions = [
  {
    'label': $localize`Is your feedback Urgent?`,
    'type': 'radio',
    'name': 'priority',
    'options': FEEDBACK_PRIORITY_OPTIONS.map(option => ({ name: option.label, value: option.value })),
    'required': true
  },
  {
    'label': $localize`Feedback Type:`,
    'type': 'radio',
    'name': 'type',
    'options': FEEDBACK_TYPE_OPTIONS.map(option => ({ name: option.label, value: option.value })),
    'required': true
  },
  {
    'type': 'textarea',
    'name': 'message',
    'placeholder': $localize`Your Feedback`,
    'required': true
  }
];

@Directive({ selector: '[planetFeedback]' })
export class FeedbackDirective {
  @Input() feedbackOf: any = {};
  @Input() message = '';
  @Input() type = '';
  @Input() priority = '';

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService,
    private router: Router,
    private feedbackService: FeedbackService,
    private planetMessageService: PlanetMessageService,
    private stateService: StateService,
    private authService: AuthService
  ) {}

  addFeedback(post: any) {
    const date = new Date();
    const user = this.userService.get().name;
    const feedbackUrl = this.router.url || '/';
    const navigationUrl = feedbackUrl !== '/' ? this.removeMatrixParams(feedbackUrl) : '/';
    const urlParts = navigationUrl.split('/');
    const firstPart = urlParts[1] || 'home';
    const lastPart = urlParts.length > 2 ? urlParts[urlParts.length - 1] : null;
    const feedback: any = {
      ...post,
      routerLink: null,
      state: firstPart,
      titleContext: null,
    };
    if (firstPart === 'home') {
      feedback.titleContext = { kind: 'home' };
      feedback.routerLink = [ '/home' ];
      this.updateFeedback(feedback, date, user, feedbackUrl);
    } else if (this.feedbackOf?.name) {
      feedback.titleContext = { kind: 'item', state: firstPart, name: this.feedbackOf.name };
      feedback.routerLink = [ '/', firstPart, 'view', this.feedbackOf.item ];
      this.updateFeedback(feedback, date, user, feedbackUrl);
    } else if (urlParts.length === 2) {
      feedback.titleContext = { kind: 'section', state: firstPart };
      feedback.routerLink = [ '/', firstPart ];
      this.updateFeedback(feedback, date, user, feedbackUrl);
    } else if (lastPart) {
      const fallbackPath = urlParts.slice(1);
      this.couchService.getDocumentByID(firstPart, lastPart).subscribe(
        (document: any) => {
          const resourceName = document?.type === 'enterprise'
            ? document?.name
            : document?.title || document?.courseTitle || document?.name || lastPart;
          feedback.titleContext = { kind: 'item', state: firstPart, name: resourceName };
          feedback.routerLink = [ '/', firstPart, 'view', lastPart ];
          this.updateFeedback(feedback, date, user, feedbackUrl);
        },
        (error) => {
          feedback.titleContext = { kind: 'path', path: fallbackPath };
          feedback.routerLink = [ '/', ...fallbackPath ];
          this.updateFeedback(feedback, date, user, feedbackUrl);
        }
      );
    }
  }

  private removeMatrixParams(url: string) {
    return url.split('/').map(part => part.split(';')[0]).join('/');
  }

  private updateFeedback(feedback: any, date: Date, user: string, url: string) {
    const startingMessage: Message = { message: feedback.message, time: date, user };
    const newFeedback: Feedback = {
      owner: user,
      ...feedback,
      openTime: date,
      status: normalizeFeedbackStatus('open'),
      type: normalizeFeedbackType(feedback.type),
      priority: normalizeFeedbackPriority(feedback.priority),
      messages: [ startingMessage ],
      url,
      source: this.stateService.configuration.code,
      parentCode: this.stateService.configuration.parentCode,
      ...this.feedbackOf,
    };
    this.couchService.updateDocument('feedback', newFeedback).subscribe(
      () => {
        this.feedbackService.setFeedback();
        this.planetMessageService.showMessage($localize`Thank you, your feedback is submitted!`);
      },
      () => {
        this.planetMessageService.showAlert($localize`Error, your feedback cannot be submitted`);
      }
    );
  }

  @HostListener('click')
  checkAuthentication() {
    this.authService.checkAuthenticationStatus().subscribe(() => this.openFeedback());
  }

  openFeedback() {
    const title = $localize`Feedback`;
    const fields = dialogFieldOptions;
    const formGroup = {
      priority: [ this.priority ? normalizeFeedbackPriority(this.priority) : '', Validators.required ],
      type: [ this.type ? normalizeFeedbackType(this.type) : '', Validators.required ],
      message: [ this.message, CustomValidators.required ]
    };
    this.dialogsFormService
      .confirm(title, fields, formGroup)
      .subscribe((response) => {
        if (response !== undefined) {
          this.addFeedback(response);
        }
      });
  }

}
