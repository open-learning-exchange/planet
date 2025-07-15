import { Component, OnInit, isDevMode, OnDestroy, HostListener } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { switchMap, takeUntil } from 'rxjs/operators';
import { forkJoin, Subject } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { debug } from '../debug-operator';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { filterSpecificFields, createDeleteArray } from '../shared/table-helpers';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { CoursesService } from '../courses/courses.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { ManagerService } from './manager.service';
import { StateService } from '../shared/state.service';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';

@Component({
  templateUrl: './manager-dashboard.component.html',
  styles: [ `
    .view-container > * {
      margin-bottom: 0.5rem;
    }
    .view-container > *:last-child {
      margin-bottom: 0;
    }
    .send-view {
      padding-bottom: 0;
    }
    .list-view {
      padding-top: 0;
    }
    .mat-raised-button {
      margin: 0.25rem;
    }
    .card-container {
      display: flex;
      flex-wrap: wrap;
    }
    .version-card {
      flex: 1;
      max-width: calc(50% - 20px);
      margin: 1rem;
    }
    .pinClass {
      font-size: 1.5rem;
    }
    mat-slide-toggle {
      padding: 3px;
    }
    .mobile-activity-stats {
  margin-top: 16px;
}

.mobile-stat-row {
  display: flex;
  margin-bottom: 12px;
  gap: 8px;
}

.mobile-stat-item {
  flex: 1;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.mobile-stat-title {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  line-height: 1.2;
}

.mobile-stat-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}
  ` ]
})

