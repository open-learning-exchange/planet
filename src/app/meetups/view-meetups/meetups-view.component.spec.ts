import { of } from 'rxjs';

import { MeetupsViewComponent } from './meetups-view.component';

describe('MeetupsViewComponent authorization', () => {
  const createComponent = (meetupDetail: any = {}, options: { parent?: boolean, editable?: boolean } = {}) => {
    const meetupService = {
      canEditMeetup: vi.fn((meetup: any, context: any) => !context.readOnly && meetup?.createdBy === 'ann'),
      openDeleteDialog: vi.fn()
    };
    const component = new MeetupsViewComponent(
      {} as any,
      {} as any,
      undefined as any,
      undefined as any,
      { currentTime: vi.fn(() => of(0)) } as any,
      {} as any,
      { snapshot: { data: { parent: options.parent || false }, paramMap: { get: () => 'm1' } } } as any,
      meetupService as any,
      {} as any,
      { get: vi.fn(() => ({ name: 'ann' })) } as any,
      {} as any,
      {} as any,
      {} as any
    );
    component.meetupDetail = meetupDetail;
    component.editable = options.editable ?? true;
    return { component, meetupService };
  };

  it('delegates its manage decision to MeetupService', () => {
    const meetup = { createdBy: 'ann' };
    const { component, meetupService } = createComponent(meetup);

    expect(component.canManage).toBe(true);
    expect(meetupService.canEditMeetup).toHaveBeenCalledWith(meetup, {
      leaderOfTeamId: undefined,
      readOnly: false
    });
  });

  it('answers per meetup rather than once for the session', () => {
    const { component } = createComponent({ createdBy: 'bob' });

    expect(component.canManage).toBe(false);

    component.meetupDetail = { createdBy: 'ann' };

    expect(component.canManage).toBe(true);
  });

  it('does not expose management actions for parent meetups', () => {
    const { component } = createComponent({ createdBy: 'ann' }, { parent: true });

    expect(component.canManage).toBe(false);
  });

  it('passes its read-only context to the guarded delete workflow', () => {
    const meetup = { createdBy: 'ann' };
    const { component, meetupService } = createComponent(meetup, { parent: true });

    component.deleteMeetup();

    expect(meetupService.openDeleteDialog).toHaveBeenCalledWith(meetup, expect.any(Function), {
      leaderOfTeamId: undefined,
      readOnly: true
    });
  });
});
