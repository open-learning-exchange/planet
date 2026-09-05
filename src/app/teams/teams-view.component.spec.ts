import { TeamsViewComponent } from './teams-view.component';

describe('TeamsViewComponent task projections', () => {
  it('projects secondary assignments and separates same-id members by planet', () => {
    const component: any = Object.create(TeamsViewComponent.prototype);
    const local = { userId: 'alex', userPlanetCode: 'planet-a' };
    const remote = { userId: 'alex', userPlanetCode: 'planet-b' };
    const other = { userId: 'other', userPlanetCode: 'planet-a' };
    const localTask = { _id: 'local', assignees: [ other, local ], completed: false };
    const remoteTask = { _id: 'remote', assignees: [ remote ], completed: false };
    component.members = [ local, remote, other ];
    component.tasksService = { sortedTasks: tasks => tasks };
    component.planetCode = 'planet-a';
    component.userStatus = 'member';
    component.isUserLeader = false;
    component.user = { _id: 'alex', planetCode: 'planet-a' };

    component.setTasks([ localTask, remoteTask ]);

    expect(component.members[0].tasks).toEqual([ localTask ]);
    expect(component.members[1].tasks).toEqual([ remoteTask ]);
    expect(component.taskCount).toBe(1);
  });

  // TEMP NOTE (for review, strip before merge): links are leaders only for now, and they live
  // on the global user doc, so the team leader is deliberately not an editor here.
  it('limits link editing to local leaders, edited by themselves or a planet admin', () => {
    const component: any = Object.create(TeamsViewComponent.prototype);
    component.planetCode = 'planet-a';
    component.currentUserId = 'alex';
    component.user = { _id: 'alex', isUserAdmin: false };
    const leaderDoc = { roles: [ 'leader' ] };

    expect(component.canEditMemberLinks({ userId: 'alex', userPlanetCode: 'planet-a', userDoc: { doc: leaderDoc } })).toBe(true);
    expect(component.canEditMemberLinks({ userId: 'alex', userPlanetCode: 'planet-a', userDoc: { doc: { roles: [] } } })).toBe(false);
    expect(component.canEditMemberLinks({ userId: 'alex', userPlanetCode: 'planet-b', userDoc: { doc: leaderDoc } })).toBe(false);
    expect(component.canEditMemberLinks({ userId: 'bob', userPlanetCode: 'planet-a', userDoc: { doc: leaderDoc } })).toBe(false);

    component.user = { _id: 'alex', isUserAdmin: true };

    expect(component.canEditMemberLinks({ userId: 'bob', userPlanetCode: 'planet-a', userDoc: { doc: leaderDoc } })).toBe(true);
  });

  it('matches membership on the local planet code rather than the user doc planet', () => {
    const component: any = Object.create(TeamsViewComponent.prototype);
    component.planetCode = 'planet-a';
    const user = { _id: 'alex', planetCode: 'planet-b' };

    expect(component.isUserInMemberDocs([ { userId: 'alex', userPlanetCode: 'planet-a' } ], user)).toBe(true);
    expect(component.isUserInMemberDocs([ { userId: 'alex' } ], user)).toBe(true);
    expect(component.isUserInMemberDocs([ { userId: 'alex', userPlanetCode: 'planet-b' } ], user)).toBe(false);
  });
});
