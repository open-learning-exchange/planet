import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { Router, NavigationStart, NavigationEnd, NavigationExtras, ExtraOptions } from '@angular/router';

/** Marks a navigation this service issued as a hierarchical fallback. */
export const FALLBACK_NAVIGATION = Symbol('planetFallbackNavigation');

type FallbackNavigationExtras = NavigationExtras & {
  [FALLBACK_NAVIGATION]?: true;
};

/**
 * Root router options this service depends on. `computed` lets Angular restore the
 * browser position when a guard cancels the popstate that back() triggers, so a
 * blocked back leaves the URL and the router on the page the user never left.
 */
export const navigationRouterOptions: ExtraOptions = { canceledNavigationResolution: 'computed' };

/**
 * Central back navigation: "back" returns to the previous in-app page when one
 * exists (like the browser back button); otherwise it falls back to the given
 * hierarchical route so refreshes and deep links never strand or eject the user.
 *
 * The service maps Angular navigation ids to a logical in-app depth. Browser
 * back/forward (popstate) carries the target entry's original navigation id in
 * restoredState, so forward is not mistaken for back. Hierarchical fallbacks
 * push real browser entries but remain at depth zero, allowing native Back to
 * revisit those entries without making Planet's Back button loop through them.
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {

  private index = -1;
  private idToIndex = new Map<number, number>();
  private currentNav: {
    id: number,
    trigger: string,
    restoredId: number | null,
    countsAsNewEntry: boolean
  } | null = null;

  constructor(private router: Router, private location: Location) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        const extras = this.router.getCurrentNavigation()?.extras;
        const isFallback = (extras as FallbackNavigationExtras)?.[FALLBACK_NAVIGATION] === true;
        this.currentNav = {
          id: event.id,
          trigger: event.navigationTrigger,
          restoredId: event.restoredState?.navigationId ?? null,
          // A fallback pushes a browser entry but stays at the same in-app depth, so
          // repeated back keeps unwinding the hierarchy instead of looping into it
          countsAsNewEntry: extras?.replaceUrl !== true && !isFallback
        };
      } else if (event instanceof NavigationEnd && this.currentNav?.id === event.id) {
        const { trigger, restoredId, countsAsNewEntry } = this.currentNav;
        if (trigger === 'popstate') {
          // Browser traversal: jump to the position of the restored entry.
          // An unknown or missing id predates this document; treat as start.
          this.index = (restoredId !== null && this.idToIndex.get(restoredId)) || 0;
        } else if (countsAsNewEntry || this.index < 0) {
          this.index++;
        }
        // Angular rewrites the entry's navigationId on each visit, so always remap
        this.idToIndex.set(event.id, this.index);
      }
    });
  }

  back(fallback: any[] | string = [ '/' ], extras: NavigationExtras = {}) {
    if (this.index > 0) {
      this.location.back();
    } else if (typeof fallback === 'string') {
      // Serialized URL fallback (e.g. a stored return URL with matrix params)
      this.router.navigateByUrl(fallback, this.fallbackExtras(extras));
    } else {
      this.router.navigate(fallback, this.fallbackExtras(extras));
    }
  }

  private fallbackExtras(extras: NavigationExtras): NavigationExtras {
    return {
      ...extras,
      // A symbol on the transient extras object identifies the fallback without
      // changing caller-owned info or writing a marker into history.state.
      [FALLBACK_NAVIGATION]: true
    } as FallbackNavigationExtras;
  }

}
