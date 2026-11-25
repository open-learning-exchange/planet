import { Component, Input } from '@angular/core';

import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

export const courseIcons = {
  assignment: 'assignment',
  assignmentLate: 'assignment_late',
  attachFile: 'attach_file',
  description: 'description',
  done: 'done',
  rotateRight: 'rotate_right'
} as const;

export type CourseIcon = typeof courseIcons[keyof typeof courseIcons] | '';

@Component({
  selector: 'planet-course-icon',
  template: `
    <div>
      @switch (icon) {
        @case (courseIcons.assignment) {
          <span i18n-matTooltip matTooltip="Test"><mat-icon>assignment</mat-icon></span>
        }
        @case (courseIcons.attachFile) {
          <span i18n-matTooltip matTooltip="Resource(s)"><mat-icon>attach_file</mat-icon></span>
        }
        @case (courseIcons.description) {
          <span i18n-matTooltip matTooltip="Survey">
            <mat-icon >description</mat-icon>
          </span>
        }
        @case (courseIcons.done) {
          <span i18n-matTooltip matTooltip="This step has been completed."><mat-icon>done</mat-icon></span>
        }
        @case (courseIcons.assignmentLate) {
          <span role="img" i18n-aria-label aria-label="Grading is required." i18n-matTooltip matTooltip="Grading is required.">
            <mat-icon>assignment_late</mat-icon>
          </span>
        }
        @case (courseIcons.rotateRight) {
          <span i18n-matTooltip matTooltip="This step is in progress."><mat-icon >rotate_right</mat-icon></span>
        }
      }
    </div>
    `,
  imports: [MatTooltip, MatIcon]
})
export class CoursesIconComponent {

  courseIcons = courseIcons;
  @Input() icon: CourseIcon = '';

}
