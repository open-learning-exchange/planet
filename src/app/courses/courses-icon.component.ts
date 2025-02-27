import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-course-icon',
  template: `
    <div [ngSwitch]="icon">
      <span *ngSwitchCase="'assignment'" i18n-matTooltip matTooltip="Test"><mat-icon>assignment</mat-icon></span>
      <span *ngSwitchCase="'attach_file'" i18n-matTooltip matTooltip="Resource(s)"><mat-icon>attach_file</mat-icon></span>
      <span *ngSwitchCase="'description'" i18n-matTooltip matTooltip="Survey"><mat-icon>description</mat-icon></span>
      <span *ngSwitchCase="'done'" i18n-matTooltip matTooltip="This step has been completed."><mat-icon>done</mat-icon></span>
      <span *ngSwitchCase="'rotate_right'" i18n-matTooltip matTooltip="Test is incomplete"><mat-icon>rotate_right</mat-icon></span>
      <span *ngSwitchCase="'pending_actions'" i18n-matTooltip matTooltip="Test completed, needs grading"><mat-icon>pending_actions</mat-icon></span>
    </div>
  `
})
export class CoursesIconComponent {
  @Input() icon: string = '';
}
