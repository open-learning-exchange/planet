import { Component } from '@angular/core';
import { UserService } from '../shared/user.service';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { MatRadioModule , MatFormFieldModule, MatButtonModule, } from '@angular/material';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';

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

@Component({
  templateUrl: './feedback.component.html'
})

export class FeedbackComponent {
  message: string;
  feedbackForm: FormGroup;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private fg: FormBuilder
  ) {
    this.feedbackForm = fg.group({
      message: [ '', Validators.required ],
      priority:  [ '' ],
      type: [ '' ]
    });
  }

  addFeedback(post: any) {
    this.message = '';
    const user = this.userService.get().name,
      { message, ...feedbackInfo } = post,
      startingMessage: Message = { message, time: Date.now(), user },
      newFeedback: Feedback = { owner: user, ...feedbackInfo, openTime: Date.now(), messages: [ startingMessage ] };
    this.couchService.post('feedback/', newFeedback)
    .subscribe((data) => {
      this.message = 'Thank you, your feedback is submitted!';
    },
    (error) => {
      this.message = 'Error, your  feedback cannot be submitted';
    });
  }
}
