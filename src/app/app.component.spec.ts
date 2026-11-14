import { reflectComponentType } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { StateService } from '@shared/state.service';
import { AppComponent } from './app.component';

describe('App', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: HttpClient, useValue: HttpTestingController}]
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Should be an AppComponent', () => {
    expect(reflectComponentType(AppComponent)?.selector).toBe('planet-app');
    expect(fixture.nativeElement.firstElementChild).toMatchSnapshot();
  });
});

describe('App navigation blocker', () => {
  let gate: Subject<boolean | UrlTree>;
  const guard = vi.fn(() => gate);

  beforeEach(() => {
    gate = new Subject<boolean | UrlTree>();
    guard.mockClear();
    vi.stubGlobal('gtag', vi.fn());
    TestBed.configureTestingModule({
      imports: [ AppComponent ],
      providers: [
        provideRouter([ { path: 'slow', canActivate: [ guard ], children: [] } ]),
        { provide: StateService, useValue: { requestData: vi.fn() } }
      ]
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [ 'ends', () => gate.next(true) ],
    [ 'is cancelled', () => gate.next(false) ],
    [ 'fails', () => gate.error(new Error('guard failed')) ]
  ])('covers the page until the navigation %s', async (_, settle) => {
    const fixture = TestBed.createComponent(AppComponent);
    const blocker = () => fixture.nativeElement.querySelector('.navigation-blocker');
    const navigation = TestBed.inject(Router).navigateByUrl('/slow').catch(() => false);

    await vi.waitFor(() => expect(guard).toHaveBeenCalled());
    fixture.detectChanges();
    expect(blocker()).not.toBeNull();

    settle();
    await navigation;
    await fixture.whenStable();
    fixture.detectChanges();
    expect(blocker()).toBeNull();
  });

  it('stays up while a guard redirects to another slow navigation', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    const blocker = () => fixture.nativeElement.querySelector('.navigation-blocker');
    const navigation = router.navigateByUrl('/slow').catch(() => false);

    await vi.waitFor(() => expect(guard).toHaveBeenCalledTimes(1));
    const redirecting = gate;
    gate = new Subject<boolean | UrlTree>();
    redirecting.next(router.parseUrl('/slow?again=1'));

    await vi.waitFor(() => expect(guard).toHaveBeenCalledTimes(2));
    fixture.detectChanges();
    expect(blocker()).not.toBeNull();

    gate.next(true);
    await navigation;
    await fixture.whenStable();
    fixture.detectChanges();
    expect(blocker()).toBeNull();
    expect(router.url).toBe('/slow?again=1');
  });
});
