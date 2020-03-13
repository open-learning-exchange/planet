import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-course-icon',
  template: `
    <span *ngIf="step?.exam?.questions.length" i18n-matTooltip matTooltip="The test has question"><mat-icon *ngIf="step?.exam?.questions.length" >assignment</mat-icon></span>
    <span *ngIf="step?.resources?.length" i18n-matTooltip matTooltip= "There are resource."><mat-icon *ngIf="step?.resources?.length">attach_file</mat-icon></span>
    <span *ngIf="step?.survey?.questions.length" i18n-matTooltip matTooltip= "There are surveys in this step."><mat-icon *ngIf="step?.survey?.questions.length">description</mat-icon></span>
    <span *ngIf="step.progress && step.progress" i18n-matTooltip matTooltip= "This step has been completed."><mat-icon *ngIf="step.progress && step.progress" >done</mat-icon></span>
    <span *ngIf="step.progress && !step.progress" i18n-matTooltip matTooltip= "This step is not complete."><mat-icon *ngIf="step.progress && !step.progress">rotate_right</mat-icon></span>
  `
})
export class CoursesIconComponent {

  @Input() icon: '';
  @Input() step: any = {};

}
