import { Component, OnChanges, AfterViewInit, ViewChild, Input } from '@angular/core';
import { MatTableDataSource, MatPaginator } from '@angular/material';

@Component({
  selector: 'planet-pending-table',
  templateUrl: './pending-table.component.html'
})
export class PendingTableComponent implements OnChanges, AfterViewInit {

  @Input() data = [];
  items = new MatTableDataSource();
  displayedColumns = [ 'item' ];

  @ViewChild(MatPaginator) paginator: MatPaginator;

  ngOnChanges() {
    this.items.data = this.data;
  }

  ngAfterViewInit() {
    this.items.paginator = this.paginator;
  }

}
