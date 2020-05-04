import { Component, Input, ViewChild, OnChanges, AfterViewInit, OnInit, Output, EventEmitter } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { sortNumberOrString } from '../../shared/table-helpers';

@Component({
  selector: 'planet-reports-detail-activities',
  templateUrl: './reports-detail-activities.component.html'
})
export class ReportsDetailActivitiesComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() activitiesByDoc = [];
  @Input() ratings = [];
  @Input() progresses = [];
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

  constructor() {}

  ngOnInit() {
    this.displayedColumns = this.displayedColumns.concat(this.activityType === 'courses' ? [ 'enrolled', 'passed' ] : []);
    this.activities.sortingDataAccessor = (item: any, property: string) =>
      sortNumberOrString(this.sortingObject(item, property), property);
  }

  ngOnChanges() {
    this.activities.data = this.activitiesByDoc.map(activity => {
      let progressCount = { enrolled: 0, passed: 0 };
      if (this.activityType === 'courses' && this.progresses) {
        const progress = (this.progresses.find(p => p.doc._id === activity.courseId) || { progress: {} }).progress;
        progressCount = {
          enrolled : Object.values(progress).length,
          passed: Object.values(progress).filter(p => p).length,
        };
      }
      return {
        averageRating: (this.ratings.find((rating: any) => rating.item === (activity.resourceId || activity.courseId)) || {}).value,
        ...activity,
        ...progressCount
      };
    });
  }

  ngAfterViewInit() {
    this.activities.paginator = this.paginator;
    this.activities.sort = this.sort;
  }

  sortingObject(item, property) {
    return property === 'title' ? item.max : item;
  }

  rowClick(element) {
    this.itemClick.emit(element.resourceId || element.courseId);
  }

}
