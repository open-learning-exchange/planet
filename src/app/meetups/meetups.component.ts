import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { MatPaginator, MatTableDataSource, MatSort, MatDialog, PageEvent } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { PlanetMessageService } from '../shared/planet-message.service';
import { filterSpecificFields } from '../shared/table-helpers';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MeetupService } from './meetups.service';
import { debug } from '../debug-operator';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';

@Component({
  templateUrl: './meetups.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-select {
      max-width: 44px;
    }
    .mat-column-info {
      max-width: 500px;
      align-self: flex-start;
    }
  ` ]
})
export class MeetupsComponent implements OnInit, AfterViewInit, OnDestroy {

  meetups = new MatTableDataSource();
  message = '';
  readonly dbName = 'meetups';
  deleteDialog: any;
  selection = new SelectionModel(true, []);
  onDestroy$ = new Subject<void>();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  parent = this.route.snapshot.data.parent;
  displayedColumns = this.parent ? [ 'title' ] : [ 'select', 'title', 'info' ];
  getOpts = this.parent ? { domain: this.stateService.configuration.parentDomain } : {};
  pageEvent: PageEvent;
  currentUser = this.userService.get();
  emptyData = false;
  selectedNotJoined = 0;
  selectedJoined = 0;

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private meetupService: MeetupService,
    private stateService: StateService,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.dialogsLoadingService.start();
  }

  ngOnInit() {
    this.meetupService.meetupUpdated$.pipe(takeUntil(this.onDestroy$))
    .subscribe((meetups) => {
      // Sort in descending createdDate order, so the new meetup can be shown on the top
      meetups.sort((a, b) => b.createdDate - a.createdDate);
      this.meetups.data = meetups;
      this.emptyData = !this.meetups.data.length;
      this.dialogsLoadingService.stop();
    });
    this.meetupService.updateMeetups({ opts: this.getOpts });
    this.meetups.filterPredicate = filterSpecificFields([ 'title', 'description' ]);
    this.meetups.sortingDataAccessor = (item, property) => item[property].toLowerCase();
    this.selection.onChange.subscribe(({ source }) => {
      this.countSelectedNotJoined(source.selected);
    });
  }

  ngAfterViewInit() {
    this.meetups.paginator = this.paginator;
    this.meetups.sort = this.sort;
  }

  isAllSelected() {
    const itemsShown = Math.min(this.paginator.length - (this.paginator.pageIndex * this.paginator.pageSize), this.paginator.pageSize);
    return this.selection.selected.length === itemsShown;
  }
  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }


  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    this.isAllSelected() ?
    this.selection.clear() :
    this.meetups.filteredData.slice(start, end).forEach((row: any) => this.selection.select(row._id));
  }

  applyFilter(filterValue: string) {
    this.meetups.filter = filterValue;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
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
          this.selection.deselect(meetupId);
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.meetups.data = this.meetups.data.filter((meet: any) => data.id !== meet._id);
          this.deleteDialog.close();
          this.planetMessageService.showMessage('You have deleted Meetup ' + meetup.title);
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this meetup');
    };
  }

  deleteMeetups(meetupIds) {
    // Deletes multiple meetups
    return () => {
      const deleteMeetupArr = meetupIds.map((meetupId) => {
        const meetup: any = this.meetups.data.find((m: any) => m._id === meetupId);
        return { _id: meetup._id, _rev: meetup._rev, _deleted: true };
      });
      this.couchService.post(this.dbName + '/_bulk_docs', { docs: deleteMeetupArr })
        .subscribe((data) => {
          this.meetupService.updateMeetups();
          this.selection.clear();
          this.deleteDialog.close();
          this.planetMessageService.showMessage('You have deleted selected meetups');
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting these meetups.');
      };
    }

  deleteSelected() {
    let amount = 'many',
      okClick = this.deleteMeetups(this.selection.selected),
      displayName = '';
    if (this.selection.selected.length === 1) {
      const meetup: any = this.meetups.data.find((m: any) => m._id === this.selection.selected[0]);
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
    this.deleteDialog.afterClosed().pipe(debug('Closing dialog')).subscribe(() => {
      this.message = '';
    });
  }

  goBack() {
    this.parent ? this.router.navigate([ '/manager' ]) : this.router.navigate([ '/' ]);
  }

  meetupsToggle(meetupIds, type) {
    this.meetupService.attendMeetups(meetupIds, type).subscribe((res) => {
      this.countSelectedNotJoined(this.selection.selected);
    }, (error) => ((error)));
  }

  attendMeetup(meetup) {
    this.meetupService.attendMeetup(meetup._id, meetup.participate).subscribe((res) => {
      const msg = res.participate ? 'left' : 'joined';
      meetup.participate = !res.participate;
      if (!res.participate) {
        this.countSelectedNotJoined(this.selection.selected);
      }
      this.planetMessageService.showMessage('You have ' + msg + ' meetup.');
    });
  }

  countSelectedNotJoined(selected: any) {
    const { inShelf, notInShelf } = this.userService.countInShelf(selected, 'meetupIds');
    this.selectedJoined = inShelf;
    this.selectedNotJoined = notInShelf;
  }
}
