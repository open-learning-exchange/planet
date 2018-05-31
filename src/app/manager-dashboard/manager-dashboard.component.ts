import { Component, OnInit, isDevMode } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatDialog } from '@angular/material';
import { Router } from '@angular/router';
import { debug } from '../debug-operator';

@Component({
  template: `
    <div *ngIf="displayDashboard">
      <span *ngIf="planetType !== 'community'">
        <a routerLink="/requests" i18n mat-raised-button>Requests</a>
        <a routerLink="/associated/{{ planetType === 'center' ? 'nation' : 'community' }}"
          i18n mat-raised-button>{{ planetType === 'center' ? 'Nation' : 'Community' }}</a>
      </span>
      <button *ngIf="planetType !== center && showResendConfiguration"
        (click)="resendConfig()" i18n mat-raised-button>Resend Registration Request</button>
      <button *ngIf="planetType === 'community' && devMode"
        (click)="openDeleteCommunityDialog()" i18n mat-raised-button>Delete Community</button>
      <a routerLink="/feedback" i18n mat-raised-button>Feedback</a>
    </div>
    <div class="view-container" *ngIf="displayDashboard && planetType !== 'center'">
      <h3 i18n *ngIf="showParentList">{{ planetType === 'community' ? 'Nation' : 'Center' }} List</h3><br />
      <ng-container [ngSwitch]="requestStatus">
        <ng-container *ngSwitchCase="'accepted'">
          <a routerLink="resources" i18n mat-raised-button>List Resources</a>
          <a routerLink="courses" i18n mat-raised-button>List Courses</a>
          <a routerLink="meetups" i18n mat-raised-button>List Meetups</a>
        </ng-container>
        <p *ngSwitchCase="'loading'" i18n>Checking request status...</p>
        <p *ngSwitchDefault i18n>Your request has not been accepted by parent</p>
      </ng-container>
    </div>
    <div>{{message}}</div>
  `
})

export class ManagerDashboardComponent implements OnInit {
  isUserAdmin = false;
  displayDashboard = true;
  message = '';
  planetType = this.userService.getConfig().planetType;
  showResendConfiguration = false;
  requestStatus = 'loading';
  devMode = isDevMode();
  deleteCommunityDialog: any;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private router: Router,
    private planetMessageService: PlanetMessageService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.checkRequestStatus();
    this.isUserAdmin = this.userService.get().isUserAdmin;
    if (!this.isUserAdmin) {
      // A non-admin user cannot receive all user docs
      this.displayDashboard = false;
      this.message = 'Access restricted to admins';
    }
  }

  resendConfig() {
    const { _id, _rev, ...config } = this.userService.getConfig();
    let userDetail: any, userRev;
    this.couchService.get('_users/org.couchdb.user:' + this.userService.get().name)
      .pipe(switchMap((user: any) => {
        // Outer parenthesis allow for object destructuring on existing variables
        ({ _rev: userRev, ...userDetail } = user);
        userDetail.isUserAdmin = false;
        return this.couchService.post('communityregistrationrequests', config, { domain: config.parentDomain });
      }), switchMap((res: any) => {
        userDetail.requestId = res.id;
        return forkJoin([ this.findOnParent('_users', userDetail), this.findOnParent('shelf', userDetail) ]);
      }), switchMap(([ user, shelf ]) => {
        if (user.docs[0]) {
          userDetail._rev = user.docs[0]._rev;
        }
        const obs = [ this.couchService.put('_users/org.couchdb.user:' + userDetail.name, userDetail, { domain: config.parentDomain }) ];
        if (!shelf) {
          obs.push(this.couchService.put('shelf/org.couchdb.user:' + userDetail.name, {}, { domain: config.parentDomain }));
        }
        return forkJoin(obs);
      })).subscribe((res: any) => {
        this.planetMessageService.showMessage('Registration request has been sent successfully.');
        this.showResendConfiguration = false;
      }, error => this.planetMessageService.showAlert('An error occurred please try again.'));
  }

  checkRequestStatus() {
    this.couchService.post(`communityregistrationrequests/_find`,
      findDocuments({ 'code': this.userService.getConfig().code }, [ 'registrationRequest' ]),
      { domain: this.userService.getConfig().parentDomain }).subscribe(data => {
        if (data.docs.length === 0) {
          this.showResendConfiguration = true;
        }
        this.requestStatus = data.docs[0].registrationRequest;
      }, error => (error));
  }

  // Find on the user or shelf db (which have matching ids)
  findOnParent(db: string, user: any) {
    return this.couchService.post(`${db}/_find`,
      { 'selector': { '_id': user._id }, 'fields': [ '_id', '_rev' ] },
      { domain: this.userService.getConfig().parentDomain });
  }

  deleteCommunity() {
     return () => {
      this.couchService.allDocs('_replicator').pipe(switchMap((docs: any) => {
        const replicators = docs.map(doc => ({ ...doc, '_deleted': true }));
        return forkJoin([
          this.couchService.delete('shelf/' + this.userService.get()._id + '?rev=' + this.userService.shelf._rev ),
          this.couchService.delete('configurations/' + this.userService.getConfig()._id + '?rev=' + this.userService.getConfig()._rev ),
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

}
