import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';

export class Feedback {
  name: string;
  isUrgent: boolean;
  feedbackType: string;
  feedbackMsg: string;
}

@Component({
  selector: 'feedback',
  templateUrl: './feedback.component.html'
})

export class FeedbackComponent implements OnInit {
  msgForUsr: string;
  feedback: Feedback= new Feedback();
  message: string;
  fedbkSubmitted: string;
  messageType={
    'pass':false,
    'fail':false
  }

  constructor(
    private userService: UserService,
    private couchService: CouchService
    ) { }

  ngOnInit() {
    this.feedback.name = this.userService.get().name;
  }

  submitfeedback() {
    if (!this.feedback.feedbackMsg) {
      this.message = "feedbackInvalid";
      this.messageType.pass=false;
      this.messageType.fail=true;
    } else {
      this.couchService.post('feedback/', this.feedback)
      .then((data) => {
        this.message="feedbackSuccess";
        this.messageType.fail=false;
        this.messageType.pass=true;
      },
      (error) => {
       this.message="feedbackError";
       this.messageType.pass=false;
       this.messageType.fail=true;
      });
    }
  }
}
