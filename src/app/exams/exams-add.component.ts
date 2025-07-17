import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  UntypedFormArray,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CoursesService } from '../courses/courses.service';
import { CustomValidators } from '../validators/custom-validators';
import { ExamsService } from './exams.service';
import { PlanetStepListService } from '../shared/forms/planet-step-list.component';
import { UserService } from '../shared/user.service';
import { ExamsPreviewComponent } from './exams-preview.component';
import { StateService } from '../shared/state.service';
import { markdownToPlainText } from '../shared/utils';
import { SubmissionsService } from './../submissions/submissions.service';
import { findDocuments } from '../shared/mangoQueries';

@Component({
  templateUrl: 'exams-add.component.html',
  styleUrls: [ 'exams-add.scss' ]
})
export class ExamsAddComponent implements OnInit {
  readonly dbName = 'exams'; // make database name a constant
  examForm: UntypedFormGroup;
  documentInfo: any = {};
  pageType: 'Add' | 'Update' | 'Copy' = 'Add';
  courseName = '';
  examType: 'exam' | 'survey' = <'exam' | 'survey'>this.route.snapshot.paramMap.get('type') || 'exam';
  teamId = this.route.parent?.snapshot.paramMap.get('teamId') || null;
  successMessage = this.examType === 'survey' ? $localize`New survey added` : $localize`New test added`;
  steps = [];
  showFormError = false;
  showPreviewError = false;
  isCourseContent = this.router.url.match(/courses/);
  returnUrl = this.coursesService.returnUrl || 'courses';
  activeQuestionIndex = -1;
  isManagerRoute = this.router.url.startsWith('/manager/surveys');
  isQuestionsActive = false;
  private _question: UntypedFormGroup;
  get question(): UntypedFormGroup {
    return this._question;
  }
  set question(newQuestion: UntypedFormGroup) {
    const question = (<UntypedFormGroup>(<UntypedFormArray>this.examForm.controls.questions).at(this.activeQuestionIndex));
    this.examsService.updateQuestion(question, newQuestion);
    this._question = newQuestion;
    this.examForm.controls.questions.updateValueAndValidity();
  }
  get questions(): UntypedFormArray {
    return <UntypedFormArray>this.examForm.controls.questions;
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: UntypedFormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private planetMessageService: PlanetMessageService,
    private coursesService: CoursesService,
    private examsService: ExamsService,
    private planetStepListService: PlanetStepListService,
    private userService: UserService,
    private dialog: MatDialog,
    private stateService: StateService,
    private submissionsService: SubmissionsService
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
      description: '',
      passingPercentage: [
        100,
        [ CustomValidators.positiveNumberValidator, Validators.max(100) ]
      ],
      questions: this.fb.array([]),
      type: { exam: 'courses', survey: 'surveys' }[this.examType],
      teamShareAllowed: false
    });
  }

  ngOnInit() {
    this.courseName = this.coursesService.course.form ? this.coursesService.course.form.courseTitle : '';
    if (this.route.snapshot.url[0].path !== 'update') {
      return;
    }
    this.successMessage = this.examType === 'survey' ? $localize`Survey updated successfully` : $localize`Test updated successfully`;
    forkJoin([
      this.couchService.get(this.dbName + '/' + this.route.snapshot.paramMap.get('id')),
      this.examType === 'survey' ?
        this.submissionsService.getSubmissions(findDocuments({ 'parent._id': this.route.snapshot.paramMap.get('id') })) :
        of([])
    ]).subscribe(([ exam, submissions ]) => {
      this.pageType = 'Update';
      this.documentInfo = { _rev: exam._rev, _id: exam._id };
      this.examForm.controls.name.setAsyncValidators(this.nameValidator(exam.name));
      this.examForm.patchValue(exam);
      this.initializeQuestions(exam.questions);
      if (submissions.length > 0) {
        this.pageType = 'Copy';
        this.documentInfo = {};
        this.examForm.patchValue({ name: this.examForm.value.name += ' - COPY' });
        this.examForm.controls.name.setAsyncValidators(this.nameValidator());
      }
    }, error => console.log(error));
  }

  onSubmit(reRoute = false) {
    if (this.examForm.valid) {
      if (this.teamId) {
        this.examForm.value.teamId = this.teamId;
      }
      this.showFormError = false;
      this.addExam(Object.assign({}, this.examForm.value, this.documentInfo), reRoute);
    } else {
      if (this.examForm.controls.name.invalid) {
        this.isQuestionsActive = false;
      }
      this.showErrorMessage();
    }
  }

  nameValidator(exception = '') {
    return ac => this.validatorService.isUnique$(
      this.dbName, 'name', ac, { exceptions: [ exception ], selectors: { type: this.examType } }
    );
  }

  showErrorMessage() {
    this.showFormError = true;
    this.examsService.checkValidFormComponent(this.examForm);
    this.stepClick(this.activeQuestionIndex);
  }

  addExam(examInfo, reRoute) {
    const date = this.couchService.datePlaceholder;
    const namePrefix = this.courseName || { exam: 'Exam', survey: 'Survey' }[this.examType];
    this.couchService.findAll(this.dbName,
      { selector: { type: this.examForm.value.type, name: { '$regex': namePrefix } } }
    ).pipe(switchMap((exams) => {
      examInfo.name = examInfo.name || this.newExamName(exams, namePrefix);
      return this.couchService.updateDocument(this.dbName, {
        createdDate: date,
        createdBy: this.userService.get().name,
        ...examInfo,
        updatedDate: date,
        sourcePlanet: this.stateService.configuration.code
      });
    })).subscribe((res) => {
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
    const courseExam = { ...info, ...this.documentInfo, totalMarks: type === 'exam' ? this.totalMarks(info) : undefined };
    this.coursesService.course.steps[this.coursesService.stepIndex][type] = courseExam;
  }

  totalMarks(examInfo) {
    return examInfo.questions.reduce((total: number, question: any) => total + question.marks, 0);
  }

  stepClick(index: number) {
    this.activeQuestionIndex = index;
    this.isQuestionsActive = index > -1;
    if (index > -1) {
      this.question = (<UntypedFormGroup>(<UntypedFormArray>this.examForm.get('questions')).at(index));
    }
  }

  initializeQuestions(questions: any[]) {
    questions.forEach((question) => {
      (<UntypedFormArray>this.examForm.controls.questions).push(this.examsService.newQuestionForm(this.examType === 'exam', question));
    });
  }

  addQuestion(type: string) {
    const questions = (<UntypedFormArray>this.examForm.get('questions'));
    questions.push(this.examsService.newQuestionForm(this.examType === 'exam', { type }));
    questions.updateValueAndValidity();
    this.planetStepListService.addStep(questions.length - 1);
    this.stepClick(questions.length - 1);
    this.showPreviewError = false;
  }

  removeQuestion(index) {
    (<UntypedFormArray>this.examForm.get('questions')).removeAt(index);
  }

  plainText(value) {
    markdownToPlainText(value);
  }

  goBack() {
    if (this.examType === 'survey' && !this.isCourseContent) {
      this.router.navigate([ this.pageType === 'Add' ? '../' : '../../' ], { relativeTo: this.route });
      return;
    }
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

  showPreviewDialog() {
    if (this.examForm.value.questions.length === 0) {
      this.showPreviewError = true;
      return;
    }
    if (!this.examForm.valid) {
      this.showErrorMessage();
      return;
    }
    this.dialog.open(ExamsPreviewComponent, { data: { exam: this.examForm.value, examType: this.examType }, minWidth: '75vw' });
  }

}
