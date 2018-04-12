import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { MatPaginator, MatTableDataSource, MatSort, MatDialog } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { PlanetMessageService } from '../shared/planet-message.service';
import { filterSpecificFields } from '../shared/table-helpers';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { of } from 'rxjs/observable/of';
import { switchMap, catchError, map, takeUntil } from 'rxjs/operators';
import { MeetupService } from './meetups.service';
import { Subject } from 'rxjs/Subject';

@Component({
  templateUrl: './meetups.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-select {
      max-width: 44px;
    }
  ` ]
})
export class MeetupsComponent implements OnInit, AfterViewInit, OnDestroy {

  meetups = new MatTableDataSource();
  displayedColumns = [ 'select', 'title' ];
  message = '';
  readonly dbName = 'meetups';
  deleteDialog: any;
  selection = new SelectionModel(true, []);

  onDestroy$ = new Subject<void>();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  parent = this.route.snapshot.data.parent;
  getOpts = this.parent ? { domain: this.userService.getConfig().parent_domain } : {};


  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private meetupService: MeetupService
  ) { }

  ngOnInit() {
    this.meetupService.meetupUpdated$.pipe(takeUntil(this.onDestroy$))
    .subscribe((meetups) => {
      this.meetups.data = meetups;
    });
    this.meetupService.updateMeetups({ opts: this.getOpts });
    this.meetups.filterPredicate = filterSpecificFields([ 'title', 'description' ]);
  }

  ngAfterViewInit() {
    this.meetups.paginator = this.paginator;
    this.meetups.sort = this.sort;
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.meetups.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected() ?
    this.selection.clear() :
    this.meetups.data.forEach(row => this.selection.select(row));
  }

  applyFilter(filterValue: string) {
    filterValue = filterValue.trim(); // Remove whitespace
    filterValue = filterValue.toLowerCase(); // MatTableDataSource defaults to lowercase matches
    this.meetups.filter = filterValue;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getMeetups() {
    let opts: any = {};
    if (this.router.url === '/manager/meetups') {
      opts = { domain: this.userService.getConfig().parent_domain };
    }
    this.couchService.allDocs('meetups', opts)
      .subscribe((data) => {
        this.meetups.data = data;
      }, (error) => this.planetMessageService.showAlert('There was a problem getting meetups'));
  }

  deleteClick(meetup) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteMeetup(meetup),
        changeType: 'delete',
        type: 'meetup',
        displayName: meetup.title
      }
    });
  }

  deleteMeetup(meetup) {
    // Return a function with community on its scope to pass to delete dialog
    return () => {
      const { _id: meetupId, _rev: meetupRev } = meetup;
      this.couchService.delete('meetups/' + meetupId + '?rev=' + meetupRev)
        .subscribe((data) => {
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.meetups.data = this.meetups.data.filter((meet: any) => data.id !== meet._id);
          this.selection.clear();
          this.deleteDialog.close();
          this.planetMessageService.showAlert('You have deleted Meetup ' + meetup.title);
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this meetup');
    };
  }

  deleteMeetups(meetups) {
    // Deletes multiple meetups
    return () => {
      const deleteMeetupArr = meetups.map((meetup) => {
        return { _id: meetup._id, _rev: meetup._rev, _deleted: true };
      });
      this.couchService.post(this.dbName + '/_bulk_docs', { docs: deleteMeetupArr })
        .subscribe((data) => {
          this.meetupService.updateMeetups();
          this.selection.clear();
          this.deleteDialog.close();
          this.planetMessageService.showAlert('You have deleted selected meetups');
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting these meetups.');
      };
    }

  deleteSelected() {
    let amount = 'many',
      okClick = this.deleteMeetups(this.selection.selected),
      displayName = '';
    if (this.selection.selected.length === 1) {
      const meetup = this.selection.selected[0];
      amount = 'single';
      okClick = this.deleteMeetup(meetup);
      displayName = meetup.title;
    }
    this.openDeleteDialog(okClick, amount, displayName);
  }

  openDeleteDialog(okClick, amount, displayName = '') {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick,
        amount,
        changeType: 'delete',
        type: 'meetup',
        displayName
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().debug('Closing dialog').subscribe(() => {
      this.message = '';
    });
  }

  goBack() {
    this.parent ? this.router.navigate([ '/manager' ]) : this.router.navigate([ '/' ]);
  }

}
