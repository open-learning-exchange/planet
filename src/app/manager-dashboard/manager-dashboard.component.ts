import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { findOneDocument } from '../shared/mangoQueries';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  template: `
    <div *ngIf="displayDashboard">
      <span *ngIf="planetType !== 'community'">
        <a routerLink="/requests" i18n mat-raised-button>Requests</a>
        <a routerLink="/associated/{{ planetType === 'center' ? 'nation' : 'community' }}"
          i18n mat-raised-button>{{ planetType === 'center' ? 'Nation' : 'Community' }}</a>
      </span>
      <button *ngIf="planetType !== center" (click)="resendConfig()" i18n mat-raised-button>Resend Registration Request</button>
      <a routerLink="/feedback" i18n mat-raised-button>Feedback</a>
    </div>
    <div class="view-container" *ngIf="displayDashboard && planetType !== 'center'">
      <h3 i18n>{{ planetType === 'community' ? 'Nation' : 'Center' }} List</h3><br />
      <a routerLink="resources" i18n mat-raised-button>List Resources</a>
      <a routerLink="courses" i18n mat-raised-button>List Courses</a>
      <a routerLink="meetups" i18n mat-raised-button>List Meetups</a>
    </div>
    <div>{{message}}</div>
  `
})

export class ManagerDashboardComponent implements OnInit {
  isUserAdmin = false;
  displayDashboard = true;
  message = '';
  planetType = this.userService.getConfig().planetType;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.isUserAdmin = this.userService.get().isUserAdmin;
    if (!this.isUserAdmin) {
      // A non-admin user cannot receive all user docs
      this.displayDashboard = false;
      this.message = 'Access restricted to admins';
    }
  }

  resendConfig() {
    const { _id, _rev, ...config } = this.userService.getConfig();
    this.couchService.post(`communityregistrationrequests/_find`, findOneDocument('name', this.userService.get().name),
      { domain: this.userService.getConfig().parentDomain }).pipe(switchMap((data: any) => {
        if (data.docs.length === 0) {
          return this.couchService.post('communityregistrationrequests', config, { domain: this.userService.getConfig().parentDomain })
            .pipe(switchMap((res: any) => {
              const userDetail = this.userService.get();
              delete userDetail['_rev'];
              userDetail['requestId'] =  res.id;
              userDetail['isUserAdmin'] =  false;
              return this.couchService.post(`_users/_find`,
                { 'selector': { '_id': this.userService.get()._id }, 'fields': [ '_id', '_rev' ] },
                  { domain: this.userService.getConfig().parentDomain })
                    .pipe(switchMap((user: any) => {
                      if (user.docs[0]) {
                        userDetail['_rev'] = user.docs[0]._rev;
                      }
                      return this.couchService.put('_users/org.couchdb.user:' + userDetail.name,
                        userDetail , { domain: this.userService.getConfig().parentDomain });
                    }));
             }));
        }
        return of({ ok: false });
      })).subscribe((res: any) => {
        res && res.ok ? this.planetMessageService.showMessage('Registration request has been send successfully.')
          : this.planetMessageService.showMessage('Registration request has already been send.');
      }, error => this.planetMessageService.showAlert('An error occurred please try again.'));
  }

}
