import { Component, Input, ViewChild, OnChanges, AfterViewInit, OnInit, Output, EventEmitter } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { sortNumberOrString } from '../../shared/table-helpers';
import { ReportsDetailData } from './reports-detail-data';

const columns = {
  resources: [ 'title', 'count', 'averageRating' ],
  courses: [ 'title', 'count', 'averageRating', 'enrollments', 'completions', 'steps', 'exams' ],
  health: [ 'weekOf', 'count', 'unique' ]
};

@Component({
  selector: 'planet-reports-detail-activities',
  templateUrl: './reports-detail-activities.component.html'
})
export class ReportsDetailActivitiesComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() activitiesByDoc = [];
  @Input() ratings = [];
  @Input() progress = { enrollments: new ReportsDetailData('time'), completions: new ReportsDetailData('time'), steps: [] };
  @Input() activityType: 'resources' | 'courses' | 'health' = 'resources';
  @Output() itemClick = new EventEmitter<any>();
  matSortActive = '';
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
    this.activities.sortingDataAccessor = (item: any, property: string) => property === 'unique' ?
      item.unique.length :
      sortNumberOrString(this.sortingObject(item, property), property);
  }

  ngOnChanges() {
    this.matSortActive = this.activityType === 'health' ? 'weekOf' : '';
    this.displayedColumns = columns[this.activityType];
    const filterCourse = (activity: any) => (progress: any) => progress.courseId === activity.courseId;
    this.activities.data = this.activitiesByDoc.map(activity => ({
      averageRating: (this.ratings.find((rating: any) => rating.item === (activity.resourceId || activity.courseId)) || {}).value,
      steps: (this.progress.steps.find(filterCourse(activity))  || { steps: 0 }).steps,
      exams: (this.progress.steps.find(filterCourse(activity))  || { exams: 0 }).exams,
      enrollments: this.progress.enrollments.filteredData.filter(filterCourse(activity)).length,
      completions: this.progress.completions.filteredData.filter(filterCourse(activity)).length,
      ...activity
    }));
  }

  ngAfterViewInit() {
    this.activities.paginator = this.paginator;
    this.activities.sort = this.sort;
  }

  sortingObject(item, property) {
    return property === 'title' ? item.max : item;
  }

  rowClick(element) {
    this.itemClick.emit(element.resourceId || element.courseId || element.weekOf);
  }

}
