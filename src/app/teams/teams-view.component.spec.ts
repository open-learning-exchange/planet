import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, NEVER, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReportsService } from '../manager-dashboard/reports/reports.service';
import { NewsService } from '../news/news.service';
import { CouchService } from '../shared/couchdb.service';
import { DeviceInfoService } from '../shared/device-info.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { NavigationService } from '../shared/navigation.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { TruncateTextPipe } from '../shared/truncate-text.pipe';
import { UserService } from '../shared/user.service';
import { TasksService } from '../tasks/tasks.service';
import { TeamsViewComponent } from './teams-view.component';
import { TeamsService } from './teams.service';

describe('TeamsViewComponent routing tabs', () => {
  const createComponent = () => {
    const paramMap$ = new BehaviorSubject(convertToParamMap({ teamId: 'team-1' }));
    const queryParamMap$ = new BehaviorSubject(convertToParamMap({ search: 'kept' }));
    const teamRouteSnapshot: any = {
      data: {},
      queryParamMap: convertToParamMap({ search: 'kept' }),
      queryParams: { search: 'kept' },
      pathFromRoot: [
        { url: [] },
        { url: [ { path: 'teams' } ] },
        { url: [ { path: 'view' }, { path: 'team-1' } ] }
      ]
    };
    const route: any = {
      paramMap: paramMap$.asObservable(),
      queryParamMap: queryParamMap$.asObservable(),
      snapshot: teamRouteSnapshot
    };
    const router = { navigate: vi.fn() };
    const tasksService = {
      getTasks: vi.fn(),
      tasksListener: vi.fn(() => of([])),
      sortedTasks: vi.fn(tasks => tasks)
    };
    const component = new TeamsViewComponent(
      {} as any,
      { get: vi.fn(() => ({ _id: 'user-1' })) } as any,
      router as any,
      route,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { configuration: { code: 'planet-1' } } as any,
      tasksService as any,
      { watchDeviceType: vi.fn(() => of('desktop')) } as any,
      {} as any
    );

    return { component, paramMap$, queryParamMap$, route, router, tasksService };
  };

  afterEach(() => vi.useRealTimers());

  it('keeps visibleTabs aligned with the rendered tab order', async () => {
    const user = { _id: 'user-1', planetCode: 'planet-1', isUserAdmin: false, roles: [] };
    const route = {
      snapshot: {
        data: {}, params: {}, queryParams: {}, queryParamMap: convertToParamMap({}), pathFromRoot: []
      },
      paramMap: NEVER,
      queryParamMap: of(convertToParamMap({}))
    };
    await TestBed.configureTestingModule({
      imports: [ TeamsViewComponent, NoopAnimationsModule ],
      providers: [
        { provide: CouchService, useValue: {} },
        {
          provide: UserService,
          useValue: {
            get: vi.fn(() => user),
            userChange$: of(user),
            doesUserHaveRole: vi.fn(() => false)
          }
        },
        {
          provide: Router,
          useValue: {
            events: of(), navigate: vi.fn(), createUrlTree: vi.fn(() => ({})), serializeUrl: vi.fn(() => '/')
          }
        },
        { provide: ActivatedRoute, useValue: route },
        { provide: PlanetMessageService, useValue: {} },
        { provide: TeamsService, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: DialogsLoadingService, useValue: {} },
        { provide: DialogsFormService, useValue: {} },
        { provide: NewsService, useValue: {} },
        { provide: ReportsService, useValue: {} },
        { provide: StateService, useValue: { configuration: { code: 'planet-1', planetType: 'community' } } },
        { provide: TasksService, useValue: {} },
        { provide: DeviceInfoService, useValue: { watchDeviceType: vi.fn(() => of('desktop')) } },
        { provide: NavigationService, useValue: {} }
      ]
    });
    TestBed.overrideComponent(TeamsViewComponent, {
      set: {
        imports: [ MatTabGroup, MatTab, MatTabLabel, DatePipe, TruncateTextPipe ],
        schemas: [ NO_ERRORS_SCHEMA ]
      }
    });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(TeamsViewComponent);
    const component = fixture.componentInstance;

    const tabKey = (label: string) => {
      const text = label.replace(/\s+/g, ' ').trim().toLowerCase();
      if (text.startsWith('mission & services') || text.startsWith('plan')) {
        return 'plan';
      }
      if (text.startsWith('members') || text.startsWith('team')) {
        return 'members';
      }
      if (text.startsWith('documents') || text.startsWith('resources')) {
        return 'resources';
      }
      return [ 'chat', 'tasks', 'calendar', 'finances', 'reports', 'courses', 'surveys' ]
        .find(key => text.startsWith(key));
    };
    const expectRenderedOrder = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const renderedKeys = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[role="tab"]'))
        .map(element => tabKey(element.textContent || ''));
      expect(renderedKeys).toEqual(component.visibleTabs());
    };

    component.team = { public: false };
    component.userStatus = 'unrelated';
    await expectRenderedOrder();

    component.team.public = true;
    await expectRenderedOrder();

    component.mode = 'enterprise';
    await expectRenderedOrder();
  });

  it('normalizes legacy tab params when the router reuses the component', () => {
    const { component, paramMap$, route, router } = createComponent();
    const initTeam = vi.spyOn(component, 'initTeam').mockImplementation(() => undefined);
    component.ngOnInit();

    paramMap$.next(convertToParamMap({ teamId: 'team-1', activeTab: 'taskTab' }));

    expect(router.navigate).toHaveBeenCalledWith([ '/teams/view/team-1' ], {
      queryParams: { search: 'kept', tab: 'tasks' },
      replaceUrl: true
    });
    expect(initTeam).toHaveBeenCalledTimes(1);
    expect(route.snapshot.queryParams).toEqual({ search: 'kept' });
    component.ngOnDestroy();
  });

  it('normalizes a reused navigation before initializing a different team', () => {
    const { component, paramMap$, route, router } = createComponent();
    const initTeam = vi.spyOn(component, 'initTeam').mockImplementation(() => undefined);
    component.ngOnInit();
    route.snapshot.pathFromRoot[2].url[1].path = 'team-2';

    paramMap$.next(convertToParamMap({ teamId: 'team-2', activeTab: 'applicantTab' }));

    expect(router.navigate).toHaveBeenLastCalledWith([ '/teams/view/team-2' ], {
      queryParams: { search: 'kept', tab: 'members' },
      replaceUrl: true
    });
    expect(initTeam).toHaveBeenLastCalledWith('team-2');
    component.ngOnDestroy();
  });

  it('pushes user tab changes and ignores route-driven echoes', () => {
    const { component, route, router } = createComponent();
    component.team = { public: true };
    component.requestedTab = 'chat';

    component.onTabChange(6);
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { tab: 'courses' },
      queryParamsHandling: 'merge'
    });

    component.onTabChange(6);
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('applies a deep-linked conditional tab after team data becomes available', () => {
    vi.useFakeTimers();
    const { component } = createComponent();
    component.requestedTab = 'courses';
    component.applyRequestedTab();
    expect(component.tabSelectedIndex).toBe(0);

    component.team = { public: true };
    component.applyRequestedTab();
    vi.runAllTimers();
    expect(component.tabSelectedIndex).toBe(6);
  });

  it('replace-normalizes an unavailable tab after visibility resolves', () => {
    vi.useFakeTimers();
    const { component, route, router } = createComponent();
    component.team = { public: false };
    component.userStatus = 'unrelated';
    component.requestedTab = 'courses';
    component.tabSelectedIndex = 6;

    component.applyRequestedTab(true);
    vi.runAllTimers();

    expect(component.requestedTab).toBe('chat');
    expect(component.tabSelectedIndex).toBe(0);
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { tab: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  });

  it('waits for services mode to grant conditional-tab visibility', () => {
    vi.useFakeTimers();
    const { component, router } = createComponent();
    const team = { public: false };
    const user = { _id: 'user-1', planetCode: 'planet-1' };
    component.mode = 'services';
    component.requestedTab = 'courses';
    vi.spyOn(component, 'getTeam').mockReturnValue(of(team));
    vi.spyOn(component, 'getMembers').mockImplementation(() => {
      component.setStatus(team, {}, user);
      return of([]);
    });

    component.initServices('services-team');
    vi.runAllTimers();

    expect(component.userStatus).toBe('member');
    expect(component.requestedTab).toBe('courses');
    expect(component.tabSelectedIndex).toBe(7);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
