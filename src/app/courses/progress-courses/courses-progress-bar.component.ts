import { Component, Input, OnChanges } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor, NgClass } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'planet-courses-progress-bar',
  templateUrl: 'courses-progress-bar.component.html',
  styleUrls: ['courses-progress-bar.scss'],
  imports: [NgFor, MatTooltip, NgClass]
})
export class CoursesProgressBarComponent implements OnChanges {

  @Input() course: any = { steps: [] };
  @Input() courseProgress: any[] = [];
  steps: any[] = [];

  constructor(
    private router: Router
  ) { }

  ngOnChanges() {
    this.steps = this.course.steps.map((step: any, index: number) => {
      const progress = this.courseProgress.find((p: any) => p.stepNum === (index + 1));
      const status = this.progressStatus(progress);
      return { stepTitle: step.stepTitle, status };
    });
  }

  routing(status, i) {
    if (status !== 'not started') {
      this.router.navigate([ '/courses/view', this.course._id, 'step', i + 1 ]);
    }
  }

  progressStatus(progress: any) {
    if (progress === undefined) {
      return 'not started';
    }
    return progress.passed ? 'completed' : 'pending';
  }

}
