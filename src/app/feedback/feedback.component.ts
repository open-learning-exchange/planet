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

  constructor(
    private userService: UserService,
    private couchService: CouchService
    ) { }

  ngOnInit() {
    this.feedback.name = this.userService.get().name;
  }

  submitfeedback() {
    if (!this.feedback.feedbackMsg) {
      this.message = '';
      this.fedbkSubmitted = '';
      this. msgForUsr = 'Feedback cannot be empty!';
    } else {
      this.couchService.post('feedback/', this.feedback)
      .then((data) => {
        this.msgForUsr = '';
        this.message = '';
        this.fedbkSubmitted = 'Thank you! We have received your feedback.';
      },
      (error) => {
        this.msgForUsr = '';
        this.fedbkSubmitted = '';
        this.message = 'Sorry, your feedback could not be submitted!';
      });
    }
  }
}
