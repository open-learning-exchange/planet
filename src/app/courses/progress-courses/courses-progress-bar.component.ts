import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'planet-courses-progress-bar',
  templateUrl: 'courses-progress-bar.component.html',
  styleUrls: [ 'courses-progress-bar.scss' ]
})
export class CoursesProgressBarComponent implements OnChanges {

  @Input() course: any = { steps: [] };
  @Input() courseProgress: any = { stepNum: 0 };
  completed = false;

  ngOnChanges() {
    this.completed = this.course.steps.length === this.courseProgress.stepNum && this.courseProgress.passed;
  }

}
