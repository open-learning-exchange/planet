import { Component, Input, OnChanges } from '@angular/core';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';

import { blockingStepIndex, stepProgress } from '../courses.utils';

@Component({
  selector: 'planet-courses-progress-bar',
  templateUrl: 'courses-progress-bar.component.html',
  styleUrls: ['courses-progress-bar.scss'],
  imports: [MatTooltip, NgClass]
})
export class CoursesProgressBarComponent implements OnChanges {

  @Input() course: any = { steps: [] };
  @Input() courseProgress: any[] = [];
  @Input() canManage = false;
  steps: any[] = [];

  constructor(
    private router: Router
  ) { }

  ngOnChanges() {
    const blocking = this.canManage ? -1 : blockingStepIndex(this.course.steps, this.courseProgress);
    this.steps = (this.course.steps || []).map((step: any, index: number) => {
      const status = this.progressStatus(stepProgress(this.courseProgress, index + 1));
      const locked = blocking > -1 && index > blocking;
      return {
        status,
        locked,
        clickable: !locked && (this.canManage || status !== 'not started'),
        tooltip: this.stepTooltip(step, index, status, locked)
      };
    });
  }

  routing(step, i) {
    if (step.clickable) {
      this.router.navigate([ '/courses/view', this.course._id, 'step', i + 1 ]);
    }
  }

  stepTooltip(step: any, index: number, status: string, locked: boolean): string {
    const title = step.stepTitle || $localize`Step ${index + 1}:stepNumber:`;
    if (locked) {
      return $localize`${title}:stepTitle: (Locked)`;
    }
    switch (status) {
      case 'completed':
        return step.exam?.questions?.length ? $localize`${title}:stepTitle: (Passed)` : $localize`${title}:stepTitle: (Completed)`;
      case 'pending':
        return $localize`${title}:stepTitle: (In Progress)`;
      default:
        return $localize`${title}:stepTitle: (Not started)`;
    }
  }

  progressStatus(progress: any) {
    if (progress === undefined) {
      return 'not started';
    }
    return progress.passed ? 'completed' : 'pending';
  }

}
