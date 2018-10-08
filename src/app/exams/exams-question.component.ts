import { Component, Input, OnInit, EventEmitter, Output, OnChanges } from '@angular/core';
import {
  FormGroup,
  FormControl,
  FormArray,
  Validators
} from '@angular/forms';
import { uniqueId } from '../shared/utils';

@Component({
  selector: 'planet-exam-question',
  templateUrl: 'exams-question.component.html',
  styles: [ `
    .question-choices {
      display: grid;
      grid-template-columns: repeat(auto-fill, 180px 24px);
      align-items: center;
      grid-column-gap: 5px;
    }
    .survey-question {
      grid-template-columns: repeat(auto-fill, 180px);
    }
  ` ]
})
export class ExamsQuestionComponent implements OnInit, OnChanges {

  @Input() questionForm: FormGroup;
  @Input() examType = 'courses';
  @Output() questionRemove = new EventEmitter<any>();
  choices: FormArray;
  correctCheckboxes: any = {};
  @Input() clickSubmit: boolean;
  noDescription: boolean;

  constructor() {}

  ngOnChanges() {
    this.checkDesc(this.clickSubmit);
  }

  ngOnInit() {
    this.choices = <FormArray>this.questionForm.controls.choices;
    const correctChoice = this.questionForm.controls.correctChoice.value;
    this.choices.controls.forEach((choice: any) =>
      this.correctCheckboxes[choice.controls.id.value] = correctChoice.indexOf(choice.controls.id.value) > -1);
  }

  addChoice() {
    const newId = uniqueId();
    this.correctCheckboxes[newId] = false;
    this.choices.push(new FormGroup({
      'text': new FormControl('', Validators.required),
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
    const formControls = this.questionForm.controls;
    const newChoiceId = choice.controls.id.value;
    let correctChoices = formControls.correctChoice.value || [];
    if (event.checked) {
      correctChoices = formControls.type.value === 'selectMultiple' ? correctChoices.concat([ newChoiceId ]) : [ newChoiceId ];
    } else {
      correctChoices.splice(correctChoices.indexOf(newChoiceId));
    }
    this.questionForm.controls.correctChoice.setValue(correctChoices);
    Object.keys(this.correctCheckboxes).forEach((key) => {
      this.correctCheckboxes[key] = correctChoices.indexOf(key) > -1;
    });
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

  checkDesc(event) {
    if ( event === true) {
      const descriptionValue = String(this.questionForm.get('body').value);
      // when description is empty or only contains empty spaces, noDescription is true
      const onlySpace = /^\s*$/.test(descriptionValue) === true;
      const emptyDesc = this.questionForm.get('body').valid !== true;
      (onlySpace) || (emptyDesc) ? this.noDescription = true :  this.noDescription = false;
    }
  }

}
