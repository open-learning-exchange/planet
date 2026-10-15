import { signal } from '@angular/core';
import { convertToParamMap } from '@angular/router';
import { BehaviorSubject, EMPTY, Subject, Subscription, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DeviceType } from '@shared/ui/device-info.service';

import { CommunityComponent } from './community.component';
import { NewsLabelsDialogComponent } from '../news/news-labels-dialog.component';

describe('CommunityComponent custom labels', () => {
  it('allows community leaders and planet managers to manage community labels', () => {
    const component = Object.create(CommunityComponent.prototype) as CommunityComponent;
    component.planetCode = null;
    component.isCommunityLeader = true;
    (component as any).userService = { doesUserHaveRole: () => false };

    expect(component.canManageLabels).toBe(true);

    component.isCommunityLeader = false;
    (component as any).userService = { doesUserHaveRole: () => true };

    expect(component.canManageLabels).toBe(true);
  });

  it('passes the services doc labels to the dialog and applies the saved vocabulary locally', () => {
    const component = Object.create(CommunityComponent.prototype) as CommunityComponent;
    const team = { _id: 'local@parent', customVoiceLabels: [ 'Announcement', 'Event' ] };
    component.planetCode = null;
    component.team = team;
    const open = vi.fn().mockReturnValue({ afterClosed: () => of([ 'Event' ]) });
    (component as any).dialog = {
      open
    };

    component.openManageLabelsDialog();

    expect(open).toHaveBeenCalledWith(NewsLabelsDialogComponent, {
      width: '500px',
      autoFocus: false,
      data: { target: 'community', team, customLabels: [ 'Announcement', 'Event' ] }
    });
    expect(component.customVoiceLabels).toEqual([ 'Event' ]);
  });
});

