import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin, Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import {
  filterSpecificFields, sortNumberOrString, createDeleteArray, selectedOutOfFilter
} from '../shared/table-helpers';
import { SubmissionsService } from '../submissions/submissions.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { SelectionModel } from '@angular/cdk/collections';
import { findByIdInArray, filterById, itemsShown } from '../shared/utils';
import { debug } from '../debug-operator';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { UserService } from '../shared/user.service';
import { findDocuments } from '../shared/mangoQueries';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsAddTableComponent } from '../shared/dialogs/dialogs-add-table.component';

@Component({
  selector: 'planet-surveys',
  templateUrl: './surveys.component.html',
  styleUrls: [ './surveys.component.scss' ]
})
export class SurveysComponent implements OnInit, AfterViewInit, OnDestroy {
  selection = new SelectionModel(true, []);
  surveys = new MatTableDataSource<any>();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = (this.userService.doesUserHaveRole([ '_admin', 'manager' ]) ? [ 'select' ] : []).concat(
    [ 'name', 'taken', 'courseTitle', 'createdDate', 'action' ]
  );
  dialogRef: MatDialogRef<DialogsAddTableComponent>;
  private onDestroy$ = new Subject<void>();
  readonly dbName = 'exams';
  isAuthorized = false;
  deleteDialog: any;
  message = '';
  configuration = this.stateService.configuration;
  parentCount = 0;
  routeTeamId = this.route.parent?.snapshot.paramMap.get('teamId') || null;
  @Input() teamId?: string;

  constructor(
    private couchService: CouchService,
    private submissionsService: SubmissionsService,
    private planetMessageService: PlanetMessageService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private stateService: StateService,
    private dialogsLoadingService: DialogsLoadingService,
    private userService: UserService,
    private dialogsFormService: DialogsFormService
  ) {
    this.dialogsLoadingService.start();
  }

  ngOnInit() {
    this.surveys.filterPredicate = filterSpecificFields([ 'name' ]);
    this.surveys.sortingDataAccessor = sortNumberOrString;
    const receiveData = (dbName: string, type: string) => this.couchService.findAll(dbName, findDocuments({ 'type': type }));
    forkJoin([
      receiveData('exams', 'surveys'),
      receiveData('submissions', 'survey'),
      this.couchService.findAll('courses')
    ]).subscribe(([ surveys, submissions, courses ]: any) => {
      const findSurveyInSteps = (steps, survey) => steps.findIndex((step: any) => step.survey && step.survey._id === survey._id);
      this.surveys.data = [
        ...surveys.map((survey: any) => {
          const relatedSubmissions = submissions.filter(sub => sub.parentId === survey._id);
          const teamIds = [
            ...new Set([
              survey.teamId,
              ...relatedSubmissions.map(sub => sub.user?.membershipDoc?.teamId)
            ])
          ].filter(Boolean);
          return {
            ...survey,
            teamIds: teamIds,
            course: courses.find((course: any) => findSurveyInSteps(course.steps, survey) > -1),
            taken: relatedSubmissions.filter(data => data.status !== 'pending').length
          };
        }),
        ...this.createParentSurveys(submissions)
      ].filter(survey => {
        const targetTeamId = this.routeTeamId || this.teamId;
        return targetTeamId ? survey.teamId === targetTeamId || survey.teamIds?.includes(targetTeamId) : true;
      });
      this.surveys.data = this.surveys.data.map((data: any) => ({ ...data, courseTitle: data.course ? data.course.courseTitle : '' }));
      this.dialogsLoadingService.stop();
    });
    this.couchService.checkAuthorization(this.dbName).subscribe((isAuthorized) => this.isAuthorized = isAuthorized);
    this.surveys.connect().subscribe(surveys => this.parentCount = surveys.filter(survey => survey.parent === true).length);
  }

  ngAfterViewInit() {
    this.surveys.sort = this.sort;
    this.surveys.paginator = this.paginator;
  }

  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  createParentSurveys(submissions) {
    return submissions.filter(submission => submission.parent).reduce((parentSurveys, submission) => {
      const parentSurvey = parentSurveys.find(nSurvey => nSurvey._id === submission.parent._id);
      if (parentSurvey) {
        parentSurvey.taken = parentSurvey.taken + (submission.status !== 'pending' ? 1 : 0);
      } else if (submission.parent.sourcePlanet === this.stateService.configuration.parentCode) {
        return [ ...parentSurveys, {
          ...submission.parent,
          taken: submission.status !== 'pending' ? 1 : 0,
          parent: true,
          teamId: submission.user?.membershipDoc?.teamId
        } ];
      }
      return parentSurveys;
    }, []);
  }

  goBack() {
    this.router.navigate([ '../../' ], { relativeTo: this.route });
  }

  routeToEditSurvey(route, id = '') {
    this.router.navigate([ route + '/' + id, { 'type': 'survey' } ], { relativeTo: this.route });
  }

  applyFilter(filterValue: string) {
    this.surveys.filter = filterValue;
    this.selection.deselect(...selectedOutOfFilter(this.surveys.filteredData, this.selection, this.paginator));
  }

