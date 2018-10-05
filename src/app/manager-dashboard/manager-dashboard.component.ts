import { Component, OnInit, isDevMode, OnDestroy } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { switchMap, catchError, takeUntil } from 'rxjs/operators';
import { forkJoin, of, Subject } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatDialog, MatDialogRef } from '@angular/material';
import { Router } from '@angular/router';
import { debug } from '../debug-operator';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { filterSpecificFields } from '../shared/table-helpers';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { SyncService } from '../shared/sync.service';
import { CoursesService } from '../courses/courses.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { ReportsService } from './reports/reports.service';

@Component({
  templateUrl: './manager-dashboard.component.html'
})

export class ManagerDashboardComponent implements OnInit, OnDestroy {
  isUserAdmin = false;
  displayDashboard = true;
  message = '';
  planetType = this.configurationService.configuration.planetType;
  planetConfig = this.configurationService.configuration;
  showResendConfiguration = false;
  requestStatus = 'loading';
  devMode = isDevMode();
  deleteCommunityDialog: any;
  versionLocal = '';
  versionParent = '';
  dialogRef: MatDialogRef<DialogsListComponent>;
  pushedItems = { course: [], resource: [] };
  pin: string;
  activityLogs: any = {};
  private onDestroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private coursesService: CoursesService,
    private router: Router,
    private planetMessageService: PlanetMessageService,
    private dialogsListService: DialogsListService,
    private dialog: MatDialog,
    private syncService: SyncService,
    private configurationService: ConfigurationService,
    private activityService: ReportsService
  ) {}

  ngOnInit() {
    if (this.planetType !== 'center') {
      this.checkRequestStatus();
      this.getPushedList();
    }
    this.isUserAdmin = this.userService.get().isUserAdmin;
    if (!this.isUserAdmin) {
      // A non-admin user cannot receive all user docs
      this.displayDashboard = false;
      this.message = 'Access restricted to admins';
    } else if (this.planetType !== 'center') {
      const opts = { responseType: 'text', withCredentials: false, headers: { 'Content-Type': 'text/plain' } };
      this.getVersion(opts).subscribe((version: string) => this.versionLocal = version);
      this.getVersion({ domain: this.configurationService.configuration.parentDomain, ...opts })
        .subscribe((version: string) => this.versionParent = version);
    }
    this.getSatellitePin();
    this.getLogs();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getSatellitePin() {
    this.couchService.get('_node/nonode@nohost/_config/satellite/pin').subscribe((res) => this.pin = res);
  }

  resendConfig() {
    const configuration = this.configurationService.configuration;
    const userDetail = { ...this.userService.get(), ...this.userService.credentials };
    this.configurationService.updateConfiguration({ ...configuration, registrationRequest: 'pending' }).subscribe(null,
      error => this.planetMessageService.showAlert('An error occurred please try again.'),
      () => {
        this.planetMessageService.showMessage('Registration request has been sent successfully.');
        this.showResendConfiguration = false;
      }
    );
  }

  checkRequestStatus() {
    this.couchService.post(`communityregistrationrequests/_find`,
      findDocuments({ 'code': this.configurationService.configuration.code }, [ 'registrationRequest' ]),
      { domain: this.configurationService.configuration.parentDomain }).subscribe(data => {
        if (data.docs.length === 0) {
          this.showResendConfiguration = true;
          this.requestStatus = 'deleted';
        } else {
          this.requestStatus = data.docs[0].registrationRequest;
        }
      }, error => (error));
  }

  // Find on the user or shelf db (which have matching ids)
  findOnParent(db: string, user: any) {
    return this.couchService.post(`${db}/_find`,
      { 'selector': { '_id': user._id }, 'fields': [ '_id', '_rev' ] },
      { domain: this.configurationService.configuration.parentDomain });
  }

  deleteCommunity() {
    return () => {
      this.couchService.get('_users/org.couchdb.user:satellite').pipe(switchMap((res) =>
        forkJoin([
          this.couchService.delete('_users/org.couchdb.user:satellite?rev=' + res._rev),
          this.couchService.delete('_node/nonode@nohost/_config/satellite/pin')
        ])
      ),
      switchMap(() => this.couchService.allDocs('_replicator')),
      switchMap((docs: any) => {
        const replicators = docs.map(doc => {
          return { _id: doc._id, _rev: doc._rev, _deleted: true };
        });
        const configuration = this.configurationService.configuration;
        return forkJoin([
          this.couchService.delete('shelf/' + this.userService.get()._id + '?rev=' + this.userService.shelf._rev ),
          this.couchService.delete('configurations/' + configuration._id + '?rev=' + configuration._rev ),
          this.couchService.delete('_users/' + this.userService.get()._id + '?rev=' + this.userService.get()._rev ),
          this.couchService.delete('_node/nonode@nohost/_config/admins/' + this.userService.get().name, { withCredentials: true }),
          this.couchService.post('_replicator/_bulk_docs', { 'docs': replicators })
        ]);
      })).subscribe((res: any) => {
        this.deleteCommunityDialog.close();
        this.router.navigate([ '/login/configuration' ]);
      }, error => this.planetMessageService.showAlert('An error occurred please try again.'));
    };
  }

  openDeleteCommunityDialog() {
    this.deleteCommunityDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteCommunity(),
        changeType: 'delete',
        type: 'community',
        displayName: this.userService.get().name
      }
    });
    // Reset the message when the dialog closes
    this.deleteCommunityDialog.afterClosed().pipe(debug('Closing dialog')).subscribe();
  }

  setFilterPredicate(db: string) {
    switch (db) {
      case 'resources':
        return filterSpecificFields([ 'title' ]);
      case 'courses':
        return filterSpecificFields([ 'courseTitle' ]);
    }
  }

  sendOnAccept(db: string) {
    this.dialogsListService.getListAndColumns(db).pipe(takeUntil(this.onDestroy$)).subscribe(res => {
      const previousList = res.tableData.filter((doc: any) => doc.sendOnAccept === true),
        initialSelection = previousList.map((doc: any) => doc._id);
      const data = {
        okClick: this.sendOnAcceptOkClick(db, previousList).bind(this),
        filterPredicate: this.setFilterPredicate(db),
        allowMulti: true,
        initialSelection,
        selectionOptional: true,
        ...res };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: data,
        height: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

  sendOnAcceptOkClick(db: string, previousList: any) {
    return (selected: any) => {
      const removedItems = previousList.filter(item => selected.findIndex(i => i._id === item.id) < 0)
        .map(item => ({ ...item, sendOnAccept: false }));
      const dataUpdate = selected.map(item => ({ ...item, sendOnAccept: true })).concat(removedItems);
      if (db === 'courses') {
        this.handleCourseAttachments(selected, previousList);
      }
      this.couchService.post(db + '/_bulk_docs', { docs: dataUpdate }).subscribe(res => {
        this.planetMessageService.showMessage('Send on accept list updated');
      });
      this.dialogRef.close();
    };
  }

  handleCourseAttachments(courses, removedCourses) {
    const { resources, exams } = this.coursesService.attachedItemsOfCourses(courses);
    // Not automatically removing attached resources because they can be selected independently
    const previousExams = this.coursesService.attachedItemsOfCourses(removedCourses).exams;
    this.sendOnAcceptOkClick('resources', [])(resources);
    this.sendOnAcceptOkClick('exams', previousExams)(exams);
  }

  getPushedList() {
    this.couchService.post(`send_items/_find`,
      findDocuments({ 'sendTo': this.configurationService.configuration.code }),
        { domain: this.configurationService.configuration.parentDomain })
    .subscribe(data => {
      this.pushedItems = data.docs.reduce((items, item) => {
        items[item.db] = items[item.db] ? items[item.db] : [];
        items[item.db].push(item);
        return items;
      }, {});
    });
  }

  getPushedItem(db: string) {
    const deleteItems = this.pushedItems[db].map(item => ({ _id: item._id, _rev: item._rev, _deleted: true }));
    const itemList = this.pushedItems[db].map(item => item.item);
    const replicators = [ { db, type: 'pull', date: true, items: itemList } ];
    this.syncService.confirmPasswordAndRunReplicators(replicators).pipe(
      switchMap(data => {
        return this.couchService.post('send_items/_bulk_docs', { docs:  deleteItems },
        { domain: this.configurationService.configuration.parentDomain });
      })
    ).subscribe(() => this.planetMessageService.showMessage(db[0].toUpperCase() + db.substr(1) + ' are being fetched'));
  }

  resetPin() {
    const userName = 'org.couchdb.user:satellite';
    this.couchService.get('_users/' + userName)
    .pipe(switchMap((data) => {
      const { derived_key, iterations, password_scheme, salt, ...satelliteProfile } = data;
      satelliteProfile.password = this.userService.createPin();
      return forkJoin([
        this.couchService.put('_users/' + userName, satelliteProfile),
        this.couchService.put('_node/nonode@nohost/_config/satellite/pin', satelliteProfile.password)
      ]);
    })).subscribe((res) => {
      this.getSatellitePin();
      this.planetMessageService.showMessage('Pin reset successfully');
    }, (error) => this.planetMessageService.showAlert('Error to reset pin'));
  }

  getVersion(opts: any = {}) {
    return this.couchService.getUrl('version', opts).pipe(catchError(() => of('N/A')));
  }

  getLogs() {
    const configuration = this.configurationService.configuration;
    forkJoin([
      this.activityService.getLoginActivities(configuration.code),
      this.activityService.getAdminActivities(configuration.code),
      this.activityService.getResourceVisits(configuration.code),
      this.activityService.getRatingInfo(configuration.code)
    ]).subscribe(([ loginActivities, adminActivities, resourceVisits, ratings ]) => {
      this.activityLogs = {
        resourceVisits: resourceVisits[0].count,
        ratings: ratings.reduce((total, rating) => total + rating.count, 0),
        ...this.activityService.mostRecentAdminActivities(configuration, loginActivities, adminActivities)
      };
    });
  }

}
