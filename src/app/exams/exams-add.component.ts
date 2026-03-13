import { Component, OnInit, HostListener } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, FormArray, FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CoursesService } from '../courses/courses.service';
import { CustomValidators } from '../validators/custom-validators';
import { ExamsService, QuestionFormGroup } from './exams.service';
import { PlanetStepListService } from '../shared/forms/planet-step-list.component';
import { ExamsPreviewComponent } from './exams-preview.component';
import { markdownToPlainText } from '../shared/utils';
import { SubmissionsService } from './../submissions/submissions.service';
import { findDocuments } from '../shared/mangoQueries';
import { CanComponentDeactivate } from '../shared/unsaved-changes.guard';
import { warningMsg } from '../shared/unsaved-changes.component';

interface ExamFormControls {
  name: FormControl<string>;
  description: FormControl<string>;
  passingPercentage: FormControl<number>;
  questions: FormArray<QuestionFormGroup>;
  type: FormControl<'courses' | 'surveys'>;
  teamShareAllowed: FormControl<boolean>;
}

interface ExamInfo {
  name: string;
  description: string;
  passingPercentage: number;
  questions: Array<{ marks: number }>;
  type: 'courses' | 'surveys';
  teamShareAllowed: boolean;
  teamId?: string | null;
  _id?: string;
  _rev?: string;
}

interface ExamDocumentInfo {
  _id?: string;
  _rev?: string;
}

@Component({
  templateUrl: 'exams-add.component.html',
  styleUrls: [ 'exams-add.scss' ]
})
export class ExamsAddComponent implements OnInit, CanComponentDeactivate {
  readonly dbName = 'exams';
  hasUnsavedChanges = false;
  examForm!: FormGroup<ExamFormControls>;
  documentInfo: ExamDocumentInfo = {};
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
  private _question!: QuestionFormGroup;
  get question(): QuestionFormGroup {
    return this._question;
  }
  set question(newQuestion: QuestionFormGroup) {
    const question = this.questions.at(this.activeQuestionIndex);
    this.examsService.updateQuestion(question, newQuestion);
    this._question = newQuestion;
    this.examForm.controls.questions.updateValueAndValidity();
  }
  get questions(): FormArray<QuestionFormGroup> {
    return this.examForm.controls.questions;
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: NonNullableFormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private planetMessageService: PlanetMessageService,
    private coursesService: CoursesService,
    private examsService: ExamsService,
    private planetStepListService: PlanetStepListService,
    private dialog: MatDialog,
    private submissionsService: SubmissionsService
  ) {
    this.createForm();
  }

  createForm() {
    const examRecordType: 'courses' | 'surveys' = this.examType === 'exam' ? 'courses' : 'surveys';
    const nameControlOptions = this.isCourseContent ? undefined : {
      validators: [ CustomValidators.required ],
      asyncValidators: [ this.nameValidator() ]
    };
    this.examForm = this.fb.group<ExamFormControls>({
      name: this.fb.control('', nameControlOptions),
      description: this.fb.control(''),
      passingPercentage: this.fb.control(100, { validators: [ CustomValidators.positiveNumberValidator, Validators.max(100) ] }),
      questions: this.fb.array<QuestionFormGroup>([]),
      type: this.fb.control<'courses' | 'surveys'>(examRecordType),
      teamShareAllowed: this.fb.control(false)
    });
  }

