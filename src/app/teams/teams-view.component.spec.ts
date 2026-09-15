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

  it('matches membership on the local planet code rather than the user doc planet', () => {
    const component: any = Object.create(TeamsViewComponent.prototype);
    component.planetCode = 'planet-a';
    const user = { _id: 'alex', planetCode: 'planet-b' };

    expect(component.isUserInMemberDocs([ { userId: 'alex', userPlanetCode: 'planet-a' } ], user)).toBe(true);
    expect(component.isUserInMemberDocs([ { userId: 'alex' } ], user)).toBe(true);
    expect(component.isUserInMemberDocs([ { userId: 'alex', userPlanetCode: 'planet-b' } ], user)).toBe(false);
  });
});
