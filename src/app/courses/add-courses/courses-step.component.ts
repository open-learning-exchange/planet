import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
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
export class CoursesStepComponent implements OnChanges {

  @Input() stepInfo: any = {
    id: '',
    stepTitle: '',
    description: ''
  };
  @Output() stepInfoChange = new EventEmitter<any>();
  @Input() stepNum: number;
  @Input() stepCount: number;
  @Output() stepOrder = new EventEmitter<any>();
  @Output() stepRemove = new EventEmitter<any>();
  stepForm: FormGroup;

  constructor(
    private fb: FormBuilder
  ) {}

  ngOnChanges() {
    this.stepForm = this.fb.group(this.stepInfo);
  }

  stepChange() {
    this.stepInfoChange.emit(this.stepForm.value);
  }

  deleteStep() {
    this.stepRemove.emit();
  }

  moveUp() {
    this.stepOrder.emit(this.stepNum - 2);
  }

  moveDown() {
    this.stepOrder.emit(this.stepNum);
  }

}
