import { Component, Input, ViewChild, OnChanges, AfterViewInit, OnInit } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { commonSortingDataAccessor, sortNumberOrString } from '../../shared/table-helpers';
import { ResourcesService } from '../../resources/resources.service';

@Component({
  selector: 'planet-reports-resource-activities',
  templateUrl: './reports-resource-activities.component.html'
})
export class ReportsReportActivitiesComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() activitiesByDoc = [];
  @Input() ratings = [];
  resourceActivities = new MatTableDataSource();
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
    this.resourceActivities.sortingDataAccessor = (item: any, property: string) =>
      sortNumberOrString(this.sortingObject(item, property), property);
  }

  ngOnChanges() {
    this.resourceActivities.data = this.activitiesByDoc.map(
      activity => ({
        averageRating: (this.ratings.find((rating: any) => rating.item === activity.resourceId) || {}).value,
        ...activity
      })
    );
  }

  ngAfterViewInit() {
    this.resourceActivities.paginator = this.paginator;
    this.resourceActivities.sort = this.sort;
  }

  sortingObject(item, property) {
    return property === 'title' ? item.max : item;
  }

}
