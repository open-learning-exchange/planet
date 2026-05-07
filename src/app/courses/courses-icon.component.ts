import { Component, Input } from '@angular/core';

import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'planet-course-icon',
  template: `
    <div>
      @switch (icon) {
        @case ('assignment') {
          <span i18n-matTooltip matTooltip="Test"><mat-icon>assignment</mat-icon></span>
        }
        @case ('attach_file') {
          <span i18n-matTooltip matTooltip="Resource(s)"><mat-icon>attach_file</mat-icon></span>
        }
        @case ('description') {
          <span i18n-matTooltip matTooltip="Survey">
            <mat-icon >description</mat-icon>
          </span>
        }
        @case ('done') {
          <span i18n-matTooltip matTooltip="This step has been completed."><mat-icon>done</mat-icon></span>
        }
        @case ('rotate_right') {
          <span i18n-matTooltip matTooltip="This step is in progress."><mat-icon >rotate_right</mat-icon></span>
        }
      }
    </div>
    `,
  imports: [MatTooltip, MatIcon]
})
export class CoursesIconComponent {

  @Input() icon: '';

}
