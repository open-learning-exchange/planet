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
    const date = this.couchService.datePlaceholder;
    const user = this.userService.get().name,
      { message, ...feedbackInfo } = post,
      startingMessage: Message = { message, time: date, user },
      newFeedback: Feedback = {
        owner: user,
        ...feedbackInfo,
        openTime: date,
        status: 'Open',
        messages: [ startingMessage ],
        url: this.router.url,
        source: this.stateService.configuration.code,
        parentCode: this.stateService.configuration.parentCode,
        ...this.feedbackOf
      };
    this.couchService.updateDocument('feedback', { ...newFeedback, title: newFeedback.type + ' regarding ' + newFeedback.url })
    .subscribe((data) => {
      this.feedbackService.setfeedback();
      this.planetMessageService.showMessage('Thank you, your feedback is submitted!');
    },
    (error) => {
      this.planetMessageService.showAlert('Error, your feedback cannot be submitted');
    });
  }

  @HostListener('click')
  openFeedback() {
    const title = 'Feedback';
    const type = 'feedback';
    const fields = dialogFieldOptions;
    const formGroup = {
      priority: [ this.priority, Validators.required ],
      type: [ this.type, Validators.required ],
      message: [ this.message, [
          Validators.required,
          Validators.pattern('.*\\S.*[a-zA-z0-9 ]')
        ]
      ]
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
