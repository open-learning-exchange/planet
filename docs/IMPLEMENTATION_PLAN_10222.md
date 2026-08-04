# Implementation Plan: Issue #10222 - Home Component Sidenav Auto-Close

## Issue Summary
**Title:** home component should auto-close on new page selection  
**Issue:** [#10222](https://github.com/open-learning-exchange/planet/issues/10222)  
**Reported by:** Mutugiii  
**Assignee:** RyanS4  

## Problem Statement
On mobile devices, the navigation sidenav (mode="over") does not automatically close when the user clicks a navigation item and navigates to a new page. This is a regression from previous behavior.

## Technical Analysis

### Current State
The mobile sidenav is defined in `src/app/home/home.component.html`:
```html
@if (isMobile && (layout === 'modern' || forceModern)) {
  <mat-sidenav #sidenav mode="over" ...>
```

**Missing functionality:**
1. No `@ViewChild('sidenav')` reference to access the MatSidenav component
2. No Router event subscription to detect navigation
3. No programmatic call to close sidenav on navigation

### Relevant Patterns in Codebase
From `src/app/app.component.ts`:
```typescript
import { Router, NavigationStart, NavigationEnd } from '@angular/router';

this.router.events.subscribe(event => {
  if (event instanceof NavigationEnd) {
    // Handle navigation complete
  }
});
```

## Implementation Steps

### Step 1: Add MatSidenav ViewChild Reference
**File:** `src/app/home/home.component.ts`

Add a `@ViewChild` reference to access the sidenav component:
```typescript
@ViewChild('sidenav') private sidenav: MatSidenav;
```

### Step 2: Import Required Types
**File:** `src/app/home/home.component.ts`

Add `NavigationEnd` to the router imports:
```typescript
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
```

### Step 3: Add Router Event Subscription
**File:** `src/app/home/home.component.ts`

Subscribe to router events in `ngOnInit()`:
```typescript
ngOnInit() {
  // ... existing code ...
  this.subscribeToRouterEvents();
}

subscribeToRouterEvents() {
  this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    takeUntil(this.onDestroy$)
  ).subscribe((event: NavigationEnd) => {
    // Close sidenav on navigation if it's open (mobile mode)
    if (this.isMobile && this.sidenavState === 'open') {
      this.sidenavState = 'closed';
    }
  });
}
```

### Step 4: Add filter Import
**File:** `src/app/home/home.component.ts`

Update the import from rxjs/operators:
```typescript
import { switchMap, takeUntil, tap, catchError, filter } from 'rxjs/operators';
```

## Alternative Implementation Approaches

### Alternative 1: Close on Click Handler (Simpler)
Instead of Router events, add a click handler to navigation links:

**Pros:** Simpler, more direct
**Cons:** Must add handler to every navigation link

```typescript
// In template
(click)="closeSidenavOnMobile()"

// In component
closeSidenavOnMobile() {
  if (this.isMobile) {
    this.sidenavState = 'closed';
  }
}
```

### Alternative 2: Use MatSidenav's built-in close on route change
Angular Material's MatSidenav can automatically close on route changes using `[mode]="'over'"` with the `fixedInViewport` attribute.

**Pros:** Native Material behavior
**Cons:** May require additional configuration

## Recommended Solution
**Approach:** Router Event Subscription (Alternative 1)

**Rationale:**
- Single point of control (no need to modify each navigation link)
- Follows existing patterns in the codebase (app.component.ts)
- Cleaner separation of concerns
- Only affects mobile (`mode="over"`) sidenav

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/home/home.component.ts` | Add ViewChild, import NavigationEnd, add subscription |
| `src/app/home/home.component.spec.ts` | Add unit tests for new functionality (optional) |

## Testing Plan

### Manual Testing
1. Open app in mobile view (or use browser dev tools mobile mode)
2. Click hamburger menu to open sidenav
3. Click any navigation item (Library, Courses, etc.)
4. **Expected:** Sidenav closes automatically
5. **Verify:** Navigation works correctly, sidenav closes on every navigation

### Unit Testing (if tests exist)
- Add test for `subscribeToRouterEvents()` method
- Verify sidenav closes when NavigationEnd event fires on mobile
- Verify sidenav does NOT close on desktop (isMobile = false)

## Edge Cases to Consider
1. **Rapid navigation:** Multiple clicks before first navigation completes
2. **Same route navigation:** Clicking already active route
3. **Browser back button:** Should also trigger sidenav close
4. **Landscape/portrait toggle:** Device detection updates correctly

## Implementation Checklist
- [ ] Add `@ViewChild('sidenav')` reference
- [ ] Import `NavigationEnd` from `@angular/router`
- [ ] Import `filter` from `rxjs/operators`
- [ ] Add `subscribeToRouterEvents()` method
- [ ] Call subscription in `ngOnInit()`
- [ ] Test on mobile view
- [ ] Commit changes
