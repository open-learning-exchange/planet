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
  examType = this.route.snapshot.paramMap.get('type') || 'courses';
  successMessage = this.examType === 'surveys' ? 'New survey added' : 'New exam added';
  steps = [];
  showFormError = false;
  returnUrl = this.examType === 'surveys' ? '/surveys' : this.coursesService.returnUrl || 'courses';
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
    private planetStepListService: PlanetStepListService
  ) {
    this.createForm();
  }

  createForm() {
    const title = this.examType === 'courses' ? this.coursesService.course.steps[this.coursesService.stepIndex].stepTitle : '';
    this.examForm = this.fb.group({
      name: [
        title,
        CustomValidators.required,
        this.nameValidator()
      ],
      passingPercentage: [
        100,
        [ CustomValidators.positiveNumberValidator, Validators.max(100) ]
      ],
      questions: this.fb.array([]),
      type: this.examType
    });
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
        this.initializeQuestions(data.questions);
      }, (error) => {
        console.log(error);
      });
    }
    this.courseName = this.coursesService.course.form ? this.coursesService.course.form.courseTitle : '';
  }

  onSubmit() {
    if (this.examForm.valid) {
      this.addExam(Object.assign({}, this.examForm.value, this.documentInfo));
    } else {
      this.examsService.checkValidFormComponent(this.examForm);
      this.showFormError = true;
      this.stepClick(this.activeQuestionIndex);
    }
  }

  nameValidator(exception = '') {
    return ac => this.validatorService.isUnique$(
      this.dbName, 'name', ac, { exceptions: [ exception ], selectors: { type: this.examType } }
    );
  }

  addExam(examInfo) {
    const date = this.couchService.datePlaceholder;
    this.couchService.updateDocument(this.dbName, { createdDate: date, ...examInfo, updatedDate: date }).subscribe((res) => {
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

  stepClick(index: number) {
    this.activeQuestionIndex = index;
    this.question = (<FormGroup>(<FormArray>this.examForm.get('questions')).at(index));
  }

  initializeQuestions(questions: any[]) {
    questions.forEach((question) => {
      (<FormArray>this.examForm.controls.questions).push(this.examsService.newQuestionForm(this.examType === 'courses', question));
    });
  }

  addQuestion() {
    const questions = (<FormArray>this.examForm.get('questions'));
    questions.push(this.examsService.newQuestionForm(this.examType === 'courses'));
    questions.updateValueAndValidity();
    this.planetStepListService.addStep(questions.length - 1);
  }

  removeQuestion(index) {
    (<FormArray>this.examForm.get('questions')).removeAt(index);
  }

  goBack() {
    this.router.navigateByUrl(this.returnUrl);
  }

}
