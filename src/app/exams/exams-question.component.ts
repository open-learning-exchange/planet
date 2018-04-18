import { Component, Input } from '@angular/core';
import {
  FormGroup
} from '@angular/forms';

@Component({
  selector: 'planet-exam-question',
  templateUrl: 'exams-question.component.html'
})
export class ExamsQuestionComponent {

  @Input() questionForm: FormGroup;

  constructor() {}

}
