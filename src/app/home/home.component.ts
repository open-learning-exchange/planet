import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { interval } from 'rxjs/observable/interval';
import { tap } from 'rxjs/operators';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  templateUrl: './home.component.html',
  styleUrls: [ './home.scss' ],
  animations: [
    trigger('sidenavState', [
      state('closed', style({
        width: '72px';
      })),
      state('open', style({
        width: '150px';
      })),
      transition('closed <=> open', animate('500ms ease'))
    ])
  ]
})
export class HomeComponent implements OnInit, AfterViewInit {
  name = '';
  roles: string[] = [];
  sidenavState = 'closed';
  @ViewChild('content') private mainContent;

  // Sets the margin for the main content to match the sidenav width
  animObs = interval(15).pipe(tap(() => {
    this.mainContent._updateContentMargins();
    this.mainContent._changeDetectorRef.markForCheck();
  }));
  // For disposable returned by observer to unsubscribe
  animDisp: any;

  constructor(
    private couchService: CouchService,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit() {
    Object.assign(this, this.userService.get());
  }

  ngAfterViewInit() {
    this.mainContent._updateContentMargins();
    this.mainContent._changeDetectorRef.markForCheck();
  }

  backgroundRoute() {
    const routesWithBackground = [ 'resources' ];
    return routesWithBackground.findIndex((route) => this.router.url.indexOf(route) > -1) > -1;
  }

  toggleNav() {
    this.sidenavState = this.sidenavState === 'open' ? 'closed' : 'open';
    this.animDisp = this.animObs.subscribe();
  }

  endAnimation() {
    if (this.animDisp) {
      this.animDisp.unsubscribe();
    }
  }

  logoutClick() {
    this.couchService.delete('_session', { withCredentials: true }).subscribe((data: any) => {
      if (data.ok === true) {
        this.router.navigate([ '/login' ], {});
      }
    });
  }
}