  ngOnInit() {
    this.examForm.valueChanges.subscribe(() => {
      this.hasUnsavedChanges = true;
    });
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
        this.examForm.patchValue({ name: `${this.examForm.controls.name.value} - COPY` });
        this.examForm.controls.name.setAsyncValidators(this.nameValidator());
      }
      this.hasUnsavedChanges = false;
    }, error => console.log(error));
  }

  onSubmit(reRoute = false) {
    if (this.examForm.valid) {
      const formValue = this.examForm.getRawValue();
      const examInfo: ExamInfo = { ...formValue, ...(this.teamId ? { teamId: this.teamId } : {}) };
      this.showFormError = false;
      this.addExam({ ...examInfo, ...this.documentInfo }, reRoute);
    } else {
      if (this.examForm.controls.name.invalid) {
        this.isQuestionsActive = false;
      }
      this.showErrorMessage();
    }
  }

  nameValidator(exception = ''): AsyncValidatorFn {
    return (ac: AbstractControl) => this.validatorService.isUnique$(
      this.dbName, 'name', ac, { exceptions: [ exception ], selectors: { type: this.examType } }
    );
  }

  showErrorMessage() {
    this.showFormError = true;
    this.examsService.checkValidFormComponent(this.examForm);
    this.stepClick(this.activeQuestionIndex);
  }

  addExam(examInfo: ExamInfo, reRoute: boolean) {
    const namePrefix = this.courseName || { exam: 'Exam', survey: 'Survey' }[this.examType];
    this.couchService.findAll(this.dbName,
      { selector: { type: this.examForm.controls.type.value, name: { '$regex': namePrefix } } }
    ).pipe(switchMap((exams: Array<{ name: string }>) => {
      examInfo.name = examInfo.name || this.newExamName(exams, namePrefix);
      return this.examsService.createExamDocument(examInfo);
    })).subscribe((res) => {
      this.documentInfo = { _id: res.id, _rev: res.rev };
      this.hasUnsavedChanges = false;
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

  appendToCourse(info: ExamInfo, type: 'exam' | 'survey') {
    const courseExam = { ...info, ...this.documentInfo, totalMarks: type === 'exam' ? this.totalMarks(info) : undefined };
    this.coursesService.course.steps[this.coursesService.stepIndex][type] = courseExam;
  }

  totalMarks(examInfo: ExamInfo) {
    return examInfo.questions.reduce((total: number, question) => total + question.marks, 0);
  }

  stepClick(index: number) {
    this.activeQuestionIndex = index;
    this.isQuestionsActive = index > -1;
    if (index > -1) {
      this.question = this.questions.at(index);
    }
  }

  initializeQuestions(questions: Array<Record<string, unknown>>) {
    questions.forEach((question) => {
      this.questions.push(this.examsService.newQuestionForm(this.examType === 'exam', question));
    });
  }

  addQuestion(type: string) {
    this.questions.push(this.examsService.newQuestionForm(this.examType === 'exam', { type }));
    this.questions.updateValueAndValidity();
    this.planetStepListService.addStep(this.questions.length - 1);
    this.stepClick(this.questions.length - 1);
    this.showPreviewError = false;
  }

  removeQuestion(index: number) {
    this.questions.removeAt(index);
  }

  getQuestionLabel(value: unknown, index: number): string {
    const questionText = markdownToPlainText(value);
    return questionText || $localize`Question ${index + 1}`;
  }

  goBack() {
    if (this.examType === 'survey' && !this.isCourseContent) {
      this.router.navigate([ this.pageType === 'Add' ? '../' : '../../' ], { relativeTo: this.route });
      return;
    }
    this.router.navigateByUrl(this.returnUrl);
  }

  newExamName(existingExams: Array<{ name: string }>, namePrefix: string, nameNumber = 0) {
    const tryNumber = nameNumber || existingExams.length;
    const name = `${namePrefix} - ${tryNumber + 1}`;
    if (existingExams.findIndex((exam) => exam.name === name) === -1) {
      return name;
    }
    return this.newExamName(existingExams, namePrefix, tryNumber + 1);
  }

  @HostListener('window:beforeunload', [ '$event' ])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      $event.returnValue = warningMsg;
    }
  }

  canDeactivate(): boolean {
    return !this.hasUnsavedChanges;
  }

  showPreviewDialog() {
    if (this.questions.length === 0) {
      this.showPreviewError = true;
      return;
    }
    if (!this.examForm.valid) {
      this.showErrorMessage();
      return;
    }
    this.dialog.open(ExamsPreviewComponent, {
      data: { exam: this.examForm.getRawValue(), examType: this.examType },
      minWidth: '75vw'
    });
  }

}
