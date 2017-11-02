import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';

@Component({
  selector: 'feedback',
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss']
})
export class FeedbackComponent implements OnInit {
	name = '';
	isUrgent='';
	feedbackType='';
	feedbackMessage='';

  constructor(
  	private userService: UserService
  	) { }

  ngOnInit() {
  	Object.assign(this, this.userService.get());
  }
  submitfeedback(){
  	console.log("feedback submitted");
  	console.log("name"+ this.name);
  	console.log("urgent"+ this.isUrgent);
  	console.log("feedback type"+ this.feedbackType);
  	console.log("feedbackMessage"+ this.feedbackMessage);
  }

  onSubmit() { 
  	console.log("feedback submitted");
   }

}

