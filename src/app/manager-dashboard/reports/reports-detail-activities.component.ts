import { Component, Input, ViewChild, OnChanges, AfterViewInit, OnInit, Output, EventEmitter } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { sortNumberOrString } from '../../shared/table-helpers';
import { ReportsDetailData } from './reports-detail-data';

const columns = {
  resources: [ 'title', 'count', 'averageRating' ],
  courses: [ 'title', 'steps', 'exams', 'enrollments', 'count', 'stepsCompleted', 'completions', 'averageRating' ],
  health: [ 'weekOf', 'count', 'unique' ],
  chat: [ 'aiProvider', 'user', 'createdDate', 'conversationLength', 'assistant', 'shared' ]
};

@Component({
  selector: 'planet-reports-detail-activities',
  templateUrl: './reports-detail-activities.component.html'
})
export class ReportsDetailActivitiesComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() activitiesByDoc = [];
  @Input() ratings = [];
  @Input() progress = {
    enrollments: new ReportsDetailData('time'),
    completions: new ReportsDetailData('time'),
    steps: new ReportsDetailData('time')
  };
  @Input() activityType: 'resources' | 'courses' | 'health' | 'chat' = 'resources';
  @Output() itemClick = new EventEmitter<any>();
  matSortActive = '';
  activities = new MatTableDataSource();
  displayedColumns = [
    'title',
    'count',
    'averageRating'
  ];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor() {}

  ngOnInit() {
    this.activities.sortingDataAccessor = (item: any, property: string) => {
      if (property === 'unique') {
        return item.unique.length;
      }
      return sortNumberOrString(this.sortingObject(item, property), property);
    };
  }

  truncateTitle(title: string) {
    if (title?.length > 150) {
      return title.slice(0, 150) + '...';
    }
    return title;
  }

  ngOnChanges() {
    this.matSortActive = this.activityType === 'health' ? 'weekOf' : '';
    this.displayedColumns = columns[this.activityType];
    const filterCourse = (activity: any) => (progress: any) => progress.courseId === activity.courseId;

    if (this.activityType === 'chat') {
      this.activities.data = this.activitiesByDoc.map(activity => ({
        ...activity,
        createdDate: new Date(activity.createdDate),
        hasAttachments: activity.context?.resource?.attachments ? 'True' : '',
        assistant: activity.assistant ? 'True' : '',
        shared: activity.shared ? 'True' : '',
        conversationLength: activity.conversations.length
      }));
    } else {
      this.activities.data = this.activitiesByDoc.map(activity => {
        if (activity.max) {
          activity.max.title = this.truncateTitle(activity.max.title);
        }
        return {
          averageRating: (this.ratings.find((rating: any) => rating.item === (activity.resourceId || activity.courseId)) || {}).value,
          enrollments: this.progress.enrollments.filteredData.filter(filterCourse(activity)).length,
          completions: this.progress.completions.filteredData.filter(filterCourse(activity)).length,
          stepsCompleted: this.progress.steps.filteredData.filter(filterCourse(activity)).length,
          steps: activity.max?.steps,
          exams: activity.max?.exams,
          ...activity
        };
      });
    }
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
