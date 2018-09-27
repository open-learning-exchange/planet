import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog, MatDialogRef } from '@angular/material';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { filterSpecificFields, sortNumberOrString } from '../shared/table-helpers';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { SubmissionsService } from '../submissions/submissions.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';

@Component({
  'templateUrl': './surveys.component.html'
})
export class SurveysComponent implements OnInit, AfterViewInit {

  surveys = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'name', 'taken', 'action' ];
  dialogRef: MatDialogRef<DialogsListComponent>;

  constructor(
    private couchService: CouchService,
    private dialogsListService: DialogsListService,
    private submissionsService: SubmissionsService,
    private planetMessageService: PlanetMessageService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.surveys.filterPredicate = filterSpecificFields([ 'name' ]);
    this.surveys.sortingDataAccessor = sortNumberOrString;
    this.getSurveys().pipe(switchMap(data => {
        this.surveys.data = data;
        return this.getSubmissions();
      }))
      .subscribe((submissions: any) => {
        this.surveys.data = this.surveys.data.map(
          (survey: any) => ({ ...survey, taken: submissions.filter(data => data.parentId === survey._id).length })
        );
      });
  }

  ngAfterViewInit() {
    this.surveys.sort = this.sort;
    this.surveys.paginator = this.paginator;
  }

  getSurveys() {
    return this.couchService.findAll('exams', { 'selector': { 'type': 'surveys' } });
  }

  getSubmissions() {
    // get the no of submisson for each test from submisson table
    return this.couchService.findAll('submissions', { 'selector': { 'type': 'survey' } });
  }

  goBack() {
    this.router.navigate([ '/manager' ]);
  }

  routeToEditSurvey(route, id = '') {
    this.router.navigate([ route + '/' + id, { 'type': 'surveys' } ], { relativeTo: this.route });
  }

  applyFilter(filterValue: string) {
    this.surveys.filter = filterValue;
  }

  openSendSurveyDialog(survey) {
    forkJoin([
      this.dialogsListService.getListAndColumns('_users'),
      this.dialogsListService.getListAndColumns('child_users')
    ]).subscribe(responses => {
      const response = responses.reduce((fullArray, array) => ({
        tableData: [ ...fullArray.tableData, ...array.tableData ],
        columns: [ ...array.columns ]
      }), { tableData: [], columns: [] });
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: {
          ...response,
          allowMulti: true,
          okClick: this.sendSurvey(survey).bind(this),
          dropdownSettings: {
            field: 'planetCode', startingValue: { value: this.userService.getConfig().code, text: 'Local' },
          },
          filterPredicate: filterSpecificFields([ 'name' ])
        },
        height: '500px',
        width: '600px',
        autoFocus: false
      });
    });
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
