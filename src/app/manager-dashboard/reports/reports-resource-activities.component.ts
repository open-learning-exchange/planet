import { Component, Input, ViewChild, OnChanges, AfterViewInit, OnInit } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { commonSortingDataAccessor } from '../../shared/table-helpers';
import { ResourcesService } from '../../resources/resources.service';

@Component({
  selector: 'planet-reports-resource-activities',
  templateUrl: './reports-resource-activities.component.html'
})
export class ReportsReportActivitiesComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() activitiesByDoc = [];
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
    this.resourcesService.resourcesListener(false).subscribe((resources) => {
        this.resourceActivities.data = this.activitiesByDoc.map(
          activity => ({ ...activity, ...resources.find(res => res._id === activity.resourceId) })
        );
        this.resourceActivities.paginator = this.paginator;
      });
    this.resourceActivities.sortingDataAccessor = (item: any, property: string) =>
      commonSortingDataAccessor(this.sortingObject(item, property), property);
  }

  ngOnChanges() {
    this.resourcesService.requestResourcesUpdate(false);
  }

  ngAfterViewInit() {
    this.resourceActivities.paginator = this.paginator;
    this.resourceActivities.sort = this.sort;
  }

  sortingObject(item, property) {
    return property === 'count' ? item : item.doc;
  }

}
