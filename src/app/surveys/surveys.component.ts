import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormGroup, FormControl, NonNullableFormBuilder, FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import {
  MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef,
  MatHeaderRow, MatRowDef, MatRow, MatNoDataRow
} from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { forkJoin, Observable, Subject, throwError, of } from 'rxjs';
import { catchError, finalize, switchMap, tap, takeUntil, shareReplay } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { ChatService } from '../shared/chat.service';
import { filterSpecificFields, sortNumberOrString, createDeleteArray } from '../shared/table-helpers';
import { SubmissionsService } from '../submissions/submissions.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { findByIdInArray, filterById } from '../shared/utils';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { UserService } from '../shared/user.service';
import { findDocuments } from '../shared/mangoQueries';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsAddTableComponent } from '../shared/dialogs/dialogs-add-table.component';
import { ExamsService } from '../exams/exams.service';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';
import { DatePipe } from '@angular/common';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatMiniFabButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButtonToggleGroup, MatButtonToggle } from '@angular/material/button-toggle';
import { AuthorizedRolesDirective } from '../shared/authorized-roles.directive';
import { PlanetLoadingSpinnerComponent } from '../shared/planet-loading-spinner.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';

interface SurveyFilterForm {
  includeQuestions: FormControl<boolean>;
  includeAnswers: FormControl<boolean>;
  includeCharts: FormControl<boolean>;
  includeAnalysis: FormControl<boolean>;
}

@Component({
  selector: 'planet-surveys',
  templateUrl: './surveys.component.html',
  styleUrls: ['./surveys.component.scss'],
  imports: [
    MatToolbar,
    MatIconButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatInput,
    MatMiniFabButton,
    MatButtonToggleGroup,
    FormsModule,
    MatButtonToggle,
    AuthorizedRolesDirective,
    MatButton,
    PlanetLoadingSpinnerComponent,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCheckbox,
    MatCellDef,
    MatCell,
    MatTooltip,
    MatSortHeader,
    RouterLink,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatNoDataRow,
    MatPaginator,
    DatePipe
  ]
})
export class SurveysComponent implements OnInit, AfterViewInit, OnDestroy {
  selection = new SelectionModel(true, []);
  surveys = new MatTableDataSource<any>();
  private renderedRows: any[] = [];
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @Output() surveyCount = new EventEmitter<number>();
  get displayedColumns() {
    const surveyColumns = this.teamSurveyMode ?
      [ 'name', 'taken', 'createdDate', 'action' ] :
      [ 'name', 'taken', 'courseTitle', 'createdDate', 'action' ];
    return (this.userService.doesUserHaveRole([ '_admin', 'manager' ]) ? [ 'select' ] : []).concat(surveyColumns);
  }
  dialogRef: MatDialogRef<DialogsAddTableComponent>;
  private onDestroy$ = new Subject<void>();
  readonly dbName = 'exams';
  isAuthorized = false;
  currentFilter = { viewMode: 'team' };
  allSurveys: any[] = [];
  deleteDialog: MatDialogRef<DialogsPromptComponent>;
  configuration = this.stateService.configuration;
  parentCount = 0;
  useDialogLoading = true;
  isLoading = true;
  isManagerRoute = this.router.url.startsWith('/manager/surveys');
  routeTeamId = this.route.parent?.snapshot.paramMap.get('teamId') || null;
  @Input() teamId?: string;
  availableAIProviders: any[] = [];
  deviceType: DeviceType;
  isMobile: boolean;
  private recordTeam$: Observable<any>;

