import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { MeetupsAddComponent } from './meetups-add.component';

describe('MeetupsAddComponent authorization', () => {
  const creator = { _id: 'org.couchdb.user:ann', name: 'ann', isUserAdmin: false };
  const admin = { _id: 'org.couchdb.user:admin', name: 'admin', isUserAdmin: true };
  const unrelated = { _id: 'org.couchdb.user:bob', name: 'bob', isUserAdmin: false };

  const createComponent = (user: any, options: { path?: string, storedMeetup?: any, loadError?: boolean } = {}) => {
    let activeUser = user;
    const couchService = {
      datePlaceholder: {},
      get: vi.fn(() => options.loadError ? throwError(new Error('offline')) : of(options.storedMeetup)),
      updateDocument: vi.fn(() => of({})),
      post: vi.fn(() => of({ docs: [] }))
    };
    const planetMessageService = { showAlert: vi.fn(), showMessage: vi.fn() };
    const router = { navigate: vi.fn() };
    const meetupService = {
      canEditMeetup: vi.fn((meetup: any, context: any = {}) =>
        !!activeUser?._id && !context.readOnly && (
          activeUser.isUserAdmin ||
          activeUser.roles?.includes('leader') ||
          (context.leaderOfTeamId && context.leaderOfTeamId === meetup?.link?.teams) ||
          activeUser.name === meetup?.createdBy
        ))
    };
    const component = new MeetupsAddComponent(
      couchService as any,
      planetMessageService as any,
      router as any,
      { snapshot: { data: {}, url: [ { path: options.path || 'add' } ], paramMap: { get: () => 'm1' } } } as any,
      new FormBuilder().nonNullable,
      { get: vi.fn(() => activeUser) } as any,
      { configuration: { code: 'planet' } } as any,
      meetupService as any
    );
    const setMeetupData = vi.spyOn(component, 'setMeetupData');
    const goBack = vi.spyOn(component, 'goBack').mockImplementation(() => {});
    return {
      component,
      couchService,
      planetMessageService,
      router,
      meetupService,
      setMeetupData,
      goBack,
      setUser: (newUser: any) => activeUser = newUser
    };
  };

  it('leaves the dialog without loading a meetup the user cannot edit', () => {
    const { component, planetMessageService, setMeetupData, goBack } = createComponent(unrelated);
    component.isDialog = true;
    component.meetup = { _id: 'm1', createdBy: 'ann' };

    component.ngOnInit();

    expect(planetMessageService.showAlert).toHaveBeenCalled();
    expect(goBack).toHaveBeenCalled();
    expect(setMeetupData).not.toHaveBeenCalled();
  });

  it('loads the meetup in the dialog for its creator', () => {
    const { component, planetMessageService, setMeetupData, goBack } = createComponent(creator);
    component.isDialog = true;
    component.meetup = { _id: 'm1', createdBy: 'ann' };

    component.ngOnInit();

    expect(setMeetupData).toHaveBeenCalledWith(expect.objectContaining({ _id: 'm1' }));
    expect(planetMessageService.showAlert).not.toHaveBeenCalled();
    expect(goBack).not.toHaveBeenCalled();
  });

  it('loads a linked meetup for the leader of that team', () => {
    const { component, setMeetupData, goBack } = createComponent(unrelated);
    component.isDialog = true;
    component.leaderOfTeamId = 'team-1';
    component.meetup = { _id: 'm1', createdBy: 'ann', link: { teams: 'team-1' } };

    component.ngOnInit();

    expect(setMeetupData).toHaveBeenCalled();
    expect(goBack).not.toHaveBeenCalled();
  });

  it('redirects away from the update route after loading a meetup the user cannot edit', () => {
    const { component, planetMessageService, router, setMeetupData } = createComponent(unrelated, {
      path: 'update',
      storedMeetup: { _id: 'm1', createdBy: 'ann' }
    });

    component.ngOnInit();

    expect(planetMessageService.showAlert).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([ '/meetups' ]);
    expect(setMeetupData).not.toHaveBeenCalled();
  });

  it('loads the meetup from the update route for an administrator', () => {
    const { component, planetMessageService, router, setMeetupData } = createComponent(admin, {
      path: 'update',
      storedMeetup: { _id: 'm1', createdBy: 'ann' }
    });

    component.ngOnInit();

    expect(setMeetupData).toHaveBeenCalledWith(expect.objectContaining({ _id: 'm1' }));
    expect(planetMessageService.showAlert).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('leaves the update route when loading the meetup fails', () => {
    const { component, planetMessageService, router, setMeetupData } = createComponent(creator, {
      path: 'update',
      loadError: true
    });

    component.ngOnInit();

    expect(planetMessageService.showAlert).toHaveBeenCalledWith('There was a problem loading this meetup');
    expect(router.navigate).toHaveBeenCalledWith([ '/meetups' ]);
    expect(setMeetupData).not.toHaveBeenCalled();
  });

  it('rechecks authorization against the loaded meetup before persisting', () => {
    const { component, couchService, planetMessageService, setUser } = createComponent(creator);
    component.setMeetupData({ _id: 'm1', _rev: '1-a', createdBy: 'ann' });
    setUser(unrelated);

    component.updateMeetup({ title: 'Changed meetup', startDate: null, endDate: null });

    expect(couchService.updateDocument).not.toHaveBeenCalled();
    expect(planetMessageService.showAlert).toHaveBeenCalledWith('You are not authorized to edit this meetup');
  });
});
