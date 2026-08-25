import { memberCompare } from './teams.utils';
import { TeamsViewComponent } from './teams-view.component';

describe('team member helpers', () => {
  it('does not treat matching user IDs from different planets as the same member', () => {
    expect(memberCompare(
      { userId: 'org.couchdb.user:leader', userPlanetCode: 'planet-a' },
      { userId: 'org.couchdb.user:leader', userPlanetCode: 'planet-b' }
    )).toBe(false);
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
});
