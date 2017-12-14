import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { MatRadioModule , MatFormFieldModule, MatButtonModule, } from '@angular/material';
import { FormBuilder, FormControl, FormGroup, Validators, FormControlName } from '@angular/forms';

export class Feedback {
  name: string;
  isUrgent: boolean;
  feedbackType: string;
  feedbackMsg: string;
}

@Component({
  templateUrl: './feedback.component.html'
})

export class FeedbackComponent implements OnInit {
  feedback = new Feedback();
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

  ngOnInit() {
    this.feedback.name = this.userService.get().name;
  }

  addfeedback(post: any) {
    this.message = '';
    (<any>Object).assign(this.feedback, post);
    this.couchService.post('feedback/', this.feedback)
    .then((data) => {
      this.message = 'Thank you, your feedback is submitted!';
    },
    (error) => {
      this.message = 'Error, your  feedback cannot be submitted';
    });
  }
}
