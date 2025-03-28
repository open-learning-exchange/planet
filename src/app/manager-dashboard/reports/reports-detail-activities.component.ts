import { Component, Input, ViewChild, OnChanges, AfterViewInit, OnInit, Output, EventEmitter } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { sortNumberOrString } from '../../shared/table-helpers';
import { ReportsDetailData } from './reports-detail-data';

const columns = {
  resources: [ 'title', 'count', 'averageRating' ],
  resourcesRaw: [ 'title', 'viewCount', 'averageRating' ],
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
  @Input() rawActivities = [];
  @Input() showRawData = false;
  @Input() ratings = [];
  @Input() progress = {
    enrollments: new ReportsDetailData('time'),
    completions: new ReportsDetailData('time'),
    steps: new ReportsDetailData('time')
  };
  @Input() activityType: 'resources' | 'resourcesRaw' | 'courses' | 'health' | 'chat' = 'resources';
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
      item.unique?.length || 0 :
      sortNumberOrString(this.sortingObject(item, property), property);
  }

  truncateTitle(title: string) {
    if (title?.length > 150) {
      return title.slice(0, 150) + '...';
    }
    return title;
  }

  ngOnChanges() {
    const effectiveType = this.showRawData && this.activityType === 'resources' ? 'resourcesRaw' : this.activityType;
    this.matSortActive = this.activityType === 'health' ? 'weekOf' : '';
    this.displayedColumns = columns[effectiveType];
    const filterCourse = (activity: any) => (progress: any) => progress.courseId === activity.courseId;
    
    const inputData = this.showRawData ? this.rawActivities : this.activitiesByDoc;
    console.log(`${this.activityType} - Input activities count:`, inputData.length);
    
    // Sample data for debugging
    if (inputData.length > 0) {
      console.log(`${this.activityType} - Sample data:`, inputData.slice(0, 3));
      
      // Count distinct resource IDs to understand grouping
      if (this.activityType === 'resources' && this.showRawData) {
        const uniqueIds = new Set();
        this.rawActivities.forEach(item => {
          uniqueIds.add(item.resourceId);
        });
        console.log(`${this.activityType} - Unique resource IDs in raw data:`, uniqueIds.size);
      }
    }
    
    if (this.activityType === 'chat') {
      this.activities.data = this.activitiesByDoc.map(activity => ({
        ...activity,
        createdDate: new Date(activity.createdDate).getTime(),
        hasAttachments: activity.context?.resource?.attachments ? 'True' : '',
        assistant: activity.assistant ? 'True' : '',
        shared: activity.shared ? 'True' : '',
        conversationLength: activity.conversations?.length || 0
      }));
    } else if (this.showRawData && this.activityType === 'resources') {
      // Map raw resource data - already processed with viewCount and averageRating
      this.activities.data = this.rawActivities;
      console.log(`${this.activityType} - Raw data mode - showing ${this.activities.data.length} records`);
    } else {
      this.activities.data = this.activitiesByDoc.map(activity => {
        if (activity.max) {
          activity.max.title = this.truncateTitle(activity.max.title);
        }
        return {
          averageRating: (this.ratings.find((rating: any) => rating.item === (activity.resourceId || activity.courseId)) || {}).value,
          enrollments: this.progress.enrollments?.filteredData?.filter(filterCourse(activity))?.length || 0,
          completions: this.progress.completions?.filteredData?.filter(filterCourse(activity))?.length || 0,
          stepsCompleted: this.progress.steps?.filteredData?.filter(filterCourse(activity))?.length || 0,
          steps: activity.max?.steps,
          exams: activity.max?.exams,
          ...activity
        };
      });
      
      console.log(`${this.activityType} - Processed activities:`, this.activities.data.length);
    }

    // Reset to first page when data changes
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  ngAfterViewInit() {
    this.activities.paginator = this.paginator;
    this.activities.sort = this.sort;
  }

  sortingObject(item, property) {
    return property === 'title' ? item.max || item : item;
  }

  rowClick(element) {
    this.itemClick.emit(element.resourceId || element.courseId || element.weekOf);
  }

}
