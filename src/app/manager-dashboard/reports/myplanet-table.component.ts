import { Component, OnChanges, AfterViewInit, ViewChild, Input, OnInit } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';

@Component({
  selector: 'planet-myplanet-table',
  templateUrl: './myplanet-table.component.html'
})
export class MyPlanetTableComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() data = [];
  myPlanets = new MatTableDataSource();
  displayedColumns = [ 'id', 'name', 'last_synced', 'versionName', 'count' ];

  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  ngOnInit() {
    this.myPlanets.sortingDataAccessor = (item: any, property) => {
      switch (property) {
        case 'versionName': return item.versionName.split('.').reduce((v, n) => v + n.padStart(3, '0'), '');
        case 'name': return (item.customDeviceName || item.deviceName || '').toLowerCase();
        default: return typeof item[property] === undefined ? '' :
          typeof item[property] === 'string' ? item[property].toLowerCase() : item[property];
      }
    };
  }

  ngOnChanges() {
    this.myPlanets.data = this.data;
  }

  ngAfterViewInit() {
    this.myPlanets.paginator = this.paginator;
    this.myPlanets.sort = this.sort;
  }

}
