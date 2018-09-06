import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MatPaginator, MatTableDataSource, MatSort, MatDialog } from '@angular/material';
import { filterSpecificFields, composeFilterFunctions, filterDropdowns } from '../shared/table-helpers';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { SubmissionsService } from './submissions.service';
import { UserService } from '../shared/user.service';
import { findDocuments } from '../shared/mangoQueries';

@Component({
  templateUrl: './submissions.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-name {
      max-width: 25vw;
    }
    mat-row {
      cursor: pointer;
    }
  ` ]
})
export class SubmissionsComponent implements OnInit, AfterViewInit, OnDestroy {

  submissions = new MatTableDataSource();
  readonly dbName = 'meetups';
  onDestroy$ = new Subject<void>();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns = [ 'name', 'status', 'user', 'time' ];
  mode = 'grade';
  emptyData = false;
  filter = {
    type: 'exam'
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private submissionsService: SubmissionsService,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.mode = this.route.snapshot.data.mySurveys === true ? 'survey' : 'grade';
    let query: any;
    if (this.mode === 'survey') {
      query = findDocuments({ 'user.name': this.userService.get().name, type: 'survey' });
    }
    this.submissionsService.submissionsUpdated$.pipe(takeUntil(this.onDestroy$))
    .subscribe((submissions) => {
      this.submissions.data = submissions.map(submission => ({
        ...submission, submittedBy: submission.user.name || (submission.user.firstName + ' ' + submission.user.lastName).trim()
      }));
      this.emptyData = !this.submissions.data.length;
      this.applyFilter('');
    });
    this.submissionsService.updateSubmissions({ query });
    this.submissions.filterPredicate = composeFilterFunctions([ filterDropdowns(this.filter), filterSpecificFields([ 'parent.name' ]) ]);
    this.submissions.sortingDataAccessor = (item, property) => item[property].toLowerCase();
  }

  ngAfterViewInit() {
    this.submissions.paginator = this.paginator;
    this.submissions.sort = this.sort;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  applyFilter(filterValue: string) {
    this.submissions.filter = filterValue || this.dropdownsFill();
  }

  onFilterChange(filterValue: string, field: string) {
    this.filter[field] = filterValue;
    // Force filter to update by setting it to a space if empty
    this.submissions.filter = this.submissions.filter || ' ';
  }

  // Returns a space to fill the MatTable filter field so filtering runs for dropdowns when
  // search text is deleted, but does not run when there are no active filters.
  dropdownsFill() {
    return Object.entries(this.filter).reduce((emptySpace, [ field, val ]) => {
      if (val) {
        return ' ';
      }
      return emptySpace;
    }, '');
  }

  goBack() {
    this.router.navigate([ '/' ]);
  }

  submissionAction(submission) {
    if (submission.status !== 'pending' || this.mode === 'survey') {
      this.router.navigate([
        './exam',
        { submissionId: submission._id, questionNum: 1, status: submission.status, mode: this.surveyMode(this.mode, submission.type) }
      ], { relativeTo: this.route });
    }
  }

  surveyMode(listMode, submissionType) {
    if (listMode === 'survey') {
      return 'take';
    }
    if (submissionType === 'survey') {
      return 'view';
    }
    return listMode;
  }

}
