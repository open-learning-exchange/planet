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
      'Yes',
      'No',
    ],
    'required': true
  },
  {
    'label': $localize`Feedback Type:`,
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
    const feedbackUrl = newFeedback.url.substring(0, newFeedback.url.indexOf(';')) || newFeedback.url;
    this.couchService.updateDocument('feedback', {
      ...newFeedback, title: $localize`${newFeedback.type} regarding ${feedbackUrl}` })
    .subscribe((data) => {
      this.feedbackService.setFeedback();
      this.planetMessageService.showMessage($localize`Thank you, your feedback is submitted!`);
    },
    (error) => {
      this.planetMessageService.showAlert($localize`Error, your feedback cannot be submitted`);
    });
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