  isAllSelected() {
    return this.selection.selected.length === (itemsShown(this.paginator) - this.parentCount);
  }

  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.surveys.filteredData.slice(start, end).forEach((row: any) => {
        if (row.parent !== true) {
          this.selection.select(row._id);
        }
      });
    }
  }

  deleteSelected() {
    const selected = this.selection.selected.map(surveyId => findByIdInArray(this.surveys.data, surveyId));
    if (selected.length === 1) {
      const survey = selected[0];
      this.openDeleteDialog(this.deleteSurvey(survey), 'single', survey.name);
    } else {
      this.openDeleteDialog(this.deleteSurveys(selected), 'many', '');
    }
  }

  deleteSurveys(surveys) {
    const deleteArray = createDeleteArray(surveys);
    return {
      request: forkJoin([
        this.couchService.bulkDocs(this.dbName, deleteArray),
        ...surveys.reduce(this.submissionDeleteReq.bind(this), [])
      ]),
      onNext: () => {
        this.surveys.data = this.surveys.data.filter((survey: any) => findByIdInArray(deleteArray, survey._id) === undefined);
        this.selection.clear();
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`You have deleted ${deleteArray.length} surveys`);
      },
      onError: () => this.planetMessageService.showAlert($localize`There was a problem deleting survey.`)
    };
  }

  deleteSurvey(survey) {
    const { _id: surveyId, _rev: surveyRev } = survey;
    return {
      request: forkJoin([
        this.couchService.delete(this.dbName + '/' + surveyId + '?rev=' + surveyRev),
        ...this.submissionDeleteReq([], survey)
      ]),
      onNext: () => {
        this.selection.deselect(survey._id);
        this.surveys.data = filterById(this.surveys.data, survey._id);
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`Survey deleted: ${survey.name}`);
      },
      onError: () => this.planetMessageService.showAlert($localize`There was a problem deleting this survey.`)
    };
  }

  submissionDeleteReq(requests, survey) {
    if (survey.sourcePlanet === this.stateService.configuration.code) {
      requests.push(
        this.couchService.findAll('submissions', findDocuments({ 'status': 'pending', 'parentId': survey._id }, 0 ))
        .pipe(switchMap((submissions) => {
          const submissionArray = createDeleteArray(submissions);
          return this.couchService.bulkDocs('submissions', submissionArray);
        }))
      );
    }
    return requests;
  }

  openDeleteDialog(okClick, amount, displayName = '') {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick,
        amount,
        changeType: 'delete',
        type: 'survey',
        displayName
      }
    });
    this.deleteDialog.afterClosed().pipe(debug('Closing dialog')).subscribe(() => {
      this.message = '';
    });
  }

  openSendSurveyToUsersDialog(survey) {
    this.submissionsService.getSubmissions(
      findDocuments({ type: 'survey', 'parent._rev': survey._rev, 'parent._id': survey._id })
    ).subscribe((submissions: any[]) => {
      const excludeIds = submissions.map((submission: any) => submission.user._id);
      this.dialogRef = this.dialog.open(DialogsAddTableComponent, {
        width: '80vw',
        data: {
          okClick: (selection: any[]) => this.sendSurvey(survey, selection),
          excludeIds: [ ...excludeIds, this.userService.get()._id ],
          mode: 'users'
        }
      });
    });
  }

  openSendSurveyToTeamsDialog(survey) {
    this.submissionsService.getSubmissions(
      findDocuments({ type: 'survey', 'parent._rev': survey._rev, 'parent._id': survey._id })
    ).subscribe((submissions: any[]) => {
      const excludeIds = submissions.map((submission: any) => submission.teamId);
      this.dialogRef = this.dialog.open(DialogsAddTableComponent, {
        width: '80vw',
        data: {
          okClick: (selection: any[]) => this.sendSurvey(survey, selection),
          excludeIds: [ ...excludeIds ],
          mode: 'teams'
        }
      });
    });
  }

  sendSurvey(survey: any, users: any[]) {
    this.submissionsService.sendSubmissionRequests(users, {
      'parentId': survey._id, 'parent': survey }
    ).subscribe(() => {
      this.planetMessageService.showMessage($localize`Survey requests sent`);
      this.dialogsLoadingService.stop();
      this.dialogRef.close();
    });
  }

  recordSurvey(survey: any) {
    this.submissionsService.createSubmission(survey, 'survey').subscribe((res: any) => {
      this.router.navigate([
        this.teamId ? 'surveys/dispense' : 'dispense',
        { questionNum: 1, submissionId: res.id, status: 'pending', mode: 'take' }
      ], { relativeTo: this.route });
    });
  }

  exportCSV(survey) {
    this.submissionsService.exportSubmissionsCsv(survey, 'survey').subscribe(res => {
      if (!res.length) {
        this.planetMessageService.showMessage($localize`There is no survey response`);
      }
    });
  }

  exportPdf(survey) {
    this.dialogsFormService.openDialogsForm(
      'Records to Export',
      [
        { name: 'includeQuestions', placeholder: $localize`Include Questions`, type: 'checkbox' },
        { name: 'includeAnswers', placeholder: $localize`Include Answers`, type: 'checkbox' }
      ],
      { includeQuestions: true, includeAnswers: true },
      {
        autoFocus: true,
        disableIfInvalid: true,
        onSubmit: (options: { includeQuestions, includeAnswers}) => {
          this.dialogsFormService.closeDialogsForm();
          this.submissionsService.exportSubmissionsPdf(survey, 'survey', options);
        },
        formOptions: {
          validator: (ac: FormGroup) => Object.values(ac.controls).some(({ value }) => value) ? null : { required: true }
        }
      }
    );
  }

}
