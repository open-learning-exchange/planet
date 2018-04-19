import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';

@Component({
  selector: 'planet-courses-step',
  templateUrl: 'courses-step.component.html'
})
export class CoursesStepComponent implements OnInit {

  @Input() stepInfo: any = {
    stepTitle: '',
    description: ''
  };
  @Output() stepInfoChange = new EventEmitter<any>();
  @Input() stepNum: number;
  @Output() examClick = new EventEmitter<any>();
  stepForm: FormGroup;

  constructor(
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.stepForm = this.fb.group(this.stepInfo);
  }

  stepChange() {
    this.stepInfoChange.emit(this.stepForm.value);
  }

  addExam(stepNum: number) {
    this.examClick.emit(stepNum - 1);
  }

}
