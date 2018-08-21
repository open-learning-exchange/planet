import { Component, Input, OnInit, EventEmitter, Output } from '@angular/core';
import {
  FormGroup,
  FormControl,
  FormArray
} from '@angular/forms';
import { uniqueId } from '../shared/utils';

@Component({
  selector: 'planet-exam-question',
  templateUrl: 'exams-question.component.html',
  styles: [ `
    .survey-question-choices {
      display: grid;
      grid-template-columns: repeat(auto-fill, 180px);
      align-items: center;
      grid-column-gap: 5px;
    }
    .exam-question-choices {
      display: grid;
      grid-template-columns: repeat(auto-fill, 180px 24px);
      align-items: center;
      grid-column-gap: 5px;
    }
  ` ]
})
export class ExamsQuestionComponent implements OnInit {

  @Input() questionForm: FormGroup;
  @Input() examType = 'courses';
  @Output() questionRemove = new EventEmitter<any>();
  choices: FormArray;
  correctCheckboxes: any = {};

  constructor() {}

  ngOnInit() {
    this.choices = <FormArray>this.questionForm.controls.choices;
    const correctChoice = this.questionForm.controls.correctChoice.value;
    this.choices.controls.forEach((choice: any) =>
      this.correctCheckboxes[choice.controls.id.value] = correctChoice === choice.controls.id.value);
  }

  addChoice() {
    const newId = uniqueId();
    this.correctCheckboxes[newId] = false;
    this.choices.push(new FormGroup({
      'text': new FormControl(''),
      'id': new FormControl(newId)
    }));
  }

  removeChoice(index: number) {
    this.choices.removeAt(index);
  }

  deleteQuestion() {
    this.questionRemove.emit();
  }

  setCorrect(event: any, choice: any) {
    if (event.checked) {
      Object.keys(this.correctCheckboxes).forEach((key) => {
        this.correctCheckboxes[key] = key === choice.controls.id.value;
      });
    }
    this.questionForm.controls.correctChoice.setValue(event.checked ? choice.controls.id.value : '');
  }

  choiceTrackByFn(index, item) {
    return item.id;
  }

  clearChoices() {
    this.questionForm.patchValue({ 'correctChoice': '' });
    while (this.choices.length !== 0) {
      this.removeChoice(0);
    }
  }

}
