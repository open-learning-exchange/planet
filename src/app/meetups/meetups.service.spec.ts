import { Subject } from 'rxjs';

import { MeetupService } from './meetups.service';

describe('MeetupService authorization', () => {
  const creator = { _id: 'org.couchdb.user:ann', name: 'ann', isUserAdmin: false };
  const admin = { _id: 'org.couchdb.user:admin', name: 'admin', isUserAdmin: true };
  const unrelated = { _id: 'org.couchdb.user:bob', name: 'bob', isUserAdmin: false };

  const createContext = (user: any) => {
    const dialog = { open: vi.fn() };
    const planetMessageService = { showAlert: vi.fn() };
    const service = new MeetupService(
      dialog as any,
      { bulkDocs: vi.fn() } as any,
      {
        shelf: { meetupIds: [] },
        shelfChange$: new Subject(),
        get: vi.fn(() => user)
      } as any,
      planetMessageService as any
    );
    return { service, dialog, planetMessageService };
  };

  const createService = (user: any) => createContext(user).service;

  it('lets a creator edit their own meetup', () => {
    expect(createService(creator).canEditMeetup({ createdBy: 'ann' })).toBe(true);
  });

  it('lets an administrator edit another creator\'s meetup', () => {
    expect(createService(admin).canEditMeetup({ createdBy: 'ann' })).toBe(true);
  });

  it('lets a community leader edit another creator\'s meetup', () => {
    const communityLeader = { ...unrelated, roles: [ 'leader' ] };

    expect(createService(communityLeader).canEditMeetup({ createdBy: 'ann' })).toBe(true);
  });

  it('lets a team leader edit a meetup linked to their team', () => {
    const meetup = { createdBy: 'ann', link: { teams: 'team-1' } };

    expect(createService(unrelated).canEditMeetup(meetup, { leaderOfTeamId: 'team-1' })).toBe(true);
  });

  it('does not let a team leader edit a meetup linked to another team', () => {
    const meetup = { createdBy: 'ann', link: { teams: 'team-2' } };

    expect(createService(unrelated).canEditMeetup(meetup, { leaderOfTeamId: 'team-1' })).toBe(false);
  });

  it('keeps read-only meetups protected from every local role', () => {
    expect(createService(admin).canEditMeetup({ createdBy: 'admin' }, { readOnly: true })).toBe(false);
  });

  it('rejects an unrelated member', () => {
    expect(createService(unrelated).canEditMeetup({ createdBy: 'ann' })).toBe(false);
  });

  it('rejects a user without a session', () => {
    expect(createService({}).canEditMeetup({ createdBy: 'ann' })).toBe(false);
  });

  it('does not treat a meetup without a creator as editable by a member', () => {
    expect(createService(unrelated).canEditMeetup({})).toBe(false);
  });

  it('does not treat a missing meetup as editable by any role', () => {
    const communityLeader = { ...unrelated, roles: [ 'leader' ] };

    expect(createService(admin).canEditMeetup(undefined)).toBe(false);
    expect(createService(communityLeader).canEditMeetup(undefined)).toBe(false);
    expect(createService(admin).canEditMeetup(undefined, { leaderOfTeamId: 'team-1' })).toBe(false);
  });

  it('does not open the delete dialog when authorization fails', () => {
    const { service, dialog, planetMessageService } = createContext(unrelated);

    service.openDeleteDialog({ createdBy: 'ann' }, vi.fn());

    expect(dialog.open).not.toHaveBeenCalled();
    expect(planetMessageService.showAlert).toHaveBeenCalledWith('You are not authorized to delete this meetup');
  });

  it('does not open the delete dialog for a missing meetup', () => {
    const { service, dialog, planetMessageService } = createContext(admin);

    service.openDeleteDialog(undefined, vi.fn());

    expect(dialog.open).not.toHaveBeenCalled();
    expect(planetMessageService.showAlert).toHaveBeenCalledWith('You are not authorized to delete this meetup');
  });

  it('opens the delete dialog for an authorized meetup', () => {
    const { service, dialog, planetMessageService } = createContext(creator);
    const meetup = { _id: 'm1', title: 'Meetup', createdBy: 'ann' };

    service.openDeleteDialog(meetup, vi.fn());

    expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: expect.objectContaining({ displayName: 'Meetup' })
    }));
    expect(planetMessageService.showAlert).not.toHaveBeenCalled();
  });
});
