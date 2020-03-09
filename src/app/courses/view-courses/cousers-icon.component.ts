import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-course-icon',
  template: `
    <span *ngIf="icon === assignment" matTooltip="There is description on this step."></span>
    <span *ngIf="icon === attach_file" matTooltip= "There are questions in this step."></span>
    <span *ngIf="icon === description" matTooltip= "There are surveys in this step."></span>
    <span *ngIf="icon === done" matTooltip= "This step has been completed."></span>
    <span *ngIf="icon === rotate_right" matTooltip= "This step is not complet."></span>
  `
})
export class CoursesIconComponent {

  @Input() icon: string;

}
