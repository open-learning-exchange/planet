import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-courses-progress-bar',
  templateUrl: 'courses-progress-bar.component.html',
  styleUrls: [ 'courses-progress-bar.scss' ]
})
export class CoursesProgressBarComponent {

  @Input() course: any = { steps: [] };
  @Input() courseProgress: any;

}
