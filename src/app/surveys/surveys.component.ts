import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog, MatDialogRef, PageEvent } from '@angular/material';
import { forkJoin, Subject, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { filterSpecificFields, sortNumberOrString, createDeleteArray, removeFilteredFromSelection } from '../shared/table-helpers';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { SubmissionsService } from '../submissions/submissions.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { SelectionModel } from '@angular/cdk/collections';
import { findByIdInArray, filterById, itemsShown } from '../shared/utils';
import { debug } from '../debug-operator';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { UserService } from '../shared/user.service';
import { ReportsService } from '../manager-dashboard/reports/reports.service';

@Component({
  'templateUrl': './surveys.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-select {
      max-width: 44px;
    }
    .mat-column-taken {
      max-width: 150px;
    }
    .mat-column-createdDate {
      max-width: 130px;
    }
    .course-title {
      max-width: 200px;
      display: inline-block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 15px;
      position: relative;
    }
  ` ]
})
export class SurveysComponent implements OnInit, AfterViewInit, OnDestroy {
  selection = new SelectionModel(true, []);
  surveys = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'name', 'taken', 'courseTitle', 'createdDate', 'action' ];
  dialogRef: MatDialogRef<DialogsListComponent>;
  private onDestroy$ = new Subject<void>();
  readonly dbName = 'exams';
  emptyData = false;
  isAuthorized = false;
  deleteDialog: any;
  message = '';

  constructor(
    private couchService: CouchService,
    private dialogsListService: DialogsListService,
    private submissionsService: SubmissionsService,
    private planetMessageService: PlanetMessageService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private stateService: StateService,
    private dialogsLoadingService: DialogsLoadingService,
    private userService: UserService,
    private reportsService: ReportsService
  ) {
    this.dialogsLoadingService.start();
  }

  ngOnInit() {
    if (this.userService.doesUserHaveRole([ '_admin', 'manager' ])) {
      this.displayedColumns.unshift('select');
    }
    this.surveys.filterPredicate = filterSpecificFields([ 'name' ]);
    this.surveys.sortingDataAccessor = sortNumberOrString;
    forkJoin([
      this.receiveData('exams', 'surveys'),
      this.receiveData('submissions', 'survey'),
      this.couchService.findAll('courses')
    ]).subscribe(([ surveys, submissions, courses ]: any) => {
      const findSurveyInSteps = (steps, survey) => steps.findIndex((step: any) => step.survey && step.survey._id === survey._id);
      this.surveys.data = surveys.map(
        (survey: any) => ({
          ...survey,
          course: courses.find((course: any) => findSurveyInSteps(course.steps, survey) > -1),
          taken: submissions.filter(data => {
            return data.parentId.match(survey._id) && data.status !== 'pending';
          }).length
        })
      );
      this.surveys.data = this.surveys.data.map((data: any) => ({ ...data, courseTitle: data.course ? data.course.courseTitle : '' }));
      this.emptyData = !this.surveys.data.length;
      this.dialogsLoadingService.stop();
    });
    this.couchService.checkAuthorization(this.dbName).subscribe((isAuthorized) => this.isAuthorized = isAuthorized);
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

  receiveData(dbName: string, type: string) {
    return this.couchService.findAll(dbName, { 'selector': { 'type': type } });
  }

  goBack() {
    this.router.navigate([ '../' ], { relativeTo: this.route });
  }

  routeToEditSurvey(route, id = '') {
    this.router.navigate([ route + '/' + id, { 'type': 'survey' } ], { relativeTo: this.route });
  }

  applyFilter(filterValue: string) {
    this.surveys.filter = filterValue;
    removeFilteredFromSelection(this.paginator, this.surveys.filteredData, this.selection);
  }

  isAllSelected() {
    return this.selection.selected.length === itemsShown(this.paginator);
  }

  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.surveys.filteredData.slice(start, end).forEach((row: any) => this.selection.select(row._id));
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
      request: this.couchService.bulkDocs(this.dbName, deleteArray),
      onNext: () => {
        this.surveys.data = this.surveys.data.filter((survey: any) => findByIdInArray(deleteArray, survey._id) === undefined);
        this.selection.clear();
        this.deleteDialog.close();
        this.planetMessageService.showMessage('You have deleted ' + deleteArray.length + ' surveys');
      },
      onError: () => this.planetMessageService.showAlert('There was a problem deleting survey.')
    };
  }

  deleteSurvey(survey) {
    const { _id: surveyId, _rev: surveyRev } = survey;
    return {
      request: this.couchService.delete(this.dbName + '/' + surveyId + '?rev=' + surveyRev),
      onNext: () => {
        this.selection.deselect(survey._id);
        this.surveys.data = filterById(this.surveys.data, survey._id);
        this.deleteDialog.close();
        this.planetMessageService.showMessage('Survey deleted: ' + survey.name);
      },
      onError: () => this.planetMessageService.showAlert('There was a problem deleting this survey.')
    };
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

  openSendSurveyDialog(survey) {
    this.getUserData(this.requestUsers()).subscribe((userData: {tableData: [], columns: []}) => {
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: {
          ...userData,
          allowMulti: true,
          itemDescription: 'members',
          nameProperty: 'name',
          okClick: this.sendSurvey(survey).bind(this),
          dropdownSettings: {
            field: 'planetCode', startingValue: { value: this.stateService.configuration.code, text: 'Local' }
          },
          filterPredicate: filterSpecificFields([ 'name' ])
        },
        height: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

  requestUsers() {
    return forkJoin([
      this.dialogsListService.getListAndColumns('_users'),
      this.dialogsListService.getListAndColumns('child_users'),
      this.couchService.findAll('communityregistrationrequests')
    ]);
  }

  getUserData(obs: any) {
    return obs.pipe(switchMap(([ users, childUsers, children ]) => {
      children = this.reportsService.attachNamesToPlanets(children);
      return of({
        tableData: [
          ...users.tableData,
          ...childUsers.tableData.filter((user: any) => {
            const planet = children.find((child: any) => user.planetCode === child.doc.code);
            return planet && planet.registrationRequest !== 'pending';
          })
        ],
        columns: [ ...childUsers.columns ],
        labels: children.reduce((labelObj, child) =>
          ({ ...labelObj, [child.doc.code]: child.nameDoc ? child.nameDoc.name : child.doc.name }),
          {}
        )
      });
    }));
  }

  sendSurvey(survey: any) {
    return (selectedUsers: string[]) => {
      this.submissionsService.sendSubmissionRequests(selectedUsers, {
        'parentId': survey._id, 'parent': survey }
      ).subscribe(() => {
        this.planetMessageService.showMessage('Survey requests sent');
        this.dialogRef.close();
      });
    };
  }

  recordSurvey(survey: any) {
    this.submissionsService.createSubmission(survey, 'survey').subscribe((res: any) => {
      this.router.navigate([
        'dispense',
        { questionNum: 1, submissionId: res.id, status: 'pending', mode: 'take' }
      ], { relativeTo: this.route });
    });
  }

}
