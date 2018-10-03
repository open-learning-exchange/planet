import { Component, Input, OnInit, EventEmitter, Output } from '@angular/core';
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
export class ExamsQuestionComponent implements OnInit {

  @Input() questionForm: FormGroup;
  @Input() examType = 'courses';
  @Output() questionRemove = new EventEmitter<any>();
  choices: FormArray;
  correctCheckboxes: any = {};
  @Output() noCorrectSelection = new EventEmitter<boolean>();

  constructor() {}

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
    this.checkExamCorrectChoice(event, choice);
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

  checkChoiceType(event) {
    return event !== 'input'  ?  this.noCorrectSelection.emit(true)  :  this.noCorrectSelection.emit(false);
  }

  checkChoiceInput(correctChoice) {
    if (this.examType === 'surveys') {
      if (this.questionForm.controls.type.value !== 'input') {
        for (const choice of this.choices.controls) {
           if (choice['controls'].text.value) {
            return this.noCorrectSelection.emit(false);
          }
        }
        return this.noCorrectSelection.emit(true);
      }
    } else {
       if (this.questionForm.controls.type.value === 'select') {
         if (! correctChoice.controls.text.value && this.correctCheckboxes[correctChoice.controls.id.value]) {
          return this.noCorrectSelection.emit(true);
        } else  if (correctChoice.controls.text.value && this.correctCheckboxes[correctChoice.controls.id.value]) {
          return this.noCorrectSelection.emit(false);
        }
      } else  if (this.questionForm.controls.type.value === 'selectMultiple') {
         if (! correctChoice.controls.text.value && this.correctCheckboxes[correctChoice.controls.id.value]) {
          return this.noCorrectSelection.emit(true);
        } else  if (correctChoice.controls.text.value && this.correctCheckboxes[correctChoice.controls.id.value]) {
          for (const choice of this.choices.controls) {
             if (choice !== correctChoice) {
               if (!choice['controls'].text.value && this.correctCheckboxes[choice['controls'].id.value]) {
                return this.noCorrectSelection.emit(true);
               }
            }
          }
          return this.noCorrectSelection.emit(false);
        }
      }
    }
  }

  checkExamCorrectChoice(event: any, correctChoice: any) {
     if (event.checked) {
      const index = this.choices.controls.indexOf(correctChoice);
      let j = 0;
      for (const choice of this.choices.controls) {
          if (j === index  && index  >  - 1 && choice['controls'].text.value) {
          return this.noCorrectSelection.emit(false);
        }
          j = j + 1 ;
      }
      return this.noCorrectSelection.emit(true);
    } else {
       if (this.questionForm.controls.type.value === 'select') {
        return this.noCorrectSelection.emit(true);
      } else if (this.questionForm.controls.type.value === 'selectMultiple') {
         for ( const key of this.questionForm.controls.correctChoice.value) {
           if (key) {
             return  this.noCorrectSelection.emit(false);
           }
        }
         return this.noCorrectSelection.emit(true);
      }
    }
  }
}
