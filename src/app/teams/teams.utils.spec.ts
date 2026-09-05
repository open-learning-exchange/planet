import { isTeamFull, memberCompare } from './teams.utils';
import { TeamsViewComponent } from './teams-view.component';

describe('team member helpers', () => {
  it('does not treat matching user IDs from different planets as the same member', () => {
    expect(memberCompare(
      { userId: 'org.couchdb.user:leader', userPlanetCode: 'planet-a' },
      { userId: 'org.couchdb.user:leader', userPlanetCode: 'planet-b' }
    )).toBe(false);
  });

  it('does not report a team as full when its limit is missing or zero', () => {
    expect(isTeamFull(3, undefined)).toBe(false);
    expect(isTeamFull(3, 0)).toBe(false);
  });

  it('reports a team as full once its own limit is reached', () => {
    expect(isTeamFull(4, 4)).toBe(true);
    expect(isTeamFull(3, 4)).toBe(false);
  });

  it('does not grant leader access from a non-authoritative membership document', () => {
    const component = Object.create(TeamsViewComponent.prototype) as any;
    component.requests = [];
    component.members = [ {
      userId: 'org.couchdb.user:member',
      userPlanetCode: 'local',
      isLeader: true
    } ];
    component.planetCode = 'local';
    component.route = { snapshot: { params: {} } };

    component.setStatus(
      {},
      { userId: 'org.couchdb.user:actual-leader', userPlanetCode: 'local' },
      { _id: 'org.couchdb.user:member', planetCode: 'local' }
    );

    expect(component.isUserLeader).toBe(false);
  });

  it('derives custom labels from the current team document', () => {
    const component = Object.create(TeamsViewComponent.prototype) as any;
    component.team = { customVoiceLabels: [ 'Initial' ] };
    expect(component.customVoiceLabels).toEqual([ 'Initial' ]);

    component.team = { customVoiceLabels: [ 'Updated' ] };
    expect(component.customVoiceLabels).toEqual([ 'Updated' ]);
  });

  it('limits planet-level label managers to locally owned teams', () => {
    const component = Object.create(TeamsViewComponent.prototype) as any;
    component.isUserLeader = false;
    component.planetCode = 'local';
    component.team = { teamPlanetCode: 'remote' };
    component.user = { isUserAdmin: false };
    component.userService = { doesUserHaveRole: () => true };

    expect(component.canManageLabels).toBe(false);

    component.team.teamPlanetCode = 'local';
    expect(component.canManageLabels).toBe(true);
  });

  it('allows a team leader to manage labels regardless of the team planet', () => {
    const component = Object.create(TeamsViewComponent.prototype) as any;
    component.isUserLeader = true;
    component.planetCode = 'local';
    component.team = { teamPlanetCode: 'remote' };
    component.user = { isUserAdmin: false };
    component.userService = { doesUserHaveRole: () => false };

    expect(component.canManageLabels).toBe(true);
  });
});
