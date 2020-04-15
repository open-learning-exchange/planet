import { Component, Input, ViewChild, OnChanges, AfterViewInit, OnInit, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material';
import { take } from 'rxjs/operators';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { sortNumberOrString } from '../../shared/table-helpers';
import { CoursesViewDetailDialogComponent } from '../../courses/view-courses/courses-view-detail.component';
import { CoursesService } from '../../courses/courses.service';

@Component({
  selector: 'planet-reports-detail-activities',
  templateUrl: './reports-detail-activities.component.html'
})
export class ReportsDetailActivitiesComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() activitiesByDoc = [];
  @Input() ratings = [];
  @Input() activityType: 'resources' | 'courses' = 'resources';
  @Output() itemClick = new EventEmitter<any>();
  activities = new MatTableDataSource();
  displayedColumns = [
    'title',
    'count',
    'averageRating'
  ];
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  constructor(
    private dialog: MatDialog,
    private coursesService: CoursesService,
    private router: Router
  ) {}

  ngOnInit() {
    this.activities.sortingDataAccessor = (item: any, property: string) =>
      sortNumberOrString(this.sortingObject(item, property), property);
  }

  ngOnChanges() {
    this.activities.data = this.activitiesByDoc.map(
      activity => ({
        averageRating: (this.ratings.find((rating: any) => rating.item === (activity.resourceId || activity.courseId)) || {}).value,
        ...activity
      })
    );
  }

  ngAfterViewInit() {
    this.activities.paginator = this.paginator;
    this.activities.sort = this.sort;
  }

  sortingObject(item, property) {
    return property === 'title' ? item.max : item;
  }

  rowClick(element) {
    if (element.courseId) {
      this.coursesService.requestCourse({ courseId: element.courseId, forceLatest: true });
      this.coursesService.courseUpdated$.pipe(take(1)).subscribe(({ course }) => {
        this.dialog.open(CoursesViewDetailDialogComponent, {
          data: { courseDetail: { ...element, ...course } },
          minWidth: '600px',
          maxWidth: '90vw',
          autoFocus: false
        });
      });
    } else if (element.resourceId) {
      this.itemClick.emit(element.resourceId);
    }
  }

}
