import { Directive, HostListener, Input } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { Router } from '@angular/router';
import { FeedbackService } from './feedback.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { debug } from '../debug-operator';
import { StateService } from '../shared/state.service';
import { CustomValidators } from '../validators/custom-validators';

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
    private stateService: StateService
  ) {}

  addFeedback(post: any) {
    const date = new Date();
    const user = this.userService.get().name;
    const feedbackUrl = this.router.url && this.router.url !== '/' ? this.router.url.split(';')[0] : '/';
    const urlParts = feedbackUrl.split('/');
    const firstPart = urlParts[1] || 'home';
    const lastPart = urlParts.length > 2 ? urlParts[urlParts.length - 1] : null;
    const itemName = this.feedbackOf?.name || 'test';
    let feedbackTitle: string;
    if (firstPart === 'home') {
      feedbackTitle = $localize`Feedback regarding home`;
    } else if (this.feedbackOf?.name) {
      feedbackTitle = $localize`Feedback regarding ${firstPart}/${itemName}`;
      this.createFeedback(post, feedbackTitle, feedbackUrl, user, date);
      return;
    } else if (urlParts.length === 2) {
      feedbackTitle = $localize`Feedback regarding ${firstPart}`;
    } else if (lastPart) {
      this.couchService.getDocumentByID(firstPart, lastPart).subscribe(
        (document: any) => {
          const resourceName = document?.title || document?.courseTitle || document?.name || lastPart;
          feedbackTitle = $localize`Feedback regarding ${firstPart}/${resourceName}`;
          this.createFeedback(post, feedbackTitle, feedbackUrl, user, date);
        },
        () => {
          feedbackTitle = $localize`Feedback regarding ${firstPart}/${lastPart}`;
          this.createFeedback(post, feedbackTitle, feedbackUrl, user, date);
        }
      );
      return;
    }
    this.createFeedback(post, feedbackTitle, feedbackUrl, user, date);
  }

  private createFeedback(post: any, title: string, url: string, user: string, date: Date) {
    const startingMessage: Message = { message: post.message, time: date, user };
    const newFeedback: Feedback = {
      owner: user,
      ...post,
      openTime: date,
      status: 'Open',
      messages: [ startingMessage ],
      url,
      source: this.stateService.configuration.code,
      parentCode: this.stateService.configuration.parentCode,
      ...this.feedbackOf,
      title,
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
      .pipe(debug('Dialog confirm'))
      .subscribe((response) => {
        if (response !== undefined) {
          this.addFeedback(response);
        }
      });
  }

}
