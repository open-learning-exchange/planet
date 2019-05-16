import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CoursesService } from '../courses/courses.service';
import { CustomValidators } from '../validators/custom-validators';
import { ExamsService } from './exams.service';
import { PlanetStepListService } from '../shared/forms/planet-step-list.component';
import { UserService } from '../shared/user.service';
import { switchMap } from 'rxjs/operators';

const showdown = require('showdown');

@Component({
  templateUrl: 'exams-add.component.html',
  styleUrls: [ 'exams-add.scss' ]
})
export class ExamsAddComponent implements OnInit {
  readonly dbName = 'exams'; // make database name a constant
  examForm: FormGroup;
  documentInfo: any = {};
  pageType = 'Add';
  courseName = '';
  examType: 'exam' | 'survey' = <'exam' | 'survey'>this.route.snapshot.paramMap.get('type') || 'exam';
  successMessage = this.examType === 'survey' ? 'New survey added' : 'New test added';
  steps = [];
  showFormError = false;
  isCourseContent = this.router.url.match(/courses/);
  returnUrl = (this.examType === 'survey' && !this.isCourseContent) ? '/surveys' : this.coursesService.returnUrl || 'courses';
  activeQuestionIndex = -1;
  private _question: FormGroup;
  get question(): FormGroup {
    return this._question;
  }
  set question(newQuestion: FormGroup) {
    const question = (<FormGroup>(<FormArray>this.examForm.controls.questions).at(this.activeQuestionIndex));
    this.examsService.updateQuestion(question, newQuestion);
    this._question = newQuestion;
    this.examForm.controls.questions.updateValueAndValidity();
  }
  get questions(): FormArray {
    return <FormArray>this.examForm.controls.questions;
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private planetMessageService: PlanetMessageService,
    private coursesService: CoursesService,
    private examsService: ExamsService,
    private planetStepListService: PlanetStepListService,
    private userService: UserService
  ) {
    this.createForm();
  }

  createForm() {
    this.examForm = this.fb.group({
      name: this.isCourseContent ? '' : [
        '',
        CustomValidators.required,
        this.nameValidator()
      ],
      passingPercentage: [
        100,
        [ CustomValidators.positiveNumberValidator, Validators.max(100) ]
      ],
      questions: this.fb.array([]),
      type: { exam: 'courses', survey: 'surveys' }[this.examType]
    });
  }

  ngOnInit() {
    if (this.route.snapshot.url[0].path === 'update') {
      this.successMessage = this.examType === 'survey' ? 'Survey updated successfully' : 'Test updated successfully';
      this.couchService.get(this.dbName + '/' + this.route.snapshot.paramMap.get('id'))
      .subscribe((data) => {
        this.pageType = 'Update';
        this.documentInfo = { _rev: data._rev, _id: data._id };
        this.examForm.controls.name.setAsyncValidators(this.nameValidator(data.name));
        this.examForm.patchValue(data);
        this.initializeQuestions(data.questions);
      }, (error) => {
        console.log(error);
      });
    }
    this.courseName = this.coursesService.course.form ? this.coursesService.course.form.courseTitle : '';
  }

  onSubmit(reRoute = false) {
    if (this.examForm.valid) {
      this.showFormError = false;
      this.addExam(Object.assign({}, this.examForm.value, this.documentInfo), reRoute);
    } else {
      this.showFormError = true;
      this.examsService.checkValidFormComponent(this.examForm);
      this.stepClick(this.activeQuestionIndex);
    }
  }

  nameValidator(exception = '') {
    return ac => this.validatorService.isUnique$(
      this.dbName, 'name', ac, { exceptions: [ exception ], selectors: { type: this.examType } }
    );
  }

  addExam(examInfo, reRoute) {
    const date = this.couchService.datePlaceholder;
    const namePrefix = this.courseName || { exam: 'Exam', survey: 'Survey' }[this.examType];
    this.couchService.findAll(this.dbName,
      { selector: { type: this.examForm.value.type, name: { '$regex': namePrefix } } }
    ).pipe(switchMap((exams) => {
      examInfo.name = examInfo.name || this.newExamName(exams, namePrefix);
      return this.couchService.updateDocument(this.dbName,
        { createdDate: date, createdBy: this.userService.get().name, ...examInfo, updatedDate: date });
    }))
    .subscribe((res) => {
      this.documentInfo = { _id: res.id, _rev: res.rev };
      if (this.examType === 'exam' || this.isCourseContent) {
        this.appendToCourse(examInfo, this.examType);
      }
      if (reRoute) {
        this.goBack();
      }
      this.planetMessageService.showMessage(this.successMessage);
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  appendToCourse(info, type: 'exam' | 'survey') {
    const courseExam = { ...this.documentInfo, ...info, totalMarks: type === 'exam' ? this.totalMarks(info) : undefined };
    this.coursesService.course.steps[this.coursesService.stepIndex][type] = courseExam;
  }

  totalMarks(examInfo) {
    return examInfo.questions.reduce((total: number, question: any) => total + question.marks, 0);
  }

  stepClick(index: number) {
    this.activeQuestionIndex = index;
    this.question = (<FormGroup>(<FormArray>this.examForm.get('questions')).at(index));
  }

  initializeQuestions(questions: any[]) {
    questions.forEach((question) => {
      (<FormArray>this.examForm.controls.questions).push(this.examsService.newQuestionForm(this.examType === 'exam', question));
    });
  }

  addQuestion(type: string) {
    const questions = (<FormArray>this.examForm.get('questions'));
    questions.push(this.examsService.newQuestionForm(this.examType === 'exam', { type }));
    questions.updateValueAndValidity();
    this.planetStepListService.addStep(questions.length - 1);
    this.stepClick(questions.length - 1);
  }

  removeQuestion(index) {
    (<FormArray>this.examForm.get('questions')).removeAt(index);
  }

  plainText(value) {
    const converter = new showdown.Converter();
    const html = document.createElement('div');
    html.innerHTML = converter.makeHtml(value);
    return html.textContent || html.innerText || '';
  }

  goBack() {
    this.router.navigateByUrl(this.returnUrl);
  }

  newExamName(existingExams: any[], namePrefix, nameNumber = 0) {
    const tryNumber = nameNumber || existingExams.length;
    const name = `${namePrefix} - ${tryNumber + 1}`;
    if (existingExams.findIndex((exam: any) => exam.name === name) === -1) {
      return name;
    }
    return this.newExamName(existingExams, namePrefix, tryNumber + 1);
  }

}
