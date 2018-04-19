import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

@Component({
  selector: 'planet-courses-step-view',
  templateUrl: './courses-step-view.component.html'
})

export class CoursesStepViewComponent implements OnInit {

  @Input() courseSteps: any;
  @Input() stepNo: any;

  stepDetail: any;

  constructor() { }

  ngOnInit() {
    this.setStepDetail();
  }

  setStepDetail() {
    this.stepDetail = this.courseSteps[this.stepNo];
  }

  next() {
    this.stepNo = this.stepNo+1;
    this.setStepDetail();
  }

  prev() {
    this.stepNo = this.stepNo-1;
    this.setStepDetail();
  }

}
