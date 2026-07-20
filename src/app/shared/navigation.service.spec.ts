import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationStart, NavigationEnd, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { NavigationService } from './navigation.service';

describe('NavigationService', () => {
  let events: Subject<any>;
  let router: any;
  let location: any;
  let service: NavigationService;

  const navigate = (id: number, trigger: 'imperative' | 'popstate' = 'imperative', restoredId: number = null, replaceUrl = false) => {
    router.getCurrentNavigation = () => ({ extras: { replaceUrl } });
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
    expect(router.navigate).toHaveBeenCalledWith([ '../../' ], { replaceUrl: true, relativeTo: 'route' });
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
    expect(router.navigate).toHaveBeenCalledWith([ '/fallback' ], { replaceUrl: true });
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
    expect(router.navigate).toHaveBeenCalledWith([ '/list' ], { replaceUrl: true });
  });

  it('treats popstate to an entry from a previous document as history start', () => {
    navigate(1);
    navigate(2);
    navigate(3, 'popstate', 99);
    service.back([ '/' ]);
    expect(location.back).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([ '/' ], { replaceUrl: true });
  });

  it('resumes normal counting after a browser back then a new navigation', () => {
    navigate(1);
    navigate(2);
    navigate(3, 'popstate', 1);
    navigate(4);
    service.back();
    expect(location.back).toHaveBeenCalled();
  });

  it('accepts a serialized URL fallback and replace-navigates to it', () => {
    navigate(1);
    service.back('/courses/update/abc;continue=true');
    expect(location.back).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/courses/update/abc;continue=true', { replaceUrl: true });
  });

  it('keeps the fallback at history start so repeated back does not loop into the abandoned page', () => {
    navigate(1);
    service.back([ '/parent' ]);
    navigate(2, 'imperative', null, true);
    service.back([ '/grandparent' ]);
    expect(location.back).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenLastCalledWith([ '/grandparent' ], { replaceUrl: true });
  });
});

@Component({ template: '' })
class BlankComponent {}

describe('NavigationService (router integration)', () => {
  let service: NavigationService;
  let location: Location;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [ provideRouter([ { path: '**', component: BlankComponent } ]), provideLocationMocks() ]
    });
    service = TestBed.inject(NavigationService);
    location = TestBed.inject(Location);
    harness = await RouterTestingHarness.create();
  });

  const settle = async () => {
    await harness.fixture.whenStable();
    await harness.fixture.whenStable();
  };

  it('cold-start fallback replaces the entry so back cannot loop into the abandoned child', async () => {
    await harness.navigateByUrl('/teams/view/t1/courses/c1');
    service.back([ '/teams/view/t1' ]);
    await settle();
    expect(location.path()).toBe('/teams/view/t1');
    service.back([ '/teams' ]);
    await settle();
    expect(location.path()).toBe('/teams');
  });

  it('walks real browser history back after in-app navigation', async () => {
    await harness.navigateByUrl('/teams');
    await harness.navigateByUrl('/teams/view/t1');
    service.back([ '/never-used' ]);
    await settle();
    expect(location.path()).toBe('/teams');
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
