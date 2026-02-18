import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { combineLatest, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { UserService } from '../shared/user.service';
import { filterDropdowns, filterSpecificFields, composeFilterFunctions, sortNumberOrString, dropdownsFill } from '../shared/table-helpers';
import { PlanetMessageService } from '../shared/planet-message.service';
import { FeedbackService } from './feedback.service';
import { findDocuments } from '../shared/mangoQueries';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { UsersService } from '../users/users.service';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';
import { truncateText } from '../shared/utils';

@Component({
  templateUrl: './feedback.component.html',
  styles: [ `
    .mat-column-type {
      display: flex;
      align-items: center;
    }

    .ellipsis-title {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      white-space: normal;
    }
  ` ]
})
export class FeedbackComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly dbName = 'feedback';
  message: string;
  deleteDialog: any;
  feedback = new MatTableDataSource();
  displayedColumns = [ 'title', 'type', 'priority', 'owner', 'status', 'openTime', 'closeTime', 'source', 'action' ];
  typeOptions: any = [ $localize`Question`, $localize`Bug`, $localize`Suggestion` ];
  statusOptions: any = [ { text: $localize`Open`, value: [ 'Open', 'Reopened' ] }, { text: $localize`Closed`, value: 'Closed' } ];
  filter = {
    'type': '',
    'status': ''
  };
  private _titleSearch = '';
  get titleSearch(): string { return this._titleSearch; }
  set titleSearch(value: string) {
    // When setting the titleSearch, also set the feedback filter
    this.feedback.filter = value ? value : this.dropdownsFill();
    this._titleSearch = value;
  }
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  user: any = {};
  private onDestroy$ = new Subject<void>();
  users = [];
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  showFiltersRow = false;

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private feedbackService: FeedbackService,
    private router: Router,
    private stateService: StateService,
    private dialogsLoadingService: DialogsLoadingService,
    private usersService: UsersService,
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  @HostListener('window:resize') OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  ngOnInit() {
    if (this.stateService.configuration.planetType === 'community') {
      // Remove source from displayed columns for communities
      this.displayedColumns.splice(this.displayedColumns.indexOf('source'), 1);
    }
    combineLatest(this.usersService.usersListener(true), this.feedbackService.feedbackUpdate$).pipe(
      takeUntil(this.onDestroy$)
    ).subscribe(([ users = [] ]) => {
      this.users = users;
      this.getFeedback();
    });
    this.dialogsLoadingService.start();
    this.user = this.userService.get();
    this.usersService.requestUsers();
    this.feedbackService.setFeedback();
    this.feedback.filterPredicate = composeFilterFunctions([ filterDropdowns(this.filter), filterSpecificFields([ 'owner', 'title' ]) ]);
    this.feedback.sortingDataAccessor = sortNumberOrString;
  }

  ngAfterViewInit() {
    this.feedback.paginator = this.paginator;
    this.feedback.sort = this.sort;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  searchFilter(filterValue: string) {
    this.feedback.filter = filterValue;
  }

  getFeedback() {
    const selector = !this.user.isUserAdmin ? { 'owner': this.user.name } : { '_id': { '$gt': null } };
    this.couchService.findAll(this.dbName, findDocuments(selector, 0, [ { 'openTime': 'desc' } ])).subscribe((feedbackData: any[]) => {
      this.feedback.data = feedbackData.map(feedback => {
        return {
          ...feedback,
          title: truncateText(feedback.title, 100),
          user: this.users.find(u => u.doc.name === feedback.owner)
        };
      });
      this.dialogsLoadingService.stop();
    }, (error) => {
      this.message = $localize`There is a problem of getting data.`;
    });
  }

  deleteClick(feedback) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteFeedback(feedback),
        changeType: 'delete',
        type: 'feedback',
        displayName: feedback.title
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().subscribe(() => {
      this.message = '';
    });
  }

  deleteFeedback(feedback) {
    const { _id: feedbackId, _rev: feedbackRev } = feedback;
    return {
      request: this.couchService.delete(this.dbName + '/' + feedbackId + '?rev=' + feedbackRev),
      onNext: (data) => {
        // It's safer to remove the item from the array based on its id than to splice based on the index
        this.feedback.data = this.feedback.data.filter((fback: any) => data.id !== fback._id);
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`You have deleted feedback.`);
      },
      onError: (error) => this.planetMessageService.showAlert($localize`There is a problem deleting this feedback.`)
    };
  }

  closeFeedback(feedback: any) {
    this.feedbackService.closeFeedback(feedback).subscribe(() => this.getFeedback());
  }

  openFeedback(feedback: any) {
    this.feedbackService.openFeedback(feedback).subscribe(() => this.getFeedback());
  }

  goBack() {
    if (this.userService.get().isUserAdmin) {
      this.router.navigate([ '/manager' ]);
    } else {
      this.router.navigate([ '/' ]);
    }
  }

  onFilterChange(filterValue: string, field: string) {
    this.filter[field] = filterValue === 'All' ? '' : filterValue;
    // Force filter to update by setting it to a space if empty
    this.feedback.filter = this.feedback.filter ? this.feedback.filter : ' ';
  }

  resetSearch() {
    this.filter.type = '';
    this.filter.status = '';
    this.titleSearch = '';
  }

  // Returns a space to fill the MatTable filter field so filtering runs for dropdowns when
  // search text is deleted, but does not run when there are no active filters.
  dropdownsFill() {
    return dropdownsFill(this.filter);
  }

}
