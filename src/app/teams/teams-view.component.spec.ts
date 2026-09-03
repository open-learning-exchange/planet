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

describe('TeamsViewComponent chat action bar and filtering', () => {
  it('filters team messages by keyword search case-insensitively', () => {
    const component: any = Object.create(TeamsViewComponent.prototype);
    component.news = [
      { doc: { message: 'First team announcement' } },
      { doc: { message: 'Weekly sprint planning' } },
      { doc: { message: 'Lunch break discussion' } }
    ];
    component.selectedLabel = '';
    component.messageSearch = 'sprint';

    component.applyFilters();

    expect(component.filteredNews.length).toBe(1);
    expect(component.filteredNews[0].doc.message).toBe('Weekly sprint planning');
  });

  it('filters team messages by selected label', () => {
    const component: any = Object.create(TeamsViewComponent.prototype);
    component.news = [
      { doc: { message: 'Bug in login', labels: [ 'bug' ] } },
      { doc: { message: 'Frontend update', labels: [ 'frontend' ] } },
      { doc: { message: 'General chat', chat: true } }
    ];
    component.messageSearch = '';
    component.selectedLabel = 'bug';

    component.applyFilters();

    expect(component.filteredNews.length).toBe(1);
    expect(component.filteredNews[0].doc.message).toBe('Bug in login');

    component.selectedLabel = 'shared chat';
    component.applyFilters();

    expect(component.filteredNews.length).toBe(1);
    expect(component.filteredNews[0].doc.message).toBe('General chat');
  });

  it('collects available labels from team customVoiceLabels and messages', () => {
    const component: any = Object.create(TeamsViewComponent.prototype);
    component.team = { customVoiceLabels: [ 'SprintGoal', 'Frontend' ] };
    const news = [
      { doc: { labels: [ 'Frontend', 'Bug' ] } },
      { doc: { viewIn: [ { name: 'Leadership' } ] } },
      { doc: { chat: true } }
    ];

    const labels = component.getAvailableLabels(news);

    expect(labels).toContain('SprintGoal');
    expect(labels).toContain('Frontend');
    expect(labels).toContain('Bug');
    expect(labels).toContain('Leadership');
    expect(labels).toContain('shared chat');
    expect(component.getLabelIcon('shared chat')).toBe('question_answer');
    expect(component.getLabelIcon('Leadership')).toBe('groups');
    expect(component.getLabelIcon('SprintGoal')).toBe('label_important');
  });

  it('updates selectedLabel and applies filters when changeLabelsFilter is triggered', () => {
    const component: any = Object.create(TeamsViewComponent.prototype);
    component.availableLabels = [ 'help', 'frontend' ];
    component.news = [
      { doc: { message: 'Need help with CSS', labels: [ 'help' ] } },
      { doc: { message: 'Frontend refactor', labels: [ 'frontend' ] } }
    ];
    component.messageSearch = '';

    component.changeLabelsFilter({ label: 'help', action: 'select' });

    expect(component.selectedLabel).toBe('help');
    expect(component.filteredNews.length).toBe(1);
    expect(component.filteredNews[0].doc.message).toBe('Need help with CSS');

    component.changeLabelsFilter({ label: 'help', action: 'remove' });

    expect(component.selectedLabel).toBe('');
    expect(component.filteredNews.length).toBe(2);
  });

  it('updates chatToolbarPinTooltip dynamically based on pinned state', () => {
    const component: any = Object.create(TeamsViewComponent.prototype);
    component.pinned = false;
    expect(component.chatToolbarPinTooltip).toBe('Pin Messages Toolbar');

    component.pinned = true;
    expect(component.chatToolbarPinTooltip).toBe('Unpin Messages Toolbar');
  });
});
