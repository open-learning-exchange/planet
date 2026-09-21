import { TeamsComponent } from './teams.component';

describe('TeamsComponent team list', () => {
  it('keeps leader actions when a later matching membership is the leader', () => {
    const component = Object.create(TeamsComponent.prototype) as TeamsComponent;
    const team = { _id: 'team-1', name: 'Team One', teamPlanetCode: 'planet-a' };
    const member = {
      _id: 'member', teamId: team._id, docType: 'membership',
      userId: 'org.couchdb.user:ann', userPlanetCode: 'planet-a', isLeader: false
    };
    const leader = { ...member, _id: 'leader', userPlanetCode: '', isLeader: true };
    component.user = { _id: member.userId, planetCode: 'planet-a' };
    component.planetCode = 'planet-a';
    component.userMembership = [ member, leader ];
    component.teamActivities = [];
    component.childPlanets = [];
    (component as any).stateService = { configuration: { name: 'Planet A' } };

    expect(component.teamList([ team ])[0]).toMatchObject({
      membershipDoc: member,
      userStatus: 'member',
      isLeader: true
    });

    component.userMembership.reverse();
    expect(component.teamList([ team ])[0].isLeader).toBe(true);
  });
});
