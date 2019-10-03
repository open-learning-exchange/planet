import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';
import { MatTableDataSource, MatDialog } from '@angular/material';
import { HealthEventDialogComponent } from './health-event-dialog.component';

@Component({
  templateUrl: './health.component.html',
  styles: [ `
    .profile-container {
      display: grid;
      grid-template-columns: minmax(200px, 1fr) 3fr;
      grid-column-gap: 2rem;
    }
    .profile-container mat-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, 200px);
      grid-column-gap: 0.5rem;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    mat-table {
      overflow-x: auto;
    }
    .table-column {
      min-width: 200px;
    }
  ` ]
})
export class HealthComponent implements OnInit {

  userDetail = this.healthService.userDetail || this.userService.get();
  healthDetail = this.healthService.healthDetail;
  events = this.healthService.events;
  eventTable = new MatTableDataSource();
  displayedColumns: string[] = [];

  constructor(
    private userService: UserService,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    if (this.userDetail.name !== this.userService.get().name) {
      this.router.navigate([ 'update' ], { relativeTo: this.route });
    }

    this.eventTable.data = this.events.reduce((eventRows, event) => eventRows.map(item => ({ ...item, [event.date]: event[item.label] })), [
      { label: 'temperature' }, { label: 'pulse' }, { label: 'bp' }, { label: 'height' },
      { label: 'weight' }, { label: 'vision' }, { label: 'hearing' }
    ]);
    this.displayedColumns = Object.keys(this.eventTable.data[0]);
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  examClick(eventDate) {
    if (eventDate !== 'label') {
      this.dialog.open(HealthEventDialogComponent, {
        data: { event: this.events.find(event => event.date === +eventDate) },
        width: '50vw',
        maxHeight: '90vh'
      });
    }
  }

}
