import { Component, OnChanges, AfterViewInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { MatTableDataSource, MatPaginator } from '@angular/material';
import { CouchService } from '../../shared/couchdb.service';
import { PlanetMessageService } from '../../shared/planet-message.service';

@Component({
  selector: 'planet-pending-table',
  templateUrl: './pending-table.component.html',
  styles: [ `
    .mat-column-date {
      max-width: 150px;
    }
    .mat-column-actions {
      max-width: 100px;
    }
  ` ]
})
export class PendingTableComponent implements OnChanges, AfterViewInit {

  @Input() data = [];
  @Output() requestUpdate = new EventEmitter<void>();
  items = new MatTableDataSource();
  displayedColumns = [ 'item', 'date', 'actions' ];

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnChanges() {
    this.items.data = this.data;
  }

  ngAfterViewInit() {
    this.items.paginator = this.paginator;
  }

  deleteItem(item) {
    const { _id: id, _rev: rev } = item;
    this.couchService.delete(`send_items/${id}?rev=${rev}`).subscribe(
      () => this.requestUpdate.emit(),
      () => this.planetMessageService.showAlert('There was a problem deleting item')
    );
  }
}
