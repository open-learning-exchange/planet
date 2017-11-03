import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';

export class Feedback{
  name:string
  isUrgent:boolean;
  feedbackType:string;
  feedbackMsg:string;
}


@Component({
    selector: 'feedback',
    templateUrl: './feedback.component.html',
    styleUrls: ['./feedback.component.scss']
})
export class FeedbackComponent implements OnInit {

    msgForUsr:string;
    isFeedbackMsg :boolean=true;
    feedback:Feedback= new Feedback();
    message:string;
    fedbkSubmitted:boolean= false;
 


  constructor(
  	  private userService: UserService,
      private couchService:CouchService
      ) { }

  ngOnInit() {
      this.feedback.name= this.userService.get().name;
  }

  submitfeedback(){
      if (this.feedback.feedbackMsg===undefined|| this.feedback.feedbackMsg=="") {
          this. msgForUsr="Feedback  cannot be empty";
          this.isFeedbackMsg=false;
      }else
      {
          this.isFeedbackMsg=true;
          this.couchService.post('feedback/', this.feedback)
          .then((data) => {
              this. msgForUsr='';
              this.isFeedbackMsg=false;
              this.fedbkSubmitted=true;
              this. msgForUsr= "Thank you! We have received your feedback";
          }, 
          (error) => {
              this.isFeedbackMsg=true;
              this.fedbkSubmitted=true;
              this.msgForUsr = 'Error with submitting your feedback';}); 
    }

  }

}




