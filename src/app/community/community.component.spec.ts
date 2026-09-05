import { convertToParamMap } from '@angular/router';
import { BehaviorSubject, EMPTY, Subscription, of } from 'rxjs';
import { vi } from 'vitest';

import { CommunityComponent } from './community.component';
import { DialogsVoiceLabelsComponent } from '../shared/dialogs/dialogs-voice-labels.component';
import { DeviceType } from '../shared/device-info.service';

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

  it('filters malformed labels without crashing', () => {
    const component = Object.create(CommunityComponent.prototype) as CommunityComponent;
    component.news = [ { doc: { labels: [ null, 42, 'Event' ], viewIn: [] } } ];
    component.selectedLabel = 'event';
    component.voiceSearch = '';

    component.applyFilters();

    expect(component.filteredNews).toEqual(component.news);
  });

  it('passes current labels to the dialog and applies the saved vocabulary locally', () => {
    const component = Object.create(CommunityComponent.prototype) as CommunityComponent;
    component.planetCode = null;
    component.configuration = { customVoiceLabels: [ 'Announcement', 'Event' ] };
    component.customVoiceLabels = [ 'Announcement', 'Event' ];
    component.selectedLabel = 'ANNOUNCEMENT';
    const open = vi.fn().mockReturnValue({ afterClosed: () => of([ 'Event' ]) });
    (component as any).dialog = {
      open
    };
    vi.spyOn(component, 'requestNewsAndUsers').mockImplementation(() => undefined);

    component.openManageLabelsDialog();

    expect(open).toHaveBeenCalledWith(DialogsVoiceLabelsComponent, {
      width: '500px',
      autoFocus: false,
      data: { target: 'community', customLabels: [ 'Announcement', 'Event' ] }
    });
    expect(component.selectedLabel).toBe('ANNOUNCEMENT');
    expect(component.customVoiceLabels).toEqual([ 'Event' ]);
    expect(component.requestNewsAndUsers).not.toHaveBeenCalled();
  });

  it('precomputes group label names for case-insensitive icon lookup', () => {
    const component = Object.create(CommunityComponent.prototype) as CommunityComponent;
    component.getAvailableLabels([ { doc: { labels: [], viewIn: [ { name: 'Team Events' } ] } } ]);

    expect(component.getLabelIcon('team events')).toBe('groups');
  });
});

describe('CommunityComponent remote exchange behavior', () => {
  const createComponent = (localPlanetType: 'center' | 'nation' = 'nation') => {
    const configuration = {
      _id: 'configuration',
      code: 'local',
      parentCode: 'parent',
      planetType: localPlanetType
    };
    const router = { navigate: vi.fn() };
    const routeParamMap = new BehaviorSubject(convertToParamMap({ code: 'remote' }));
    const route = {
      snapshot: { paramMap: convertToParamMap({ code: 'remote' }) },
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
    const userService = { get: vi.fn(() => ({ _id: 'user', isUserAdmin: false, roles: [] })), userChange$: EMPTY };
    const usersService = { usersListener: vi.fn(() => EMPTY), requestUsers: vi.fn() };
    const deviceInfoService = { watchDeviceType: vi.fn(() => of(DeviceType.DESKTOP)) };
    const usersLinksService = { openDialog: vi.fn(() => of([])) };
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
      { getActiveChallenge: vi.fn(() => null) } as any,
      usersLinksService as any
    );

    return { component, couchService, dialog, dialogsFormService, routeParamMap, router, stateService, usersLinksService };
  };

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
    component.openLinksDialog({ doc: { name: 'ann' } });
    component.openDescriptionDialog();
    component.toggleDeleteMode();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(dialogsFormService.openDialogsForm).not.toHaveBeenCalled();
    expect(component.deleteMode).toBe(false);
  });

  // TEMP NOTE (for review, strip before merge): links are leaders only for now.
  it('does not offer link editing for a member who is not a leader', () => {
    const { component } = createComponent();
    component.planetCode = null;
    component.user = { ...component.user, roles: [ 'manager' ] };

    expect(component.councillorActionMenu({ userId: 'org.couchdb.user:bob', userPlanetCode: 'local', doc: { roles: [] } }))
      .toEqual([ 'title' ]);
  });

  it('offers title changes to managers and link editing to managers and the leader themselves', () => {
    const { component } = createComponent();
    const councillor = { userId: 'user', userPlanetCode: 'local', doc: { roles: [ 'leader' ] } };
    const otherCouncillor = { userId: 'org.couchdb.user:bob', userPlanetCode: 'local', doc: { roles: [ 'leader' ] } };

    expect(component.councillorActionMenu(councillor)).toEqual([]);

    component.planetCode = null;

    expect(component.councillorActionMenu(councillor)).toEqual([ 'links' ]);
    expect(component.councillorActionMenu(otherCouncillor)).toEqual([]);

    component.user = { ...component.user, roles: [ 'manager' ] };

    expect(component.councillorActionMenu(otherCouncillor)).toEqual([ 'title', 'links' ]);
  });

  it('saves edited links onto the docs the member tile reads from', () => {
    const { component, usersLinksService } = createComponent();
    const socialLinks = [ { platform: 'website', url: 'https://ole.org/' } ];
    usersLinksService.openDialog.mockReturnValue(of(socialLinks));
    component.planetCode = null;
    const councillor: any = { doc: { name: 'ann' }, userDoc: { doc: { name: 'ann' } } };

    component.openLinksDialog(councillor);

    expect(usersLinksService.openDialog).toHaveBeenCalledWith('ann', []);
    expect(councillor.doc.socialLinks).toEqual(socialLinks);
    expect(councillor.userDoc.doc.socialLinks).toEqual(socialLinks);
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
