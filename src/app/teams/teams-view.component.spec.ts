import { of } from 'rxjs';
import { vi } from 'vitest';
import { DialogsAddTableComponent } from '../shared/dialogs/dialogs-add-table.component';
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

  it('uses one spinner owner when adding a member from the dialog', () => {
    const component: any = Object.create(TeamsViewComponent.prototype);
    const dialogsLoadingService = { start: vi.fn(), stop: vi.fn() };
    const dialogRef = { close: vi.fn() };
    let dialogCfg: any;
    component.dialog = { open: vi.fn((_, cfg) => (dialogCfg = cfg, dialogRef)) };
    component.dialogsLoadingService = dialogsLoadingService;
    component.members = [];
    component.planetMessageService = { showMessage: vi.fn() };
    component.teamsService = { addMembers: () => of({ ok: true }), sendNotifications: () => of({}) };
    component.router = { url: '/teams/t1' };
    component.team = { _id: 't1' };
    component.requests = [];
    component.getMembers = () => of([]);

    component.openInviteMemberDialog();
    const selected = { _id: 'u1' };
    const addTable = new DialogsAddTableComponent(dialogRef as any, dialogCfg.data, dialogsLoadingService as any);
    addTable.usersComponent = {
      usersTable: { tableData: { data: [ selected ] }, selection: { selected: [ selected ] } }
    } as any;
    addTable.ok();

    expect(dialogCfg.data.noSpinner).toBe(true);
    expect(dialogsLoadingService.start).toHaveBeenCalledTimes(1);
    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
