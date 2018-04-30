import { Directive, HostListener, Input } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { Router } from '@angular/router';
import { FeedbackService } from './feedback.service';
import { PlanetMessageService } from '../shared/planet-message.service';

export class Message {
  message: string;
  user: string;
  time: Number;
}
export class Feedback {
  type: string;
  priority: boolean;
  owner: string;
  title: string;
  openTime: Number;
  closeTime: Number;
  source: string;
  url: string;
  messages: Array<Message>;
}

@Directive({
  selector: '[planetFeedback]'
})
export class FeedbackDirective {
  message: string;
  @Input() feedbackOf: any = {};

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService,
    private router: Router,
    private feedbackService: FeedbackService,
    private planetMessageService: PlanetMessageService
  ) {}

  addFeedback(post: any) {
    this.message = '';
    const user = this.userService.get().name,
      { message, ...feedbackInfo } = post,
      startingMessage: Message = { message, time: Date.now(), user },
      newFeedback: Feedback = {
        owner: user,
        ...feedbackInfo,
        openTime: Date.now(),
        messages: [ startingMessage ],
        url: this.router.url,
        ...this.feedbackOf
      };
    this.couchService.post('feedback/', newFeedback)
    .subscribe((data) => {
      this.feedbackService.setfeedback();
      this.message = 'Thank you, your feedback is submitted!';
      this.planetMessageService.showMessage(this.message);
    },
    (error) => {
      this.message = 'Error, your  feedback cannot be submitted';
      this.planetMessageService.showMessage(this.message);
    });
  }

  @HostListener('click')
  openFeedback() {
    const title = 'Feedback';
    const type = 'feedback';
    const fields = dialogFieldOptions;
    const formGroup = {
      priority: [ '', Validators.required ],
      type: [ '', Validators.required ],
      message: [ '', Validators.required ]
    };
    this.dialogsFormService
      .confirm(title, fields, formGroup)
      .debug('Dialog confirm')
      .subscribe((response) => {
        if (response !== undefined) {
          this.addFeedback(response);
        }
      });
  }

}

const dialogFieldOptions = [
  {
    'label': 'Is your feedback Urgent?',
    'type': 'radio',
    'name': 'priority',
    'options': [
      'Yes',
      'No',
    ],
    'required': true
  },
  {
    'label': 'Feedback Type:',
    'type': 'radio',
    'name': 'type',
    'options': [
      'Question',
      'Bug',
      'Suggestion',
    ],
    'required': true
  },
  {
    'type': 'textarea',
    'name': 'message',
    'placeholder': 'Your Feedback',
    'required': true
  }
];
