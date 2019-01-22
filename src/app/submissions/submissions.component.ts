import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MatPaginator, MatTableDataSource, MatSort, MatDialog } from '@angular/material';
import { filterSpecificFields, composeFilterFunctions, filterDropdowns, dropdownsFill } from '../shared/table-helpers';
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
  displayedColumns = [ 'name', 'status', 'user', 'lastUpdateTime' ];
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
      this.filter['type'] = 'survey';
      query = findDocuments({ 'user.name': this.userService.get().name, type: 'survey' });
    }
    this.submissionsService.submissionsUpdated$.pipe(takeUntil(this.onDestroy$))
    .subscribe((submissions) => {
      submissions = submissions.reduce((sList, s1) => {
        const sIndex = sList.findIndex(s => (s.parentId === s1.parentId && s.user._id === s1.user._id && s1.type === 'survey'));
        if (sIndex === -1) {
          sList.push(s1);
        } else if (s1.parent.updatedDate > (sList[sIndex].parent.updatedDate || 0)) {
          sList[sIndex] = s1;
        }
        return sList;
      }, []);
      // Sort in descending lastUpdateTime order, so the recent submission can be shown on the top
      submissions.sort((a, b) => b.lastUpdateTime - a.lastUpdateTime);
      this.submissions.data = submissions.map(submission => ({
        ...submission, submittedBy: this.submissionsService.submissionName(submission.user)
      }));
      this.emptyData = !this.submissions.data.length;
      this.applyFilter('');
    });
    this.submissionsService.updateSubmissions({ query });
    this.setupTable();
  }

  ngAfterViewInit() {
    this.submissions.paginator = this.paginator;
    this.submissions.sort = this.sort;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setupTable() {
    this.submissions.filterPredicate = composeFilterFunctions([ filterDropdowns(this.filter), filterSpecificFields([ 'parent.name' ]) ]);
    this.submissions.sortingDataAccessor = (item: any, property) => {
      switch (property) {
        case 'name': return item.parent.name.toLowerCase();
        case 'user': return item.submittedBy.toLowerCase();
        default: return typeof item[property] === 'string' ? item[property].toLowerCase() : item[property];
      }
    };
  }

  applyFilter(filterValue: string) {
    this.submissions.filter = filterValue || this.dropdownsFill();
  }

  onFilterChange(filterValue: string, field: string) {
    this.filter[field] = filterValue;
    // Force filter to update by setting it to a space if empty
    this.submissions.filter = this.submissions.filter || ' ';
  }

  dropdownsFill() {
    return dropdownsFill(this.filter);
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

  isNumber(value) {
    return typeof value === 'number';
  }

}
