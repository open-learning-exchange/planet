import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-course-icon',
  template: `
    <div [ngSwitch]="icon">
      <span *ngSwitchCase="'assignment'" i18n-matTooltip matTooltip="The test has question"><mat-icon>assignment</mat-icon></span>
      <span *ngSwitchCase="'attach_file'" i18n-matTooltip matTooltip="There are resource."><mat-icon>attach_file</mat-icon></span>
      <span *ngSwitchCase="'description'" i18n-matTooltip matTooltip="There are surveys in this step.">
        <mat-icon >description</mat-icon>
      </span>
      <span *ngSwitchCase="'done'" i18n-matTooltip matTooltip="This step has been completed."><mat-icon>done</mat-icon></span>
      <span *ngSwitchCase="'rotate_right'" i18n-matTooltip matTooltip="This step is not complete."><mat-icon >rotate_right</mat-icon></span>
    </div>
  `
})
export class CoursesIconComponent {

  @Input() icon: '';
  @Input() step: any = {};

}
