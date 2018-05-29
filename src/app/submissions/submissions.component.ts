import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MatPaginator, MatTableDataSource, MatSort, MatDialog } from '@angular/material';
import { filterSpecificFields } from '../shared/table-helpers';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';
import { SubmissionsService } from './submissions.service';

@Component({
  templateUrl: './submissions.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-name {
      max-width: 25vw;
    }
  ` ]
})
export class SubmissionsComponent implements OnInit, AfterViewInit, OnDestroy {

  submissions = new MatTableDataSource();
  readonly dbName = 'meetups';
  onDestroy$ = new Subject<void>();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns = [ 'name', 'status' ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private submissionsService: SubmissionsService
  ) { }

  ngOnInit() {
    this.submissionsService.submissionsUpdated$.pipe(takeUntil(this.onDestroy$))
    .subscribe((submissions) => {
      this.submissions.data = submissions;
    });
    this.submissionsService.updateSubmissions({});
    this.submissions.filterPredicate = filterSpecificFields([ 'parent.name' ]);
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
    this.submissions.filter = filterValue;
  }

  goBack() {
    this.router.navigate([ '/' ]);
  }

  gradeSubmission(submission) {
    this.router.navigate([ './exam', { submissionId: submission._id, questionNum: 1 } ], { relativeTo: this.route });
  }

}
