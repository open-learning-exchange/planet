import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CoursesService } from '../courses.service';
import { Router } from '@angular/router';

@Component({
  selector: 'planet-courses-step-view',
  templateUrl: './courses-step-view.component.html'
})

export class CoursesStepViewComponent implements OnInit {

  @Input() courseSteps: any;
  @Input() stepNo: any;

  stepDetail: any;
  returnUrl = '/courses';

  constructor(
    private router: Router,
    private coursesService: CoursesService
  ) { }

  ngOnInit() {
    if(this.coursesService.course) {
      this.returnUrl = this.coursesService.returnUrl;
      this.courseSteps = this.coursesService.course.steps;
      this.stepNo = this.coursesService.stepIndex;
    } else {
      this.router.navigate([this.returnUrl]);
    }
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
