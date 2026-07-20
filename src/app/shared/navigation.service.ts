import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { Router, NavigationStart, NavigationEnd, NavigationExtras } from '@angular/router';

/**
 * Central back navigation: "back" returns to the previous in-app page when one
 * exists (like the browser back button); otherwise it falls back to the given
 * hierarchical route so refreshes and deep links never strand or eject the user.
 *
 * The service mirrors the browser history position for this document by mapping
 * Angular navigation ids to stack indices: browser back/forward (popstate) carry
 * the target entry's original navigation id in restoredState, which locates the
 * index directly, so forward is not mistaken for back and replaceUrl does not
 * grow the stack.
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {

  private index = -1;
  private idToIndex = new Map<number, number>();
  private currentNav: { id: number, trigger: string, restoredId: number | null, replaceUrl: boolean } = null;

  constructor(private router: Router, private location: Location) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.currentNav = {
          id: event.id,
          trigger: event.navigationTrigger,
          restoredId: event.restoredState?.navigationId ?? null,
          replaceUrl: this.router.getCurrentNavigation()?.extras?.replaceUrl === true
        };
      } else if (event instanceof NavigationEnd && this.currentNav !== null) {
        const { id, trigger, restoredId, replaceUrl } = this.currentNav;
        if (trigger === 'popstate') {
          // Browser traversal: jump to the position of the restored entry.
          // An unknown or missing id predates this document; treat as start.
          this.index = (restoredId !== null && this.idToIndex.get(restoredId)) || 0;
        } else if (!replaceUrl || this.index < 0) {
          this.index++;
        }
        // Angular rewrites the entry's navigationId on each visit, so always remap
        this.idToIndex.set(id, this.index);
      }
    });
  }

  back(fallback: any[] | string = [ '/' ], extras: NavigationExtras = {}) {
    if (this.index > 0) {
      this.location.back();
    } else if (typeof fallback === 'string') {
      // Serialized URL fallback (e.g. a stored return URL with matrix params)
      this.router.navigateByUrl(fallback, { ...extras, replaceUrl: true });
    } else {
      // Replace the abandoned entry so pressing back on the fallback page
      // cannot loop into the page the user just backed out of
      this.router.navigate(fallback, { ...extras, replaceUrl: true });
    }
  }

}
