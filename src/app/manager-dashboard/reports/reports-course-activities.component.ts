import { Component, Input, ViewChild, OnChanges, AfterViewInit, OnInit } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { commonSortingDataAccessor, sortNumberOrString } from '../../shared/table-helpers';
import { ResourcesService } from '../../resources/resources.service';

@Component({
  selector: 'planet-reports-course-activities',
  templateUrl: './reports-course-activities.component.html'
})
export class ReportsCourseActivitiesComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() activitiesByDoc = [];
  @Input() ratings = [];
  courseActivities = new MatTableDataSource();
  displayedColumns = [
    'title',
    'count',
    'averageRating'
  ];
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  constructor(
    private resourcesService: ResourcesService
  ) {}

  ngOnInit() {
    this.courseActivities.sortingDataAccessor = (item: any, property: string) =>
      sortNumberOrString(this.sortingObject(item, property), property);
  }

  ngOnChanges() {
    this.courseActivities.data = this.activitiesByDoc.map(
      activity => ({
        averageRating: (this.ratings.find((rating: any) => rating.item === activity.courseId) || {}).value,
        ...activity
      })
    );
  }

  ngAfterViewInit() {
    this.courseActivities.paginator = this.paginator;
    this.courseActivities.sort = this.sort;
  }

  sortingObject(item, property) {
    return property === 'title' ? item.max : item;
  }

}
