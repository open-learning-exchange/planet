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

export class Message {
  message: string;
  user: string;
  time: any;
}
export class Feedback {
  type: string;
  priority: boolean;
  owner: string;
  title: string;
  openTime: any;
  closeTime: any;
  source: string;
  url: string;
  messages: Array<Message>;
  params: Object;
}

const dialogFieldOptions = [
  {
    'label': $localize`Is your feedback Urgent?`,
    'type': 'radio',
    'name': 'priority',
    'options': [
      $localize`Yes`,
      $localize`No`,
    ],
    'required': true
  },
  {
    'label': $localize`Feedback Type:`,
    'type': 'radio',
    'name': 'type',
    'options': [
      $localize`Question`,
      $localize`Bug`,
      $localize`Suggestion`,
    ],
    'required': true
  },
  {
    'type': 'textarea',
    'name': 'message',
    'placeholder': $localize`Your Feedback`,
    'required': true
  }
];

@Directive({
  selector: '[planetFeedback]'
})
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
    const feedbackUrl = this.router.url && this.router.url !== '/' ? this.router.url.split(';')[0] : '/';
    const urlParts = feedbackUrl.split('/');
    const firstPart = urlParts[1] || 'home';
    const lastPart = urlParts.length > 2 ? urlParts[urlParts.length - 1] : null;
    const feedback: any = {
      ...post,
      routerLink: null,
      state: firstPart,
    };
    if (firstPart === 'home') {
      feedback.title = $localize`Feedback regarding home`;
      feedback.routerLink = [ '/home' ];
      this.updateFeedback(feedback, date, user, feedbackUrl);
    } else if (this.feedbackOf?.name) {
      feedback.title = $localize`Feedback regarding ${firstPart}/${this.feedbackOf.name}`;
      feedback.routerLink = [ '/', firstPart, 'view', this.feedbackOf.item ];
      this.updateFeedback(feedback, date, user, feedbackUrl);
    } else if (urlParts.length === 2) {
      feedback.title = $localize`Feedback regarding ${firstPart}`;
      feedback.routerLink = [ '/', firstPart ];
      this.updateFeedback(feedback, date, user, feedbackUrl);
    } else if (lastPart) {
      this.couchService.getDocumentByID(firstPart, lastPart).subscribe(
        (document: any) => {
          const resourceName = document?.type === 'enterprise'
            ? document?.name
            : document?.title || document?.courseTitle || document?.name || lastPart;
          feedback.title = $localize`Feedback regarding ${firstPart}/${resourceName}`;
          feedback.routerLink = [ '/', firstPart, 'view', lastPart ];
          this.updateFeedback(feedback, date, user, feedbackUrl);
        },
        (error) => {
          feedback.title = $localize`Feedback regarding ${firstPart}/${lastPart}`;
          feedback.routerLink = [ '/', firstPart, 'view', lastPart ];
          this.updateFeedback(feedback, date, user, feedbackUrl);
        }
      );
    }
  }

  private updateFeedback(feedback: any, date: Date, user: string, url: string) {
    const startingMessage: Message = { message: feedback.message, time: date, user };
    const newFeedback: Feedback = {
      owner: user,
      ...feedback,
      openTime: date,
      status: 'Open',
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
    const type = 'feedback';
    const fields = dialogFieldOptions;
    const formGroup = {
      priority: [ this.priority, Validators.required ],
      type: [ this.type, Validators.required ],
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
