import { Component, Input, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { interval, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { debug } from '../debug-operator';

@Component({
  selector: 'planet-home-modern',
  templateUrl: './home-modern.component.html',
  styleUrls: [ './home.scss' ],
  animations: [
    trigger('sidenavState', [
      state('closed', style({
        width: '72px'
      })),
      state('open', style({
        width: '150px'
      })),
      transition('closed <=> open', animate('500ms ease'))
    ])
  ]
})
export class HomeModernComponent implements AfterViewInit, OnDestroy {
  sidenavState = 'closed';
  @ViewChild('content') private mainContent;
  @Input() notifications = [];
  @Input() user: any = {};
  @Input() userImgSrc = '';

  // Sets the margin for the main content to match the sidenav width
  animObs = interval(15).pipe(
    debug('Menu animation'),
    tap(() => {
      this.mainContent._updateContentMargins();
      this.mainContent._changeDetectorRef.markForCheck();
    }
  ));
  // For disposable returned by observer to unsubscribe
  animDisp: any;

  private onDestroy$ = new Subject<void>();

  @Input() logoutClick: any = () => {};
  @Input() readNotification: any = () => {};
  @Input() backgroundRoute: any = () => {};

  constructor() {}

  ngAfterViewInit() {
    this.mainContent._updateContentMargins();
    this.mainContent._changeDetectorRef.markForCheck();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
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

}
