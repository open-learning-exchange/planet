import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { teamsRoutes } from './teams-router.module';

describe('TeamsRouterModule contextual routes', () => {
  const leafRoute = (router: Router): ActivatedRouteSnapshot => {
    let route = router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  };

  it('recognizes contextual content under every teams module mount', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'teams', children: teamsRoutes },
          { path: 'enterprises', children: teamsRoutes },
          { path: 'myDashboard/myTeams', children: teamsRoutes }
        ])
      ]
    });
    const router = TestBed.inject(Router);

    expect(await router.navigateByUrl('/teams/view/team-1/courses/course-1')).toBe(true);
    expect(leafRoute(router).params).toMatchObject({ teamId: 'team-1', id: 'course-1' });
    expect(leafRoute(router).data.fallbackTab).toBe('courses');

    expect(await router.navigateByUrl('/enterprises/view/team-2/resources/resource-1')).toBe(true);
    expect(leafRoute(router).params).toMatchObject({ teamId: 'team-2', id: 'resource-1' });
    expect(leafRoute(router).data.fallbackTab).toBe('resources');

    expect(await router.navigateByUrl('/myDashboard/myTeams/view/team-3/courses/course-3/step/2/exam')).toBe(true);
    expect(leafRoute(router).params).toMatchObject({
      teamId: 'team-3', id: 'course-3', stepNum: '2'
    });
  });
});
