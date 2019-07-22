import { Component, Input, ViewChild, OnChanges, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { commonSortingDataAccessor } from '../../shared/table-helpers';

@Component({
  selector: 'planet-reports-table',
  templateUrl: './reports-table.component.html'
})
export class ReportsTableComponent implements OnChanges, AfterViewInit {

  @Input() planets = [];
  logs = new MatTableDataSource();
  displayedColumns = [
    'planetName',
    // 'downloads',
    'views',
    'logins',
    'lastAdminLogin',
    'lastUpgrade',
    'lastSync'
  ];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor() {}

  ngOnChanges() {
    this.logs.data = this.planets;
    this.logs.sortingDataAccessor = commonSortingDataAccessor;
  }

  ngAfterViewInit() {
    this.logs.paginator = this.paginator;
    this.logs.sort = this.sort;
  }

}
