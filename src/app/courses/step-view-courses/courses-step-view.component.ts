import { Component, OnInit } from '@angular/core';
import { CoursesService } from '../courses.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

@Component({
  templateUrl: './courses-step-view.component.html'
})

export class CoursesStepViewComponent implements OnInit {

  stepNum = 0;
  stepDetail: any = { stepTitle: '', description: '' };
  maxStep = 1;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService
  ) { }

  ngOnInit() {
    this.coursesService.courseUpdated$.subscribe((course: any) => {
      // To be readable by non-technical people stepNum param will start at 1
      this.stepDetail = course.steps[this.stepNum - 1];
      this.maxStep = course.steps.length;
    });
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.stepNum = +params.get('stepNum'); // Leading + forces string to number
      this.coursesService.requestCourse(params.get('id'));
    });
  }

  // direction = -1 for previous, 1 for next
  changeStep(direction) {
    this.router.navigate([ '../' + (this.stepNum + direction) ], { relativeTo: this.route });
  }

  backToCourseDetail() {
    this.router.navigate([ '../../' ], { relativeTo: this.route });
  }

}
