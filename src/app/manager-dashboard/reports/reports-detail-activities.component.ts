import { Component, Input, ViewChild, OnChanges, AfterViewInit, OnInit, Output, EventEmitter } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { sortNumberOrString } from '../../shared/table-helpers';

@Component({
  selector: 'planet-reports-detail-activities',
  templateUrl: './reports-detail-activities.component.html'
})
export class ReportsDetailActivitiesComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() activitiesByDoc = [];
  @Input() ratings = [];
  @Input() activityType: 'resources' | 'courses' | 'health' = 'resources';
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
    this.activities.sortingDataAccessor = (item: any, property: string) => property === 'unique' ?
      item.unique.length :
      sortNumberOrString(this.sortingObject(item, property), property);
  }

  ngOnChanges() {
    this.displayedColumns = this.activityType === 'health' ?
      [ 'weekOf', 'count', 'unique' ] :
      [ 'title', 'count', 'averageRating' ];
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
    this.itemClick.emit(element.resourceId || element.courseId || element.weekOf);
  }

}
