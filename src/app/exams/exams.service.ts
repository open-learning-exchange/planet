import { Injectable } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, UntypedFormArray, UntypedFormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { CustomValidators } from '../validators/custom-validators';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';

@Injectable({
  providedIn: 'root'
})
export class ExamsService {
  readonly dbName = 'exams';

  constructor(
    private fb: UntypedFormBuilder,
    private couchService: CouchService,
    private userService: UserService,
    private stateService: StateService
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
          choices.length === 0 ? [] : choices.map(choice => this.newQuestionChoice('', choice))
        ),
        hasOtherOption: [ false ]
      }
    ), { validators: this.choiceRequiredValidator }
    ), initialValue);
  }

  choiceRequiredValidator(ac) {
    const questionType = ac.get('type').value;
    return questionType === 'select' || questionType === 'selectMultiple' ?
     Validators.required(ac.get('choices')) && { noChoices: true } :
     null;
  }

  newQuestionChoice(newId, intialValue?) {
    return this.setInitalFormValue(new UntypedFormGroup({
      'text': new UntypedFormControl('', CustomValidators.required),
      'id': new UntypedFormControl(newId)
    }), intialValue);
  }

  setInitalFormValue(formGroup, initialValue?) {
    if (initialValue !== undefined) {
      formGroup.patchValue(initialValue);
    }
    return formGroup;
  }

  updateQuestion(question: UntypedFormGroup, newQuestion: UntypedFormGroup) {
    const { choices: newChoices, ...fields } = newQuestion.value;
    const choices = (<UntypedFormArray>question.controls.choices);
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

  removeChoices(oldChoices: UntypedFormArray, newChoices: any[]) {
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

  createExamDocument(examData: any): Observable<any> {
    const date = this.couchService.datePlaceholder;
    const examDocument = {
      createdDate: date,
      createdBy: this.userService.get().name,
      ...examData,
      updatedDate: date,
      sourcePlanet: this.stateService.configuration.code
    };
    return this.couchService.updateDocument(this.dbName, examDocument);
  }
}