describe('CommunityComponent remote exchange behavior', () => {
  const createComponent = (
    localPlanetType: 'center' | 'nation' = 'nation',
    code: string | null = 'remote',
    user: any = { _id: 'user', isUserAdmin: false, roles: [] }
  ) => {
    const configuration = {
      _id: 'configuration',
      code: 'local',
      parentCode: 'parent',
      planetType: localPlanetType
    };
    const router = { navigate: vi.fn() };
    const params = convertToParamMap(code ? { code } : {});
    const routeParamMap = new BehaviorSubject(params);
    const route = {
      snapshot: { paramMap: params },
      paramMap: routeParamMap
    };
    const stateService = {
      configuration,
      couchStateListener: vi.fn(() => EMPTY),
      requestData: vi.fn()
    };
    const dialog = { open: vi.fn() };
    const dialogsFormService = { openDialogsForm: vi.fn() };
    const newsService = { newsUpdated$: EMPTY, requestNews: vi.fn(() => new Subscription()) };
    const teamsService = { getTeamMembers: vi.fn(() => of([])) };
    const couchService = {
      findAll: vi.fn(() => of([])),
      get: vi.fn(() => of({ _id: 'remote@local', description: '' }))
    };
    const userChange$ = new Subject<any>();
    const currentUser: any = { value: user };
    const userService = { get: vi.fn(() => currentUser.value), userChange$ };
    const usersService = { usersListener: vi.fn(() => EMPTY), requestUsers: vi.fn() };
    const deviceInfoService = { deviceType: signal(DeviceType.DESKTOP) };
    const component = new CommunityComponent(
      dialog as any,
      router as any,
      route as any,
      stateService as any,
      newsService as any,
      dialogsFormService as any,
      {} as any,
      teamsService as any,
      couchService as any,
      {} as any,
      userService as any,
      usersService as any,
      {} as any,
      deviceInfoService as any,
      {} as any,
      { checkConfiguration: vi.fn(() => of(undefined)) } as any,
      { getActiveChallenge: vi.fn(() => of(undefined)), activeChallengeIn: vi.fn() } as any
    );

    return {
      component, couchService, dialog, dialogsFormService, newsService, routeParamMap, router, stateService, teamsService, userChange$,
      currentUser
    };
  };

  it('treats a missing team doc as a community without one', () => {
    const { component, couchService } = createComponent();
    couchService.get = vi.fn(() => throwError({ status: 404, statusText: '' }));

    component.ngOnInit();

    expect(component.servicesDescriptionLabel).toBe('Add');
    expect(component.teamLoading).toBe(false);
    expect(component.teamLoaded).toBe(true);
  });

  it('keeps label editing off when the team doc fails to load', () => {
    const { component, couchService } = createComponent();
    couchService.get = vi.fn(() => throwError({ status: 500, statusText: '' }));

    component.ngOnInit();

    expect(component.teamLoading).toBe(false);
    expect(component.teamLoaded).toBe(false);
  });

  it('loads member data, not voices, when a guest logs in', () => {
    const { component, couchService, newsService, teamsService, userChange$, currentUser } = createComponent('nation', null, { name: '' });
    component.ngOnInit();
    expect(teamsService.getTeamMembers).not.toHaveBeenCalled();
    expect(component.teamLoaded).toBe(false);

    currentUser.value = { _id: 'user-2', isUserAdmin: false, roles: [ 'learner' ] };
    userChange$.next(currentUser.value);

    expect(newsService.requestNews).toHaveBeenCalledTimes(1);
    expect(teamsService.getTeamMembers).toHaveBeenCalledTimes(1);
    expect(couchService.get).toHaveBeenCalledWith('teams/local@parent');
    expect(component.teamLoaded).toBe(true);
  });

  it('restarts a remote load when a login lands before its configuration', () => {
    const { component, couchService, newsService, teamsService, userChange$, currentUser } = createComponent();
    const configuration$ = new Subject<any[]>();
    couchService.findAll = vi.fn(() => configuration$);
    component.ngOnInit();

    userChange$.next(currentUser.value);
    configuration$.next([ { code: 'remote', name: 'Remote' } ]);

    expect(newsService.requestNews).toHaveBeenCalledTimes(1);
    expect(component.teamId).toBe('remote@local');
    expect(teamsService.getTeamMembers).toHaveBeenCalledWith(expect.objectContaining({ _id: 'remote@local' }), true);
    expect(component.teamLoaded).toBe(true);
  });

  it('drops member data still loading when the user logs out', () => {
    const { component, couchService, teamsService, userChange$, currentUser } = createComponent('nation', null, { name: '' });
    const servicesDoc$ = new Subject<any>();
    teamsService.getTeamMembers.mockReturnValue(of([ { docType: 'link', title: 'Clinic' } ]));
    couchService.get = vi.fn(() => servicesDoc$);
    component.ngOnInit();
    currentUser.value = { _id: 'user-2', isUserAdmin: false, roles: [ 'learner' ] };
    userChange$.next(currentUser.value);

    currentUser.value = { name: '' };
    userChange$.next(currentUser.value);
    servicesDoc$.next({ _id: 'local@parent', _rev: '1-a' });

    expect(component.links).toEqual([]);
    expect(component.teamLoaded).toBe(false);
    expect(component.teamLoading).toBe(false);
  });

  it('clears member data on logout and reloads only that on the next login', () => {
    const { component, newsService, teamsService, userChange$, currentUser } = createComponent('nation', null);
    teamsService.getTeamMembers.mockReturnValue(of([ { docType: 'link', title: 'Clinic' } ]));
    component.ngOnInit();
    expect(component.links.length).toBe(1);

    currentUser.value = { name: '' };
    userChange$.next(currentUser.value);
    expect(component.links).toEqual([]);
    expect(component.teamLoaded).toBe(false);

    currentUser.value = { _id: 'user-2', isUserAdmin: false, roles: [ 'learner' ] };
    userChange$.next(currentUser.value);
    userChange$.next(currentUser.value);

    expect(component.links.length).toBe(1);
    expect(teamsService.getTeamMembers).toHaveBeenCalledTimes(2);
    expect(newsService.requestNews).toHaveBeenCalledTimes(1);
  });

  it('sets remote exchange mode synchronously from the route snapshot', () => {
    const { component } = createComponent();

    expect(component.planetCode).toBe('remote');
    expect(component.isRemoteExchange).toBe(true);
  });

  it('derives missing child configuration metadata from the local planet', () => {
    const { component } = createComponent('center');

    component.ngOnInit();

    expect(component.configuration).toEqual({
      code: 'remote',
      name: 'remote',
      planetType: 'nation'
    });
    component.ngOnDestroy();
  });

  it('keeps the remote route stable and resets reply state when returning to voices', () => {
    const { component, router } = createComponent();
    component.activeReplyId = 'voice-id';

    component.tabChanged({ index: 1 });
    expect(component.activeReplyId).toBe('voice-id');
    component.tabChanged({ index: 0 });

    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.activeReplyId).toBeNull();
    expect(component.lastReplyId).toBeNull();
  });

  it('blocks local mutation handlers when invoked directly on a remote exchange', () => {
    const { component, dialog, dialogsFormService } = createComponent();

    component.openAddMessageDialog();
    component.postMessage({ message: 'Voice' });
    component.openAddLinkDialog();
    component.openDeleteLinkDialog({});
    component.confirmDeleteDescription();
    component.openChangeTitleDialog({ member: {} });
    component.openDescriptionDialog();
    component.toggleDeleteMode();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(dialogsFormService.openDialogsForm).not.toHaveBeenCalled();
    expect(component.deleteMode).toBe(false);
  });

  it('cancels the previous exchange load when the route code changes', () => {
    const { component, couchService, routeParamMap } = createComponent();
    const firstRequest = new BehaviorSubject<any[]>([]);
    const secondRequest = new BehaviorSubject<any[]>([]);
    couchService.findAll.mockImplementation((_db, query) =>
      query.selector.code === 'remote' ? firstRequest : secondRequest
    );

    component.ngOnInit();
    expect(firstRequest.observers.length).toBe(1);

    routeParamMap.next(convertToParamMap({ code: 'second' }));

    expect(firstRequest.observers.length).toBe(0);
    expect(secondRequest.observers.length).toBe(1);
    component.ngOnDestroy();
  });
});
