import { Component,} from '@angular/core';
import { UserService } from '../shared/user.service';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { MatRadioModule , MatFormFieldModule, MatButtonModule, } from '@angular/material';
import { FormBuilder, FormControl, FormGroup, Validators, FormControlName } from '@angular/forms';

export class Message {
  feedbackMsg: string;
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
  feedback = new Feedback();
  msg = new Message();
  message: string;
  feedbackForm: FormGroup;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private fg: FormBuilder
    ) {
    this.feedbackForm = fg.group({
      feedbackMsg : [ '', Validators.required ],
      isUrgent :  [ '' ],
      feedbackType : [ '' ]
    });
  }

  addFeedback(post: any) {
    this.message = '';
    this.feedback.owner = this.userService.get().name;
    this.feedback.priority = post.isUrgent;
    this.feedback.type = post.feedbackType;
    this.feedback.openTime = Date.now();

    this.msg.feedbackMsg = post.feedbackMsg;
    this.msg.time = Date.now();
    this.feedback.messages = [{
      message = post.feedbackMsg,
      time= Date.now(),
      user= this.userService.get().name,
    }];

    this.couchService.post('feedback/', this.feedback)
    .subscribe((data) => {
      this.message = 'Thank you, your feedback is submitted!';
    },
    (error) => {
      this.message = 'Error, your  feedback cannot be submitted';
    });
  }
}