  get teamSurveyMode() {
    return !!(this.teamId || this.routeTeamId);
  }

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
    private chatService: ChatService,
    private examsService: ExamsService,
    private fb: NonNullableFormBuilder,
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceInfoService.watchDeviceType().pipe(takeUntil(this.onDestroy$)).subscribe((deviceType) => {
      this.deviceType = deviceType;
      this.isMobile = deviceType === DeviceType.MOBILE || deviceType === DeviceType.SMALL_MOBILE;
    });
  }

  ngOnInit() {
    this.useDialogLoading = !this.teamId && !this.routeTeamId;
    if (this.useDialogLoading) {
      this.dialogsLoadingService.start();
    }
    this.surveys.filterPredicate = filterSpecificFields([ 'name' ]);
    this.surveys.sortingDataAccessor = sortNumberOrString;
    this.loadSurveys();
    this.couchService.checkAuthorization(this.dbName)
      .pipe(takeUntil(this.onDestroy$)).subscribe((isAuthorized) => this.isAuthorized = isAuthorized);
    this.surveys.connect().pipe(takeUntil(this.onDestroy$)).subscribe(surveys => {
      this.renderedRows = surveys;
      this.parentCount = surveys.filter(survey => survey.parent === true).length;
      this.surveyCount.emit(surveys.length);
    });
    this.chatService.listAIProviders().pipe(takeUntil(this.onDestroy$)).subscribe((providers) => {
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
      this.couchService.get('submissions/_design/surveyData/_view/submissionsByParent'),
      this.couchService.findAll('courses')
    ]).subscribe(([ allSurveys, viewResult, courses ]: any) => {
      const submissions = viewResult.rows;
      const teamSurveys = allSurveys.filter((survey: any) => survey.sourceSurveyId);
      const targetTeamId = this.teamId || this.routeTeamId;

      const submissionsBySurvey: Record<string, Array<{ status: string; teamId: string | null; parent?: any }>> = {};
      submissions.forEach(row => {
        const [baseSurveyId] = row.key;
        (submissionsBySurvey[baseSurveyId] ||= []).push(row.value);
      });

      const teamSurveysMap: Record<string, any[]> = {};
      teamSurveys.forEach(ts => {
        (teamSurveysMap[ts.sourceSurveyId] ||= []).push(ts);
      });

      const surveyCourseMap: Record<string, any> = {};
      courses.forEach(course => {
        if (course.steps && Array.isArray(course.steps)) {
          course.steps.forEach((step: any) => {
            if (step.survey && step.survey._id && !surveyCourseMap[step.survey._id]) {
              surveyCourseMap[step.survey._id] = course;
            }
          });
        }
      });

      this.allSurveys = [
        ...allSurveys.map((survey: any) => {
          const derivedTeamSurveys = teamSurveysMap[survey._id] || [];
          const teamIds = [
            ...new Set([
              survey.teamId,
              ...derivedTeamSurveys.map(ts => ts.teamId)
            ])
          ].filter(Boolean);

          const collectSubmissions = (surveyId: string) => submissionsBySurvey[surveyId] || [];
          const taken = [
            ...collectSubmissions(survey._id),
            ...derivedTeamSurveys.flatMap(ts => collectSubmissions(ts._id))
          ].filter(submission => submission.status === 'complete' && (!targetTeamId || submission.teamId === targetTeamId)).length;
          const course = surveyCourseMap[survey._id];

          return {
            ...survey,
            teamIds,
            course,
            courseTitle: course ? course.courseTitle : '',
            taken
          };
        }),
        ...this.createParentSurveys(submissions)
      ];
      this.applyViewModeFilter();
      this.isLoading = false;
      if (this.useDialogLoading) {
        this.dialogsLoadingService.stop();
      }
    }, () => {
      this.isLoading = false;
      if (this.useDialogLoading) {
        this.dialogsLoadingService.stop();
      }
    });
  }

  private applyViewModeFilter() {
    const targetTeamId = this.routeTeamId || this.teamId;
    this.surveys.data = this.allSurveys.filter(survey => {
      if (this.currentFilter.viewMode === 'team') {
        // team surveys: created by team, sent or adopted
        return targetTeamId ? survey.teamId === targetTeamId : !survey.sourceSurveyId;
      } else if (this.currentFilter.viewMode === 'adopt') {
        // community surveys that can be adopted & team hasn't adopted yet
        return !survey.sourceSurveyId && survey.teamShareAllowed === true && !survey.teamIds?.includes(targetTeamId);
      }
      // manager view: no team adopted/sent survey
      return !survey.teamId && !survey.sourceSurveyId;
    });
  }

  createParentSurveys(submissions) {
    return submissions.map(row => row.value).filter(submission => submission.parent).reduce((parentSurveys, submission) => {
      const parentSurvey = parentSurveys.find(nSurvey => nSurvey._id === submission.parent._id);
      if (parentSurvey) {
        parentSurvey.taken += submission.status !== 'pending' ? 1 : 0;
      } else if (submission.parent.sourcePlanet === this.stateService.configuration.parentCode) {
        parentSurveys = [ ...parentSurveys, {
          ...submission.parent,
          taken: submission.status !== 'pending' ? 1 : 0,
          parent: true,
          teamId: submission.teamId
        } ];
      }
      return parentSurveys;
    }, []);
  }

  goBack() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  routeToEditSurvey(route, id = '') {
    this.router.navigate([ route + '/' + id, { 'type': 'survey' } ], { relativeTo: this.route });
  }

  applyFilter(filterValue: string) {
    this.surveys.filter = filterValue;
    queueMicrotask(() => {
      const visibleSelection = new Set(this.renderedRows.map(row => row._id));
      this.selection.deselect(...this.selection.selected.filter(selectedId => !visibleSelection.has(selectedId)));
    });
  }

  isAllSelected() {
    const selectableRowsInPage = this.renderedRows.filter(row => this.isRowSelectable(row));
    return selectableRowsInPage.length > 0 && selectableRowsInPage.every(row => this.selection.isSelected(row._id));
  }

  isRowSelectable(row: any): boolean {
    return row.parent !== true && this.currentFilter.viewMode !== 'adopt';
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.renderedRows.forEach((row: any) => {
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
        this.couchService.findAll(
          'submissions',
          findDocuments(
            { 'status': 'pending', 'parentId': { '$regex': `^${survey._id}(@|$)` } },
            0
          )
        ).pipe(switchMap((submissions) => {
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
    this.deleteDialog.afterClosed().pipe(takeUntil(this.onDestroy$)).subscribe(() => {});
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

  private createTeamSurveyFromSource(sourceSurvey: any, team: { _id: string, name: string }): Observable<any> {
    const teamSurveyData = {
      name: `${sourceSurvey.name} - ${team.name}`,
      description: sourceSurvey.description,
      questions: sourceSurvey.questions,
      type: sourceSurvey.type,
      teamId: team._id,
      sourceSurveyId: sourceSurvey._id,
    };
    return this.examsService.createExamDocument(teamSurveyData);
  }

  openSendSurveyToTeamsDialog(survey) {
    const excludeIds = survey.teamIds || [];
    this.dialogRef = this.dialog.open(DialogsAddTableComponent, {
      width: '80vw',
      data: {
        okClick: (selection: any[]) => {
          this.dialogsLoadingService.start();
          forkJoin(selection.map(item => {
            return this.createTeamSurveyFromSource(survey, {
              _id: item.doc._id,
              name: item.doc.name
            });
          })).subscribe(() => {
            this.planetMessageService.showMessage($localize`Survey sent to teams`);
            this.dialogsLoadingService.stop();
            this.dialogRef.close();
            this.loadSurveys();
          }, () => {
            this.planetMessageService.showAlert($localize`Error sending survey to teams.`);
            this.dialogsLoadingService.stop();
          });
        },
        excludeIds: excludeIds,
        mode: 'teams'
      }
    });
  }

  adoptSurvey(survey) {
    this.couchService.get('teams/' + this.routeTeamId).subscribe(
      team => {
        this.createTeamSurveyFromSource(survey, {
          _id: team._id,
          name: team.name
        }).subscribe(() => {
          this.planetMessageService.showMessage($localize`Survey adopted`);
          this.loadSurveys();
        }, () => {
          this.planetMessageService.showAlert($localize`Error adopting survey.`);
        });
      },
      error => {
        this.planetMessageService.showAlert($localize`Error adopting survey: ${error.message}`);
      }
    );
  }

  sendSurvey(survey: any, users: any[]): Observable<void> {
    return this.submissionsService.sendSubmissionRequests(users, {
      'parentId': survey._id,
      'parent': survey
    }).pipe(
      tap(() => {
        this.planetMessageService.showMessage($localize`Survey requests sent`);
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

  private getRecordTeam(): Observable<any> {
    const targetTeamId = this.teamId || this.routeTeamId;
    if (!targetTeamId) {
      return of(null);
    }
    this.recordTeam$ = this.recordTeam$ || this.couchService.get('teams/' + targetTeamId).pipe(shareReplay(1));
    return this.recordTeam$;
  }

  recordSurvey(survey: any) {
    this.dialogsLoadingService.start();
    this.getRecordTeam().pipe(
      switchMap((team: any) => {
        const teamInfo = team ? { _id: team._id, name: team.name, type: team.type } : undefined;
        const { teamIds, taken, courseTitle, course, ...surveyInfo } = survey;
        return this.submissionsService.createSubmission(surveyInfo, 'survey', {}, teamInfo);
      }),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe((res: any) => {
      this.router.navigate([
        this.teamId ? 'surveys/dispense' : 'dispense',
        { questionNum: 1, submissionId: res.id, status: 'pending', mode: 'take', snap: this.route.snapshot.url }
      ], { relativeTo: this.route });
    }, () => {
      this.planetMessageService.showAlert($localize`There was a problem recording the survey.`);
    });
  }

  toggleSurveyPublicAccess(survey: any) {
    const nextPublicAccess = survey.publicAccess !== true;
    this.couchService.updateDocument(this.dbName, {
      ...survey,
      publicAccess: nextPublicAccess
    }).subscribe((res: any) => {
      this.updateSurveyState(survey._id, {
        publicAccess: nextPublicAccess,
        _rev: res.rev
      });
      this.applyViewModeFilter();
      this.planetMessageService.showMessage(
        nextPublicAccess ? $localize`Public link generated for this survey` : $localize`Public access disabled for this survey`
      );
    }, () => {
      this.planetMessageService.showAlert($localize`There was a problem updating public survey access.`);
    });
  }

  copyPublicSurveyLink(survey: any) {
    const targetTeamId = survey.teamId || this.teamId || this.routeTeamId;
    if (!targetTeamId || survey.publicAccess !== true) {
      this.planetMessageService.showAlert($localize`Generate a public link for this survey first.`);
      return;
    }

    const link = `${window.location.origin}/survey/${targetTeamId}/${survey._id}`;
    navigator.clipboard.writeText(link).then(() => {
      this.planetMessageService.showMessage($localize`Public survey link copied`);
    }).catch(() => {
      this.planetMessageService.showAlert($localize`Failed to copy public survey link`);
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

    const formGroup: FormGroup<SurveyFilterForm> = this.fb.group({
      includeQuestions: this.fb.control(true),
      includeAnswers: this.fb.control(true),
      includeCharts: this.fb.control(false),
      includeAnalysis: this.fb.control(false)
    });

    this.dialogsFormService.openDialogsForm(
      $localize`Records to Export`,
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
      formGroup,
      {
        autoFocus: true,
        disableIfInvalid: true,
        onSubmit: (options: { includeQuestions, includeAnswers, includeCharts, includeAnalysis }) => {
          this.dialogsFormService.closeDialogsForm();
          this.submissionsService.exportSubmissionsPdf(survey, 'survey', options, this.teamId || this.routeTeamId || '');
        },
        formOptions: {
          validators: (ac: FormGroup<SurveyFilterForm>) =>
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

  revokeSurveyPublicAccess(survey: any) {
    this.couchService.updateDocument(this.dbName, {
      ...survey,
      publicAccess: false
    }).subscribe((res: any) => {
      this.updateSurveyState(survey._id, {
        publicAccess: false,
        _rev: res.rev
      });
      this.applyViewModeFilter();
      this.planetMessageService.showMessage($localize`Public access disabled for this survey`);
    }, () => {
      this.planetMessageService.showAlert($localize`There was a problem updating public survey access.`);
    });
  }

  private updateSurveyState(surveyId: string, changes: Partial<any>) {
    this.allSurveys = this.allSurveys.map(item => item._id === surveyId ? { ...item, ...changes } : item);
    this.surveys.data = this.surveys.data.map(item => item._id === surveyId ? { ...item, ...changes } : item);
  }

  getActionTooltip(
    survey: any,
    action: 'select' | 'edit' | 'send' | 'record' | 'archive' | 'submissions' | 'export' | 'public' | 'revoke'
  ): string {
    if (survey.isArchived) {
      if (action === 'archive') {
        return $localize`Survey is already archived`;
      }
      return $localize`Survey is archived and cannot accept new actions`;
    }

    if (!survey.taken) {
      if (action === 'export') {
        return $localize`There is no data to export`;
      }
      if (action === 'submissions') {
        return $localize`There are no submissions to view`;
      }
    }

    if (action === 'select' && survey.parent === true) {
      return $localize`This survey was created on the parent planet and cannot be managed here`;
    }

    if (this.currentFilter.viewMode === 'adopt') {
      return $localize`This is a community survey`;
    }

    if (!survey.questions?.length) {
      return $localize`Survey has no questions`;
    }

    if (action === 'record') {
      return this.isManagerRoute
        ? $localize`Record survey information from a person who is not a member of ${this.configuration.name}`
        : $localize`Record Survey`;
    }

    if (action === 'public') {
      return survey.publicAccess === true ? $localize`Copy the public survey link` : $localize`Generate a public survey link`;
    }

    if (action === 'revoke') {
      return $localize`Revoke public access for this survey`;
    }

    return '';
  }

}
