import { of } from 'rxjs';

import { DialogsChatShareComponent } from './dialogs-chat-share.component';

describe('DialogsChatShareComponent', () => {
  const createComponent = (memberships = []) => {
    const teamsService = {
      getTeamMembers: jasmine.createSpy('getTeamMembers').and.returnValue(of(memberships)),
      sendNotifications: jasmine.createSpy('sendNotifications')
    };

    const component = new DialogsChatShareComponent(
      {} as any,
      {} as any,
      {} as any,
      { group: () => ({}) } as any,
      {} as any,
      teamsService as any,
      {} as any,
      { get: () => ({ _id: 'user-1', planetCode: 'planet-a' }) } as any,
      {} as any,
    );

    return { component, teamsService };
  };

  it('filters to membership docs only', (done) => {
    const { component } = createComponent([
      { docType: 'membership', userId: 'u:amy', name: 'Amy' },
      { docType: 'request', userId: 'u:zoe', name: 'Zoe' }
    ]);

    component.getTeamMembers({ _id: 'team-1' }).subscribe((members) => {
      expect(members.length).toBe(1);
      expect(members[0].userId).toBe('u:amy');
      done();
    });
  });

  it('sorts members by shared name comparator when userDoc is missing', (done) => {
    const { component } = createComponent([
      { docType: 'membership', userId: 'user:zoe' },
      { docType: 'membership', userId: 'user:amy' },
      { docType: 'membership', userId: 'user:mia', userDoc: { fullName: 'Mia Fox' } }
    ]);

    component.getTeamMembers({ _id: 'team-1' }).subscribe((members) => {
      expect(members.map(member => member.userId)).toEqual([
        'user:amy',
        'user:mia',
        'user:zoe'
      ]);
      done();
    });
  });
});
