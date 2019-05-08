import { Injectable } from '@angular/core';
import { FormGroup, FormControl, FormArray, FormBuilder, Validators } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';

@Injectable({
  providedIn: 'root'
})
export class ExamsService {

  constructor(
    private fb: FormBuilder
  ) {}

  newQuestionForm(requireCorrect, initialValue?: any) {
    const choices = (initialValue && initialValue.choices) || [];
    return this.setInitalFormValue(this.fb.group(Object.assign(
      {
        body: [ '', CustomValidators.required ],
        type: 'input',
        correctChoice: [ '', CustomValidators.choiceSelected(requireCorrect) ],
        marks: [ 1, CustomValidators.positiveNumberValidator ],
        choices: this.fb.array(
          choices.length === 0 ? [] : choices.map(choice => this.newQuestionChoice('', choice)),
          CustomValidators.minLengthArray(1)
        )
      }
    )), initialValue);
  }

  newQuestionChoice(newId, intialValue?) {
    return this.setInitalFormValue(new FormGroup({
      'text': new FormControl('', CustomValidators.required),
      'id': new FormControl(newId)
    }), intialValue);
  }

  setInitalFormValue(formGroup, initialValue?) {
    if (initialValue !== undefined) {
      formGroup.patchValue(initialValue);
    }
    return formGroup;
  }

  updateQuestion(question: FormGroup, newQuestion: FormGroup) {
    const { choices: newChoices, ...fields } = newQuestion.value;
    const choices = (<FormArray>question.controls.choices);
    this.removeChoices(choices, newChoices);
    question.patchValue(fields);
    newChoices.forEach((choice) => {
      const index = question.controls.choices.value.findIndex(c => c.id === choice.id);
      const newChoice = this.newQuestionChoice('', choice);
      if (index > -1) {
        choices.at(index).setValue(newChoice.value);
      } else {
        choices.push(newChoice);
      }
    });
  }

  removeChoices(oldChoices: FormArray, newChoices: any[]) {
    let oldChoice: any;
    for (let i = oldChoices.length - 1; i > -1; i--) {
      oldChoice = oldChoices.value[i];
      if (newChoices.findIndex((choice) => oldChoice.id === choice.id) === -1) {
        oldChoices.removeAt(i);
      }
    }
  }

  checkValidFormComponent(formField, asTouched = true) {
    Object.keys(formField.controls).forEach(field => {
      const control = formField.get(field);
      if (asTouched) {
        control.markAsTouched({ onlySelf: true });
      } else {
        control.markAsUntouched({ onlySelf: true });
      }
      if (control.controls) {
        this.checkValidFormComponent(control);
      }
    });
  }

}
