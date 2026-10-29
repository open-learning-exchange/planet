import { of, Subject } from 'rxjs';

import { MeetupsComponent } from './meetups.component';

describe('MeetupsComponent authorization', () => {
  const createComponent = (parent = false) => {
    const meetupService = { canEditMeetup: vi.fn(() => !parent), openDeleteDialog: vi.fn() };
    const component = new MeetupsComponent(
      { currentTime: vi.fn(() => of(0)) } as any,
      {} as any,
      {} as any,
      { snapshot: { data: { parent } } } as any,
      { get: vi.fn(() => ({ name: 'ann' })) } as any,
      meetupService as any,
      { configuration: {} } as any,
      { start: vi.fn() } as any
    );
    return { component, meetupService };
  };

  it('delegates meetup action authorization to MeetupService', () => {
    const meetup = { _id: 'm1', createdBy: 'ann' };
    const { component, meetupService } = createComponent();

    expect(component.canEditMeetup(meetup)).toBe(true);
    expect(meetupService.canEditMeetup).toHaveBeenCalledWith(meetup, { readOnly: false });
  });

  it('passes parent context to the guarded delete workflow', () => {
    const meetup = { _id: 'm1', createdBy: 'ann' };
    const { component, meetupService } = createComponent(true);

    component.deleteClick(meetup);

    expect(meetupService.openDeleteDialog).toHaveBeenCalledWith(meetup, expect.any(Function), { readOnly: true });
  });
});

describe('MeetupsComponent loading', () => {
  it('ends the page overlay on the first list update only', () => {
    const meetupUpdated$ = new Subject<any[]>();
    const dialogsLoadingService = { start: vi.fn(), stop: vi.fn() };
    const component = new MeetupsComponent(
      { currentTime: vi.fn(() => of(0)), checkAuthorization: vi.fn(() => of(false)) } as any,
      {} as any,
      {} as any,
      { snapshot: { data: { parent: false } } } as any,
      { get: vi.fn(() => ({ name: 'ann' })) } as any,
      { meetupUpdated$, updateMeetups: vi.fn() } as any,
      { configuration: {} } as any,
      dialogsLoadingService as any
    );

    component.ngOnInit();
    meetupUpdated$.next([]);
    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);

    meetupUpdated$.next([]);
    component.ngOnDestroy();
    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
  });
});
