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
    this.activities.sortingDataAccessor = (item: any, property: string) => property === 'unique' ?
      item.unique.length :
      sortNumberOrString(this.sortingObject(item, property), property);
  }

  truncateTitle(title: string) {
    if (title.length > 140) {
      return title.slice(0, 140) + '…';
    }
    return title;
  }

  ngOnChanges() {
    this.displayedColumns = columns[this.activityType] || [ 'title', 'count' ];
    this.matSortActive = this.activityType === 'health' ? 'weekOf' : 'count';

    if (this.activityType === 'chat') {
      this.activities.data = this.activitiesByDoc.map(activity => ({
        ...activity,
        createdDate: activity.createdDate ? new Date(activity.createdDate).getTime() : '',
        hasAttachments: activity.context?.resource?.attachments ? 'True' : '',
        assistant: activity.assistant ? 'True' : '',
        shared: activity.shared ? 'True' : '',
        conversationLength: activity.conversations?.length || 0
      }));
    } else if (this.activityType === 'resources') {
      this.activities.data = this.activitiesByDoc.map(activity => {
        const rawTitle = activity.title || activity.max?.title || '';
        return {
          ...activity,
          title: this.truncateTitle(rawTitle),
          averageRating: (this.ratings.find((rating: any) => rating.item === activity.resourceId) || {}).value || ''
        };
      });
      console.log('Resources data processed:', this.activities.data);
    } else if (this.activityType === 'courses') {
      const filterCourse = (activity: any) => (progress: any) => progress.courseId === activity.courseId;
      this.activities.data = this.activitiesByDoc.map(activity => {
        const rawTitle = activity.title || activity.max?.title || '';
        return {
          ...activity,
          title: this.truncateTitle(rawTitle),
          steps: activity.max?.steps || 0,
          exams: activity.max?.exams || 0,
          averageRating: (this.ratings.find((rating: any) => rating.item === activity.courseId) || {}).value || '',
          enrollments: this.progress.enrollments.filteredData.filter(filterCourse(activity)).length,
          completions: this.progress.completions.filteredData.filter(filterCourse(activity)).length,
          stepsCompleted: this.progress.steps.filteredData.filter(filterCourse(activity)).length
        };
      });
    } else {
      this.activities.data = this.activitiesByDoc.map(activity => ({
        ...activity,
        count: activity.count || 0,
        unique: activity.unique || []
      }));
    }
  }

  ngAfterViewInit() {
    this.activities.paginator = this.paginator;
    this.activities.sort = this.sort;
  }

  sortingObject(item, property) {
    if (property === 'title') {
      return item.title || item.max?.title || '';
    }
    return item;
  }

  rowClick(element) {
    this.itemClick.emit(element.resourceId || element.courseId || element.weekOf);
  }

}
