import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'feedback',
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss']
})
export class FeedbackComponent implements OnInit {
	name = 'testing feedback component';

  constructor() { }

  ngOnInit() {
  }

}
