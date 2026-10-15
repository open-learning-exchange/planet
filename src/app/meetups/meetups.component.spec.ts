import { of } from 'rxjs';

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
