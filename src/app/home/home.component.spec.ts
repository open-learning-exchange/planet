import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, NavigationEnd, NavigationSkipped, NavigationSkippedCode } from '@angular/router';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MaterialModule } from '../shared/material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { HomeComponent } from './home.component';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { PouchAuthService } from '../shared/database/pouch-auth.service';

describe('Home', () => {

  let activeFixture: ComponentFixture<HomeComponent>;

  const setup = () => {
    const routerEvents = new Subject<NavigationEnd | NavigationSkipped>();
    TestBed.configureTestingModule({
      imports: [ RouterTestingModule, BrowserAnimationsModule, CommonModule, MaterialModule, HomeComponent ],
      providers: [ CouchService, UserService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting() ]
    });
    TestBed.overrideComponent(HomeComponent, {
      set: {
        template: `
          <mat-toolbar #toolbar></mat-toolbar>
          <mat-sidenav-container #content>
            @if (isMobile) {
              <mat-sidenav #mobileSidenav mode="over"></mat-sidenav>
            } @else {
              <mat-sidenav mode="side" opened></mat-sidenav>
            }
            <mat-sidenav-content></mat-sidenav-content>
          </mat-sidenav-container>
        `
      }
    });
    const router = TestBed.inject(Router);
    Object.defineProperty(router, 'events', { value: routerEvents.asObservable(), configurable: true });
    const fixture = TestBed.createComponent(HomeComponent);
    const comp = fixture.componentInstance;
    activeFixture = fixture;
    return { fixture, comp, routerEvents };
  };

  // Renders a real drawer without unrelated navigation directives.
  const renderNav = (isMobile: boolean) => {
    const context = setup();
    context.comp.isMobile = isMobile;
    context.fixture.detectChanges();
    return context;
  };

  const navigationEnd = (url: string) => new NavigationEnd(1, url, url);

  const sameUrlSkipped = (url: string) => new NavigationSkipped(
    2, url, 'Navigation to the current URL was ignored', NavigationSkippedCode.IgnoredSameUrlNavigation
  );

  afterEach(() => {
    activeFixture?.destroy();
    activeFixture = undefined;
  });

  it('Should be a HomeComponent', () => {
    const { comp } = setup();
    expect(comp instanceof HomeComponent).toBe(true, 'Should create HomeComponent');
  });

  it('should close the mobile nav when a new page is selected', () => {
    const { fixture, comp, routerEvents } = renderNav(true);
    comp.toggleNav();
    fixture.detectChanges();
    expect(comp.mobileSidenav.opened).toBe(true);

    routerEvents.next(navigationEnd('/courses'));

    expect(comp.mobileSidenav.opened).toBe(false);
  });

  it('should close the mobile nav when the current page is re-selected', () => {
    const { fixture, comp, routerEvents } = renderNav(true);
    comp.toggleNav();
    fixture.detectChanges();

    routerEvents.next(sameUrlSkipped('/'));

    expect(comp.mobileSidenav.opened).toBe(false);
  });

  it('should close the mobile nav when query parameters change', () => {
    const { fixture, comp, routerEvents } = renderNav(true);
    comp.toggleNav();
    fixture.detectChanges();

    routerEvents.next(navigationEnd('/courses?page=2'));

    expect(comp.mobileSidenav.opened).toBe(false);
  });

  it('should leave the desktop nav rail alone on navigation', () => {
    const { comp, routerEvents } = renderNav(false);
    comp.toggleNav();

    routerEvents.next(navigationEnd('/courses'));

    expect(comp.sidenavState).toBe('open');
    expect(comp.mobileSidenav).toBeUndefined();
  });

  it('should not start the content margin interval for the mobile overlay nav', () => {
    const { comp } = renderNav(true);

    comp.toggleNav();
    comp.toggleNav();

    expect(comp.animDisp).toBeUndefined();
  });

  it('should stop the content margin interval when the desktop nav finishes animating', () => {
    const { comp } = renderNav(false);

    comp.toggleNav();
    expect(comp.animDisp.closed).toBe(false);
    const firstRun = comp.animDisp;
    comp.toggleNav();

    expect(firstRun.closed).toBe(true);
    comp.endAnimation();
    expect(comp.animDisp.closed).toBe(true);
  });

  it('should stop closing the nav once the component is destroyed', () => {
    const { comp, routerEvents } = renderNav(true);
    comp.toggleNav();
    comp.ngOnDestroy();
    const close = vi.spyOn(comp.mobileSidenav, 'close');

    routerEvents.next(navigationEnd('/courses'));

    expect(close).not.toHaveBeenCalled();
  });

  // Shared state makes reading the user after unset() fail the test.
  const setupLogout = (parentDelete, { user = { name: 'admin' }, configuration = {} }: any = {}) => {
    const { comp } = setup();
    let currentUser: any = user;
    vi.spyOn(TestBed.inject(StateService), 'configuration', 'get').mockReturnValue({
      adminName: 'admin@community', parentDomain: 'parent.example', planetType: 'community', ...configuration
    });
    const userService = TestBed.inject(UserService);
    vi.spyOn(userService, 'get').mockImplementation(() => currentUser);
    vi.spyOn(userService, 'endSessionLog').mockReturnValue(of({}));
    vi.spyOn(TestBed.inject(PouchAuthService), 'logout').mockReturnValue(of({}));
    const unset = vi.spyOn(userService, 'unset').mockImplementation(() => currentUser = { name: '' });
    const deleteSession = vi.spyOn(TestBed.inject(CouchService), 'delete').mockReturnValue(parentDelete);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    return { comp, unset, deleteSession, navigate };
  };

  it('should unset the user and navigate while the parent session delete is still pending', () => {
    const parentDelete = new Subject<any>();
    const { comp, unset, deleteSession, navigate } = setupLogout(parentDelete);

    comp.logoutClick();

    expect(deleteSession).toHaveBeenCalledWith('_session', { withCredentials: true, domain: 'parent.example' });
    expect(parentDelete.observers.length).toBe(1);
    expect(unset).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith([ '/' ], {});
  });

  it('should complete logout when the parent session delete fails', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { comp, unset, navigate } = setupLogout(throwError(() => new Error('parent unreachable')));

    comp.logoutClick();

    expect(unset).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith([ '/' ], {});
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('should not delete a parent session when the user is not the local admin', () => {
    const { comp, unset, deleteSession, navigate } = setupLogout(new Subject<any>(), { user: { name: 'learner' } });

    comp.logoutClick();

    expect(deleteSession).not.toHaveBeenCalled();
    expect(unset).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith([ '/' ], {});
  });

  it('should not delete a parent session on a center, which has no parent', () => {
    const { comp, unset, deleteSession, navigate } = setupLogout(new Subject<any>(), {
      configuration: { adminName: 'admin@center', parentDomain: '', planetType: 'center' }
    });

    comp.logoutClick();

    expect(deleteSession).not.toHaveBeenCalled();
    expect(unset).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith([ '/login' ], {});
  });

  it('should complete logout when neither the configuration nor the user carries a name', () => {
    const { comp, unset, deleteSession, navigate } = setupLogout(new Subject<any>(), {
      user: {}, configuration: { adminName: undefined }
    });

    comp.logoutClick();

    expect(deleteSession).not.toHaveBeenCalled();
    expect(unset).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith([ '/' ], {});
  });

});
