import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CoursesService } from '../courses/courses.service';
import { CustomValidators } from '../validators/custom-validators';

@Component({
  templateUrl: 'exams-add.component.html',
  styleUrls: [ 'exams-add.scss' ]
})
export class ExamsAddComponent implements OnInit {
  readonly dbName = 'exams'; // make database name a constant
  examForm: FormGroup;
  questionsFormArray: any[];
  question: FormGroup = this.fb.group(this.newQuestionForm());
  documentInfo: any = {};
  pageType = 'Add';
  courseName = '';
  examType = this.route.snapshot.paramMap.get('type') || 'courses';
  successMessage = this.examType === 'surveys' ? 'New survey added' : 'New exam added';
  steps = [];
  showFormError = false;
  returnUrl = this.examType === 'surveys' ? '/surveys' : this.coursesService.returnUrl || 'courses';
  activeQuestionIndex = -1;
  private onDestroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private planetMessageService: PlanetMessageService,
    private coursesService: CoursesService
  ) {
    this.createForm();
  }

  createForm() {
    const title = this.examType === 'courses' ? this.coursesService.course.steps[this.coursesService.stepIndex].stepTitle : '';
    this.examForm = this.fb.group({
      name: [
        title,
        Validators.required,
        this.nameValidator()
      ],
      passingPercentage: [
        100,
        [ CustomValidators.positiveNumberValidator, Validators.max(100) ]
      ],
      questions: [ [] ],
      type: this.examType
    });
    this.questionsFormArray = this.examForm.controls.questions.value;
  }

  ngOnInit() {
    if (this.route.snapshot.url[0].path === 'update') {
      this.successMessage = this.examType === 'surveys' ? 'Survey updated successfully' : 'Exam updated successfully';
      this.couchService.get(this.dbName + '/' + this.route.snapshot.paramMap.get('id'))
      .subscribe((data) => {
        this.pageType = 'Update';
        this.documentInfo = { _rev: data._rev, _id: data._id };
        this.examForm.controls.name.setAsyncValidators(this.nameValidator(data.name));
        this.examForm.patchValue(data);
        if (data.questions) {
          data.questions.forEach((question) => this.questionsFormArray.push(question));
        }
      }, (error) => {
        console.log(error);
      });
    }
    this.courseName = this.coursesService.course.form.courseTitle;
    this.question.valueChanges.pipe(takeUntil(this.onDestroy$)).subscribe(value => {
      this.examForm.controls.questions.value[this.activeQuestionIndex] = { ...value };
    });
  }

  onSubmit() {
    if (this.examForm.valid) {
      this.addExam(Object.assign({}, this.examForm.value, this.documentInfo));
    } else {
      this.checkValidFormComponent(this.examForm);
      this.showFormError = true;
    }
  }

  nameValidator(exception = '') {
    return ac => this.validatorService.isUnique$(
      this.dbName, 'name', ac, { exceptions: [ exception ], selectors: { type: this.examType } }
    );
  }

  checkValidFormComponent(formField) {
    Object.keys(formField.controls).forEach(field => {
      const control = formField.get(field);
      control.markAsTouched({ onlySelf: true });
      if (control.controls) {
        this.checkValidFormComponent(control);
      }
    });
  }

  addExam(examInfo) {
    this.couchService.post(this.dbName, examInfo).subscribe((res) => {
      this.documentInfo = { _id: res.id, _rev: res.rev };
      let routerParams = {};
      if (this.examType === 'courses') {
        this.appendExamToCourse(examInfo);
        routerParams = { 'continue': true };
      }
      this.goBack();
      this.planetMessageService.showMessage(this.successMessage);
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  appendExamToCourse(examInfo) {
    const courseExam = { ...this.documentInfo, ...examInfo, totalMarks: this.totalMarks(examInfo) };
    this.coursesService.course.steps[this.coursesService.stepIndex].exam = courseExam;
  }

  totalMarks(examInfo) {
    return examInfo.questions.reduce((total: number, question: any) => total + question.marks, 0);
  }

<<<<<<< HEAD
  addQuestion(question: any = { choices: [] }) {
    const choices = question.choices.map((choice) => {
      return new FormGroup({
        'text': new FormControl(choice.text, Validators.required),
        'id': new FormControl(choice.id)
      });
    });
    this.questionsFormArray.push(this.fb.group(Object.assign(
=======
  stepClick(index: number) {
    this.activeQuestionIndex = index;
    this.updateQuestion(this.questionsFormArray[index]);
  }

  newQuestionForm(question: any = {}, choices = []) {
    return Object.assign(
>>>>>>> Exams use planet-step-list
      {
        body: [ '', Validators.required ],
        type: 'input'
      },
      question,
      {
        marks: [ question.marks || 1, CustomValidators.positiveNumberValidator ],
        choices: this.fb.array(choices || []),
        correctChoice: [
          typeof question.correctChoice === 'string' ? [ question.correctChoice ] : question.correctChoice || [],
          CustomValidators.choiceSelected(this.examType === 'courses')
        ]
      }
    );
  }

  updateQuestion(question: any = { choices: [] }) {
    const choices = question.choices.map((choice) => {
      return new FormGroup({
        'text': new FormControl(choice.text),
        'id': new FormControl(choice.id)
      });
    });
    this.question.patchValue(question);
    this.question.patchValue({ choices });
  }

  addQuestion() {
    this.questionsFormArray.push({
      body: '',
      type: 'input',
      correctChoice: '',
      marks: 1,
      choices: []
    });
  }

  removeQuestion(index) {
    this.questionsFormArray.splice(index, 1);
  }

  goBack() {
    this.router.navigateByUrl(this.returnUrl);
  }

}
