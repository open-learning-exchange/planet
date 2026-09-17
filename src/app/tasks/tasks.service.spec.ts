import { of } from 'rxjs';
import { TasksService } from './tasks.service';

describe('TasksService assignee cleanup', () => {
  let couchService: any;
  let service: TasksService;

  beforeEach(() => {
    couchService = {
      findAll: vi.fn(),
      bulkDocs: vi.fn().mockReturnValue(of([])),
      updateDocument: vi.fn().mockReturnValue(of({ doc: {} }))
    };
    service = new TasksService(
      couchService,
      { stop: vi.fn() } as any,
      {} as any,
      {
        configuration: { code: 'planet-a' },
        couchStateListener: vi.fn().mockReturnValue(of(undefined)),
        requestData: vi.fn()
      } as any
    );
  });

  it('preserves a legacy assignment when editing a task', () => {
    const assignee = { userId: 'alex', userPlanetCode: 'planet-a' };

    service.addDialogSubmit(
      {},
      { _id: 'task-1', assignee, assignees: [] },
      { title: 'Updated', deadline: new Date('2026-08-30'), deadlineTime: '09:00' },
      vi.fn()
    );

    const updatedTask = couchService.updateDocument.mock.calls[0][1];
    expect(updatedTask.assignee).toEqual(expect.objectContaining(assignee));
    expect(updatedTask.assignees[0]).toEqual(expect.objectContaining(assignee));
  });

  it('queries array assignees with elemMatch and planet identity', () => {
    couchService.findAll.mockReturnValue(of([]));

    service.removeAssigneeFromTasks('alex', 'planet-a', { teams: 'team-1' }).subscribe();

    const query = couchService.findAll.mock.calls[0][1];
    expect(query.selector.link).toEqual({ teams: 'team-1' });
    expect(query.selector.$or).toContainEqual({
      assignees: { $elemMatch: { userId: 'alex', userPlanetCode: 'planet-a' } }
    });
  });

  it('removes only the matching planet and skips unchanged documents', () => {
    const local = { userId: 'alex', userPlanetCode: 'planet-a' };
    const remote = { userId: 'alex', userPlanetCode: 'planet-b' };
    couchService.findAll.mockReturnValue(of([
      { _id: 'matching', assignee: local, assignees: [ local, remote ] },
      { _id: 'unchanged', assignee: remote, assignees: [ remote ] }
    ]));

    service.removeAssigneeFromTasks('alex', 'planet-a').subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledWith('tasks', [
      { _id: 'matching', assignee: remote, assignees: [ remote ] }
    ]);
  });

  it('removes both associated identities without touching another same-id planet', () => {
    const origin = { userId: 'alex', userPlanetCode: 'planet-b' };
    const local = { userId: 'alex', userPlanetCode: 'planet-a' };
    const other = { userId: 'alex', userPlanetCode: 'planet-c' };
    couchService.findAll.mockReturnValue(of([
      { _id: 'task-1', assignee: origin, assignees: [ origin, local, other ] }
    ]));

    service.removeAssigneeFromTasks('alex', [ 'planet-b', 'planet-a' ]).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledWith('tasks', [
      { _id: 'task-1', assignee: other, assignees: [ other ] }
    ]);
  });
});
