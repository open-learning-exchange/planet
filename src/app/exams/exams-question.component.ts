import { Component, Input, OnInit, OnChanges, EventEmitter, Output } from '@angular/core';
import {
  FormGroup,
  FormControl,
  FormArray,
  FormBuilder,
  Validators
} from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { uniqueId } from '../shared/utils';
import { CustomValidators } from '../validators/custom-validators';

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

  @Input() question: any = {};
  @Output() questionChange = new EventEmitter<any>();
  @Input() examType = 'courses';
  @Output() questionRemove = new EventEmitter<any>();
  correctCheckboxes: any = {};
  questionForm: FormGroup = this.newQuestionForm();
  initializing = true;
  private onDestroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    const onFormChange = (value) => {
      if (!this.initializing) {
        this.questionChange.emit(value);
      }
    };
    this.questionForm.valueChanges.pipe(takeUntil(this.onDestroy$)).subscribe(onFormChange);
    this.questionForm.controls.choices.valueChanges.pipe(takeUntil(this.onDestroy$)).subscribe(onFormChange);
  }

  ngOnChanges() {
    this.initializing = true;
    this.updateQuestion(this.question);
  }

  addChoice() {
    const newId = uniqueId();
    this.correctCheckboxes[newId] = false;
    (<FormArray>this.questionForm.controls.choices).push(new FormGroup({
      'text': new FormControl('', Validators.required),
      'id': new FormControl(newId)
    }));
  }

  removeChoice(index: number) {
    (<FormArray>this.questionForm.controls.choices).removeAt(index);
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
    while ((<FormArray>this.questionForm.controls.choices).length !== 0) {
      this.removeChoice(0);
    }
  }

  newQuestionForm() {
    return this.fb.group(Object.assign(
      {
        title: '',
        body: [ '', Validators.required ],
        type: 'input',
        correctChoice: '',
        marks: [ 1, CustomValidators.positiveNumberValidator ],
        choices: this.fb.array([])
      }
    ));
  }

  updateQuestion(question: any = { body: '', choices: [] }) {
    const choices = question.choices.map((choice) => {
      return new FormGroup({
        'text': new FormControl(choice.text),
        'id': new FormControl(choice.id)
      });
    });
    this.questionForm.patchValue(question);
    this.questionForm.setControl('choices', this.fb.array(choices));
    this.questionForm.get('body').setValue(question.body);
    this.initializing = false;
  }

}
