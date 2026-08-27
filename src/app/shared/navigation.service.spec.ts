import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationStart, NavigationEnd, provideRouter, Router, withRouterConfig } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { FALLBACK_NAVIGATION, NavigationService, navigationRouterOptions } from './navigation.service';

describe('NavigationService', () => {
  let events: Subject<any>;
  let router: any;
  let location: any;
  let service: NavigationService;

  // Asserts the navigation carries the fallback marker, without which the service
  // would count it as a new entry and let repeated back loop through fallbacks
  const expectFallbackNavigation = (spy: any, target: any, extras: object = {}) => {
    const [ calledTarget, calledExtras ] = spy.mock.calls.at(-1);
    expect(calledTarget).toEqual(target);
    expect(calledExtras[FALLBACK_NAVIGATION]).toBe(true);
    expect(calledExtras.replaceUrl).not.toBe(true);
    expect(calledExtras).toMatchObject(extras);
  };

  const navigate = (
    id: number,
    trigger: 'imperative' | 'popstate' = 'imperative',
    restoredId: number = null,
    replaceUrl = false,
    extras: Record<PropertyKey, unknown> = {}
  ) => {
    router.getCurrentNavigation = () => ({ extras: { ...extras, replaceUrl } });
    events.next(new NavigationStart(id, `/url-${id}`, trigger, restoredId !== null ? { navigationId: restoredId } : null));
    events.next(new NavigationEnd(id, `/url-${id}`, `/url-${id}`));
  };

  beforeEach(() => {
    events = new Subject<any>();
    router = { events, navigate: vi.fn(), navigateByUrl: vi.fn(), getCurrentNavigation: () => null };
    location = { back: vi.fn() };
    service = new NavigationService(router, location);
  });

  it('falls back to the given route on a cold start (deep link or refresh)', () => {
    navigate(1);
    service.back([ '../../' ], { relativeTo: 'route' } as any);
    expect(location.back).not.toHaveBeenCalled();
    expectFallbackNavigation(router.navigate, [ '../../' ], { relativeTo: 'route' });
  });

  it('uses browser history when a previous in-app page exists', () => {
    navigate(1);
    navigate(2);
    service.back();
    expect(location.back).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('tracks position across browser back so the stack does not underflow', () => {
    navigate(1);
    navigate(2);
    navigate(3, 'popstate', 1);
    service.back([ '/fallback' ]);
    expect(location.back).not.toHaveBeenCalled();
    expectFallbackNavigation(router.navigate, [ '/fallback' ]);
  });

  it('is not fooled by browser forward (popstate is not always back)', () => {
    navigate(1);
    navigate(2);
    navigate(3, 'popstate', 1);
    navigate(4, 'popstate', 2);
    service.back();
    expect(location.back).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not count replaceUrl navigations as new history entries', () => {
    navigate(1);
    navigate(2, 'imperative', null, true);
    service.back([ '/list' ]);
    expect(location.back).not.toHaveBeenCalled();
    expectFallbackNavigation(router.navigate, [ '/list' ]);
  });

  it('treats popstate to an entry from a previous document as history start', () => {
    navigate(1);
    navigate(2);
    navigate(3, 'popstate', 99);
    service.back([ '/' ]);
    expect(location.back).not.toHaveBeenCalled();
    expectFallbackNavigation(router.navigate, [ '/' ]);
  });

  it('resumes normal counting after a browser back then a new navigation', () => {
    navigate(1);
    navigate(2);
    navigate(3, 'popstate', 1);
    navigate(4);
    service.back();
    expect(location.back).toHaveBeenCalled();
  });

  it('accepts a serialized URL fallback without replacing the current entry', () => {
    navigate(1);
    service.back('/courses/update/abc;continue=true');
    expect(location.back).not.toHaveBeenCalled();
    expectFallbackNavigation(router.navigateByUrl, '/courses/update/abc;continue=true');
  });

  it('preserves caller navigation info exactly on a fallback', () => {
    const info = 'caller-info';
    navigate(1);
    service.back([ '/parent' ], { info });

    expectFallbackNavigation(router.navigate, [ '/parent' ], { info });
    expect(router.navigate.mock.calls[0][1].info).toBe(info);
  });

  it('keeps pushed fallbacks at logical history start so repeated back does not loop', () => {
    navigate(1);
    service.back([ '/parent' ]);
    const fallbackExtras = router.navigate.mock.calls[0][1];
    navigate(2, 'imperative', null, false, fallbackExtras);
    service.back([ '/grandparent' ]);
    expect(location.back).not.toHaveBeenCalled();
    expectFallbackNavigation(router.navigate, [ '/grandparent' ]);
  });
});

@Component({ template: '' })
class BlankComponent {}

describe('NavigationService (router integration)', () => {
  let service: NavigationService;
  let location: Location;
  let harness: RouterTestingHarness;
  let allowGuardedNavigation: boolean;
  let guardedCanDeactivate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    allowGuardedNavigation = true;
    guardedCanDeactivate = vi.fn(() => allowGuardedNavigation);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'guarded-editor', component: BlankComponent, canDeactivate: [ guardedCanDeactivate ] },
          { path: '**', component: BlankComponent }
        ], withRouterConfig(navigationRouterOptions)),
        provideLocationMocks()
      ]
    });
    service = TestBed.inject(NavigationService);
    location = TestBed.inject(Location);
    TestBed.inject(Router).setUpLocationChangeListener();
    harness = await RouterTestingHarness.create();
  });

  const settle = async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
    await harness.fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
    await harness.fixture.whenStable();
  };

  it('pushes cold-start fallbacks without making Planet back loop into the abandoned child', async () => {
    await harness.navigateByUrl('/teams/view/t1/courses/c1');
    service.back([ '/teams/view/t1' ]);
    await settle();
    expect(location.path()).toBe('/teams/view/t1');
    service.back([ '/teams' ]);
    await settle();
    expect(location.path()).toBe('/teams');

    location.back();
    await settle();
    expect(location.path()).toBe('/teams/view/t1');

    location.back();
    await settle();
    expect(location.path()).toBe('/teams/view/t1/courses/c1');
  });

  it('walks real browser history back after in-app navigation', async () => {
    await harness.navigateByUrl('/teams');
    await harness.navigateByUrl('/teams/view/t1');
    service.back([ '/never-used' ]);
    await settle();
    expect(location.path()).toBe('/teams');
  });

  it('restores browser position when guarded back navigation is canceled', async () => {
    await harness.navigateByUrl('/parent');
    await harness.navigateByUrl('/guarded-editor');
    allowGuardedNavigation = false;

    service.back([ '/unused' ]);
    await settle();
    expect(guardedCanDeactivate).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/guarded-editor');
    expect(location.path()).toBe('/guarded-editor');

    allowGuardedNavigation = true;
    service.back([ '/unused' ]);
    await settle();
    expect(location.path()).toBe('/parent');
  });

  // The course-form/exam-editor flow: the form rewrites its own history entry to
  // its ;continue=true URL before pushing the editor, so leaving the editor pops
  // into the restored form, and cancelling the form pops to the list — no loop
  it('pops into a replace-rewritten entry and then out to the page before it', async () => {
    const router = TestBed.inject(Router);
    await harness.navigateByUrl('/courses');
    await harness.navigateByUrl('/courses/update/abc');
    await router.navigateByUrl('/courses/update/abc;continue=true', { replaceUrl: true });
    await router.navigateByUrl('/courses/exam;type=exam');
    service.back('/unused-fallback');
    await settle();
    expect(location.path()).toBe('/courses/update/abc;continue=true');
    service.back([ '/unused' ]);
    await settle();
    expect(location.path()).toBe('/courses');
  });
});
