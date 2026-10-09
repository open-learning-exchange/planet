import { Component, Input, OnChanges } from '@angular/core';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';

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
    this.steps = (this.course.steps || []).map((step: any, index: number) => {
      const progress = (this.courseProgress || []).find((p: any) => p.stepNum === (index + 1) && p.passed) ||
        (this.courseProgress || []).find((p: any) => p.stepNum === (index + 1));
      const status = this.progressStatus(progress);
      return { stepTitle: step.stepTitle, status };
    });
  }

  routing(status, i) {
    if ((this.canManage || status !== 'not started') && !this.isStepLocked(i)) {
      this.router.navigate([ '/courses/view', this.course._id, 'step', i + 1 ]);
    }
  }

  isStepLocked(stepIndex: number): boolean {
    if (this.canManage) {
      return false;
    }
    for (let j = 0; j < stepIndex; j++) {
      const prevStep = this.course.steps?.[j];
      if (prevStep?.exam?.questions?.length && prevStep.passingRequired) {
        const prevProg = (this.courseProgress || []).find((p: any) => p.stepNum === (j + 1) && p.passed) ||
          (this.courseProgress || []).find((p: any) => p.stepNum === (j + 1));
        if (!prevProg?.passed) {
          return true;
        }
      }
    }
    return false;
  }

  stepTooltip(step: any, index: number): string {
    const title = step.stepTitle || $localize`Step ${index + 1}:stepNumber:`;
    if (this.isStepLocked(index)) {
      return $localize`${title}:stepTitle: (Locked)`;
    }
    switch (step.status) {
      case 'completed':
        return $localize`${title}:stepTitle: (Passed)`;
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
