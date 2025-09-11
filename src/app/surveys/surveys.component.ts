import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, FormControl } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { forkJoin, Observable, Subject, throwError, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { ChatService } from '../shared/chat.service';
import { filterSpecificFields, sortNumberOrString, createDeleteArray, selectedOutOfFilter } from '../shared/table-helpers';
import { SubmissionsService } from '../submissions/submissions.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { findByIdInArray, filterById } from '../shared/utils';
import { debug } from '../debug-operator';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { UserService } from '../shared/user.service';
import { findDocuments } from '../shared/mangoQueries';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsAddTableComponent } from '../shared/dialogs/dialogs-add-table.component';

interface SurveyFilterForm {
  includeQuestions: FormControl<boolean | null>;
  includeAnswers: FormControl<boolean | null>;
  includeCharts: FormControl<boolean | null>;
  includeAnalysis: FormControl<boolean | null>;
}

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
  @Output() surveyCount = new EventEmitter<number>();
  displayedColumns = (this.userService.doesUserHaveRole([ '_admin', 'manager' ]) ? [ 'select' ] : []).concat(
    [ 'name', 'taken', 'courseTitle', 'createdDate', 'action' ]
  );
  dialogRef: MatDialogRef<DialogsAddTableComponent>;
  private onDestroy$ = new Subject<void>();
  readonly dbName = 'exams';
  isAuthorized = false;
  currentFilter = { viewMode: 'team' };
  allSurveys: any[] = [];
  deleteDialog: any;
  message = '';
  configuration = this.stateService.configuration;
  parentCount = 0;
  isLoading = true;
  isManagerRoute = this.router.url.startsWith('/manager/surveys');
  routeTeamId = this.route.parent?.snapshot.paramMap.get('teamId') || null;
  @Input() teamId?: string;
  availableAIProviders: any[] = [];

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
    private dialogsFormService: DialogsFormService,
    private chatService: ChatService
  ) {
    this.dialogsLoadingService.start();
  }

  ngOnInit() {
    this.surveys.filterPredicate = filterSpecificFields([ 'name' ]);
    this.surveys.sortingDataAccessor = sortNumberOrString;
    this.loadSurveys();
    this.couchService.checkAuthorization(this.dbName).subscribe((isAuthorized) => this.isAuthorized = isAuthorized);
    this.surveys.connect().subscribe(surveys => {
      this.parentCount = surveys.filter(survey => survey.parent === true).length;
      this.surveyCount.emit(surveys.length);
    });
    this.chatService.listAIProviders().subscribe((providers) => {
      this.availableAIProviders = providers;
    });
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

  private loadSurveys() {
    this.isLoading = true;
    const receiveData = (dbName: string, type: string) => this.couchService.findAll(dbName, findDocuments({ 'type': type }));
    forkJoin([
      receiveData('exams', 'surveys'),
      receiveData('submissions', 'survey'),
      this.couchService.findAll('courses')
    ]).subscribe(([ surveys, submissions, courses ]: any) => {
      const findSurveyInSteps = (steps, survey) => steps.findIndex((step: any) => step.survey && step.survey._id === survey._id);
      this.allSurveys = [
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
            taken: this.teamId || this.routeTeamId
              ? relatedSubmissions.filter(
                (data) => data.status === 'complete' &&
                (data.team === this.teamId || data.team === this.routeTeamId)).length
              : relatedSubmissions.filter(data => data.status === 'complete').length
          };
        }),
        ...this.createParentSurveys(submissions)
      ];
      this.applyViewModeFilter();
      this.surveys.data = this.surveys.data.map((data: any) => ({ ...data, courseTitle: data.course ? data.course.courseTitle : '' }));
      this.dialogsLoadingService.stop();
      this.isLoading = false;
    });
  }

  private applyViewModeFilter() {
    const targetTeamId = this.routeTeamId || this.teamId;
    this.surveys.data = this.allSurveys.filter(survey => {
      if (this.currentFilter.viewMode === 'team') {
        return targetTeamId ? survey.teamId === targetTeamId || survey.teamIds?.includes(targetTeamId) : true;
      } else if (this.currentFilter.viewMode === 'adopt') {
        return survey.teamShareAllowed === true && !survey.teamIds?.includes(targetTeamId);
      }
      return true;
    });
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
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;

    const selectableRowsInPage = this.surveys.filteredData
      .slice(start, end)
      .filter(row => this.isRowSelectable(row));

    return selectableRowsInPage.every(row => this.selection.isSelected(row._id));
  }

  isRowSelectable(row: any): boolean {
    const isDisabled = (row.teamId && this.isManagerRoute) || (!this.isManagerRoute && !row.teamId);
    return row.parent !== true && !isDisabled;
  }

  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.surveys.filteredData.slice(start, end).forEach((row: any) => {
        if (this.isRowSelectable(row)) {
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
          okClick: (selection: any[]) => {
            this.dialogsLoadingService.start();
            this.sendSurvey(survey, selection).subscribe(() => {
              this.dialogsLoadingService.stop();
            });
          },
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
      const submissionIds = submissions.map((submission: any) => submission.user.membershipDoc?.teamId);
      const excludeIds = survey.teamId ? [ ...submissionIds, survey.teamId ] : submissionIds;
      this.dialogRef = this.dialog.open(DialogsAddTableComponent, {
        width: '80vw',
        data: {
          okClick: (selection: any[]) => {
            this.dialogsLoadingService.start();
            this.sendSurvey(survey, selection).subscribe(() => {
              this.dialogsLoadingService.stop();
            });
          },
          excludeIds: [ ...excludeIds ],
          mode: 'teams'
        }
      });
    });
  }

  adoptSurvey(survey) {
    this.couchService.get('teams/' + this.routeTeamId).subscribe(
      team => {
        const selection = {
          doc: team,
          membershipDoc: { teamId: this.routeTeamId }
        };
        this.sendSurvey(survey, [ selection ], true).subscribe(() => {
          this.loadSurveys();
        });
      },
      error => {
        this.planetMessageService.showAlert($localize`Error adopting survey: ${error.message}`);
      }
    );
  }

  sendSurvey(survey: any, users: any[], isAdopt: boolean = false): Observable<void> {
    return this.submissionsService.sendSubmissionRequests(users, {
      'parentId': survey._id,
      'parent': survey
    }).pipe(
      tap(() => {
        const message = isAdopt ? $localize`Survey adopted` : $localize`Survey requests sent`;
        this.planetMessageService.showMessage(message);
        if (this.dialogRef) {
          this.dialogRef.close();
        }
      }),
      catchError(error => {
        this.planetMessageService.showAlert($localize`Error sending survey requests.`);
        this.dialogsLoadingService.stop();
        return throwError(error);
      })
    );
  }

  recordSurvey(survey: any) {
    this.submissionsService.createSubmission(survey, 'survey', {}, this.teamId || this.routeTeamId || '' ).subscribe((res: any) => {
      this.router.navigate([
        this.teamId ? 'surveys/dispense' : 'dispense',
        { questionNum: 1, submissionId: res.id, status: 'pending', mode: 'take', snap: this.route.snapshot.url }
      ], { relativeTo: this.route });
    });
  }

  exportCSV(survey) {
    this.submissionsService.exportSubmissionsCsv(survey, 'survey', this.teamId || this.routeTeamId || '').subscribe(res => {
      if (!res.length) {
        this.planetMessageService.showMessage($localize`There is no survey response`);
      }
    });
  }

  exportPdf(survey) {
    const hasChartableData = survey.questions.some(
      (question) => question.type === 'select' || question.type === 'selectMultiple' || question.type === 'ratingScale');
    const chatDisabled = this.availableAIProviders.length === 0;

    this.dialogsFormService.openDialogsForm(
      'Records to Export',
      [
        { name: 'includeQuestions', placeholder: $localize`Include Questions`, type: 'checkbox' },
        { name: 'includeAnswers', placeholder: $localize`Include Answers`, type: 'checkbox' },
        { name: 'includeCharts', placeholder: $localize`Include Charts`, type: 'checkbox', disabled: !hasChartableData },
        {
          name: 'includeAnalysis',
          placeholder: $localize`Include AI Analysis`,
          type: 'checkbox',
          planetBeta: true,
          disabled: chatDisabled,
          tooltip: chatDisabled && $localize`AI analysis is disabled, contact community admin`
        }
      ],
      { includeQuestions: true, includeAnswers: true, includeCharts: false, includeAnalysis: false },
      {
        autoFocus: true,
        disableIfInvalid: true,
        onSubmit: (options: { includeQuestions, includeAnswers, includeCharts, includeAnalysis }) => {
          this.dialogsFormService.closeDialogsForm();
          this.submissionsService.exportSubmissionsPdf(survey, 'survey', options, this.teamId || this.routeTeamId || '');
        },
        formOptions: {
          validator: (ac: FormGroup<SurveyFilterForm>) =>
            Object.values(ac.controls).some(control => control.value) ? null : { required: true }
        }
      }
    );
  }

  archiveSurvey(survey) {
    const archiveSurvey = this.couchService.updateDocument(this.dbName, {
      ...survey,
      isArchived: true,
    }).pipe(
      switchMap(() => {
        this.planetMessageService.showMessage($localize`Survey archived: ${survey.name}`);
        this.surveys.data = this.surveys.data.map((s) =>
          s._id === survey._id ? { ...s, isArchived: true } : s
        );

        const submissionRequests = this.submissionDeleteReq([], survey).map((req) =>
          req.pipe(
            catchError((err) => throwError(err))
          )
        );

        return forkJoin(submissionRequests);
      }),
      catchError((err) => {
        this.planetMessageService.showAlert($localize`There was a problem archiving this survey or deleting submissions.`);
        return throwError(err);
      })
    );

    const archiveDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: archiveSurvey,
          onNext: () => archiveDialog.close()
        },
        changeType: 'archive',
        type: 'survey',
        displayName: survey.name
      }
    });
  }

  toggleSurveysView(): void {
    this.applyViewModeFilter();
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  viewSurveySubmissions(survey: any): void {
    this.router.navigate([ survey._id, { type: 'survey' } ], { relativeTo: this.route });
  }

}
