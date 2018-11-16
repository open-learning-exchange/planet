import { Component, Input, OnChanges } from '@angular/core';
import { Router } from '@angular/router';
import { StepperSelectionEvent } from '@angular/cdk/stepper';

@Component({
  selector: 'planet-courses-progress-bar',
  templateUrl: 'courses-progress-bar.component.html',
  styleUrls: [ 'courses-progress-bar.scss' ]
})
export class CoursesProgressBarComponent implements OnChanges {

  @Input() course: any = { steps: [] };
  @Input() courseProgress: any = { stepNum: 0 };
  completed = false;

  constructor(
    private router: Router
  ) { }

  ngOnChanges() {
    this.completed = this.course.steps.length === this.courseProgress.stepNum && this.courseProgress.passed;
  }

  routing(step, i) {
    if  (step.exam) {
      this.router.navigate([ '/courses/view', this.course._id, 'step', i + 1 ]);
    }
  }
}
