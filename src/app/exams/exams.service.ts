import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { CustomValidators } from '../validators/custom-validators';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';

export interface QuestionChoice {
  text: string;
  id: string;
}

export interface QuestionValue {
  body: string;
  type: string;
  correctChoice: string | string[];
  marks: number;
  choices: QuestionChoice[];
  hasOtherOption: boolean;
}

export type QuestionChoiceFormGroup = FormGroup<{
  text: FormControl<string>;
  id: FormControl<string>;
}>;

export type QuestionFormGroup = FormGroup<{
  body: FormControl<string>;
  type: FormControl<string>;
  correctChoice: FormControl<string | string[]>;
  marks: FormControl<number>;
  choices: FormArray<QuestionChoiceFormGroup>;
  hasOtherOption: FormControl<boolean>;
}>;

@Injectable({
  providedIn: 'root'
})
export class ExamsService {
  readonly dbName = 'exams';

  constructor(
    private fb: FormBuilder,
    private couchService: CouchService,
    private userService: UserService,
    private stateService: StateService
  ) {}

  newQuestionForm(requireCorrect: boolean, initialValue?: Partial<QuestionValue>): QuestionFormGroup {
    const choices = (initialValue && initialValue.choices) || [];
    const formGroup = this.fb.group<QuestionFormGroup['controls']>({
      body: this.fb.control('', { validators: CustomValidators.required, nonNullable: true }),
      type: this.fb.control('input', { nonNullable: true }),
      correctChoice: this.fb.control<string | string[]>('', { validators: CustomValidators.choiceSelected(requireCorrect) }),
      marks: this.fb.control(1, { validators: CustomValidators.positiveNumberValidator, nonNullable: true }),
      choices: this.fb.array<QuestionChoiceFormGroup>(
        choices.length === 0 ? [] : choices.map(choice => this.newQuestionChoice(choice.id ?? '', choice))
      ),
      hasOtherOption: this.fb.control(false, { nonNullable: true })
    }, { validators: this.choiceRequiredValidator.bind(this) });

    return this.setInitalFormValue(formGroup, initialValue);
  }

  choiceRequiredValidator(ac: QuestionFormGroup) {
    const questionType = ac.get('type')?.value;
    return questionType === 'select' || questionType === 'selectMultiple' ?
     Validators.required(ac.get('choices')) && { noChoices: true } :
     null;
  }

  newQuestionChoice(newId: string, intialValue?: Partial<QuestionChoice>): QuestionChoiceFormGroup {
    return this.setInitalFormValue(this.fb.group({
      text: this.fb.control('', { validators: CustomValidators.required, nonNullable: true }),
      id: this.fb.control(newId, { nonNullable: true })
    }), intialValue);
  }

  setInitalFormValue<T extends AbstractControl>(formGroup: T, initialValue?: Partial<QuestionValue> | Partial<QuestionChoice>) {
    if (initialValue !== undefined) {
      formGroup.patchValue(initialValue);
    }
    return formGroup;
  }

  updateQuestion(question: QuestionFormGroup, newQuestion: QuestionFormGroup) {
    const { choices: newChoices, ...fields }: QuestionValue = newQuestion.getRawValue();
    const choices = question.controls.choices;
    this.removeChoices(choices, newChoices);
    question.patchValue(fields);
    const currentChoices = choices.controls;
    newChoices.forEach((choice: QuestionChoice) => {
      const index = currentChoices.findIndex(c => c.controls.id.value === choice.id);
      const newChoice = this.newQuestionChoice(choice.id, choice);
      if (index > -1) {
        choices.at(index).setValue(newChoice.getRawValue());
      } else {
        choices.push(newChoice);
      }
    });
  }

  removeChoices(oldChoices: FormArray<QuestionChoiceFormGroup>, newChoices: QuestionChoice[]) {
    const oldChoiceValues = oldChoices.getRawValue();
    for (let i = oldChoices.length - 1; i > -1; i--) {
      const oldChoice = oldChoiceValues[i];
      if (newChoices.findIndex((choice) => oldChoice.id === choice.id) === -1) {
        oldChoices.removeAt(i);
      }
    }
  }

  checkValidFormComponent(formField: FormGroup | FormArray, asTouched = true) {
    Object.keys(formField.controls).forEach(field => {
      const control = formField.get(field);
      if (asTouched) {
        control?.markAsTouched({ onlySelf: true });
      } else {
        control?.markAsUntouched({ onlySelf: true });
      }
      if ((control instanceof FormGroup) || (control instanceof FormArray)) {
        this.checkValidFormComponent(control, asTouched);
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