export class ManagerDashboardComponent implements OnInit, OnDestroy {
  isUserAdmin = false;
  planetConfiguration = this.stateService.configuration;
  planetType = this.planetConfiguration.planetType;
  showResendConfiguration = false;
  requestStatus = 'loading';
  devMode = isDevMode();
  deleteCommunityDialog: any;
  versionLocal = '';
  versionParent = '';
  versionLatestApk = '';
  versionLocalApk = '';
  dialogRef: MatDialogRef<DialogsListComponent>;
  pin: string;
  activityLogs: any = {};
  private onDestroy$ = new Subject<void>();
  fetchItemCount = 0;
  pendingPushCount = 0;
  isHub = false;
  streaming: boolean;
  overlayOpen = false;
  isMobile: boolean;
  gridRowHeight = '2rem';

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private coursesService: CoursesService,
    private router: Router,
    private planetMessageService: PlanetMessageService,
    private dialogsListService: DialogsListService,
    private dialog: MatDialog,
    private configurationService: ConfigurationService,
    private stateService: StateService,
    private managerService: ManagerService,
    private deviceInfoService: DeviceInfoService
  ) {}

  ngOnInit() {
    this.streaming = this.planetConfiguration.streaming;
    this.isUserAdmin = this.userService.get().isUserAdmin;
    if (this.planetType !== 'center') {
      this.checkRequestStatus();
      this.setVersions();
      this.checkHub();
    }
    this.getSatellitePin();
    this.couchService.currentTime().pipe(switchMap((time: number) => {
      const tillDate = new Date(time);
      return this.managerService.getLogs(new Date(tillDate.getFullYear(), tillDate.getMonth(), tillDate.getDate() - 30).getTime());
    })).subscribe(logs => this.activityLogs = logs);
    this.countFetchItemAvailable();
    forkJoin([
      this.couchService.findAll('send_items'),
      this.managerService.getChildPlanets(true)
    ]).subscribe(([ items, child ]: [ any, any ]) => {
      this.pendingPushCount = items.reduce(
        (planets, item) => planets.concat(
          planets.indexOf(item.sendTo) > -1 || child.findIndex(p => p.code === item.sendTo) === -1 ? [] : [ item.sendTo ]
        ), []
      ).length;
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getSatellitePin() {
    this.couchService.get('_node/nonode@nohost/_config/satellite/pin').subscribe((res) => this.pin = res);
  }

  resendConfig() {
    const configuration = this.planetConfiguration;
    this.configurationService.updateConfiguration({ ...configuration, registrationRequest: 'pending' }).subscribe(null,
      error => this.planetMessageService.showAlert($localize`An error occurred please try again.`),
      () => {
        this.planetMessageService.showMessage($localize`Registration request has been sent successfully.`);
        this.showResendConfiguration = false;
      }
    );
  }

  checkHub() {
    this.couchService.findAll('hubs',
      findDocuments({ 'planetId': this.planetConfiguration._id }, [ '_id' ], [], 1),
      { domain: this.planetConfiguration.parentDomain }
    ).subscribe(hub => this.isHub = hub.length > 0);
  }

  countFetchItemAvailable() {
    this.managerService.getPushedList().subscribe((pushedList: any) => {
      this.fetchItemCount = pushedList.length;
    });
  }

  checkRequestStatus() {
    this.couchService.post(`communityregistrationrequests/_find`,
      findDocuments({ 'code': this.planetConfiguration.code }, [ 'registrationRequest' ]),
      { domain: this.planetConfiguration.parentDomain }).subscribe(data => {
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
      { domain: this.planetConfiguration.parentDomain });
  }

  deleteCommunity() {
    return {
      request: this.couchService.get('_users/org.couchdb.user:satellite').pipe(switchMap((res) =>
        forkJoin([
          this.couchService.delete('_users/org.couchdb.user:satellite?rev=' + res._rev),
          this.couchService.delete('_node/nonode@nohost/_config/satellite/pin')
        ])
      ),
      switchMap(() => this.couchService.findAll('_replicator')),
      switchMap((docs: any) => {
        const replicators = createDeleteArray(docs);
        const configuration = this.planetConfiguration;
        return forkJoin([
          this.couchService.delete('shelf/' + this.userService.get()._id + '?rev=' + this.userService.shelf._rev ),
          this.couchService.delete('configurations/' + configuration._id + '?rev=' + configuration._rev ),
          this.couchService.delete('_users/' + this.userService.get()._id + '?rev=' + this.userService.get()._rev ),
          this.couchService.delete('_node/nonode@nohost/_config/admins/' + this.userService.get().name, { withCredentials: true }),
          this.couchService.post('_replicator/_bulk_docs', { 'docs': replicators })
        ]);
      })),
      onNext: (res: any) => {
        this.deleteCommunityDialog.close();
        this.router.navigate([ '/login/configuration' ]);
      },
      onError: error => this.planetMessageService.showAlert($localize`An error occurred please try again.`)
    };
  }

  openDeleteCommunityDialog() {
    this.deleteCommunityDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteCommunity(),
        changeType: 'delete',
        type: 'community',
        displayName: this.planetConfiguration.name
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
        itemDescription: db,
        nameProperty: db === 'courses' ? 'courseTitle' : 'title',
        allowMulti: true,
        initialSelection,
        selectionOptional: true,
        ...res };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: data,
        maxHeight: '500px',
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
      switch (db) {
        case 'courses':
          this.handleCourseAttachments(selected, previousList);
          break;
        case 'resources':
          this.handleResourceAttachments(selected);
          break;
      }
      this.couchService.post(db + '/_bulk_docs', { docs: dataUpdate }).subscribe(res => {
        this.planetMessageService.showMessage($localize`Send on accept list updated`);
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

  handleResourceAttachments(resources) {
    const tagIds = [].concat.apply([], resources.map((resource: any) => resource.tags || []));
    if (tagIds.length > 0) {
      this.couchService.findAll('tags', findDocuments({ '_id': { '$in': tagIds } })).subscribe((tags) => {
        this.sendOnAcceptOkClick('tags', [])(tags);
      });
    }
  }

  resetPin() {
    const userName = 'org.couchdb.user:satellite';
    this.couchService.get('_users/' + userName)
    .pipe(switchMap((data) => {
      const { derived_key, iterations, password_scheme, salt, ...satelliteProfile } = data;
      satelliteProfile.password = this.managerService.createPin();
      return forkJoin([
        this.couchService.put('_users/' + userName, satelliteProfile),
        this.couchService.put('_node/nonode@nohost/_config/satellite/pin', satelliteProfile.password)
      ]);
    })).subscribe((res) => {
      this.getSatellitePin();
      this.planetMessageService.showMessage($localize`Pin reset successfully`);
    }, (error) => this.planetMessageService.showAlert($localize`Error to reset pin`));
  }

  setVersions() {
    const opts = { responseType: 'text', withCredentials: false, headers: { 'Content-Type': 'text/plain' } };
    this.managerService.getVersion('planet', opts).subscribe((version: string) => this.versionLocal = version);
    this.managerService.getVersion('planet', { domain: this.planetConfiguration.parentDomain, ...opts })
      .subscribe((version: string) => this.versionParent = version);
    forkJoin([
      this.managerService.getVersion('myPlanet', opts),
      this.managerService.getApkLatestVersion(opts)
    ]).subscribe(( [ localVersion, latestVersion ]: [ string, any ]) => {
      this.versionLocalApk = localVersion.replace(/v/gi, '').trim();
      this.versionLatestApk = (latestVersion.latestapk || 'N/A').replace(/v/gi, '').trim();
    });
  }

  @HostListener('window:resize')
  onResize() {
    const deviceType = this.deviceInfoService.getDeviceType();
this.isMobile = [DeviceType.MOBILE, DeviceType.SMALL_MOBILE, DeviceType.TABLET].includes(deviceType);
    this.gridRowHeight = this.isMobile ? '3.6rem' : '2rem';
  }

}
