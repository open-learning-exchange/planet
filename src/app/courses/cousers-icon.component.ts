import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-course-icon',
  template: `
  <ng-container [ngSwitch]="icon">
    <span *ngIf="step?.exam?.questions.length" i18n-matTooltip matTooltip="The test has question">
      <mat-icon *ngSwitchCase="'assignment'">assignment</mat-icon>
    </span>
    <span *ngIf="step?.resources?.length" i18n-matTooltip matTooltip= "There are resource.">
      <mat-icon *ngSwitchCase="'attach_file'">attach_file</mat-icon>
    </span>
    <span *ngIf="step?.survey?.questions.length" i18n-matTooltip matTooltip= "There are surveys in this step.">
      <mat-icon *ngSwitchCase="'description'">description</mat-icon>
    </span>
    <span *ngIf="step.progress && step.progress" i18n-matTooltip matTooltip= "This step has been completed.">
      <mat-icon *ngSwitchCase="'done'" >done</mat-icon>
    </span>
    <span *ngIf="step.progress && !step.progress" i18n-matTooltip matTooltip= "This step is not complete.">
      <mat-icon *ngSwitchCase="'rotate_right'">rotate_right</mat-icon>
    </span>
    </ng-container>
  `
})
export class CoursesIconComponent {

  @Input() icon: '';
  @Input() step: any = {};

}
