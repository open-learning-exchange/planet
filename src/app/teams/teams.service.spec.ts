import { describe, expect, it } from 'vitest';

import { TeamsService } from './teams.service';

describe('TeamsService notification routing', () => {
  const service = new TeamsService(
    { datePlaceholder: 'now' } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  );

  it('stores a path-only link when the current team URL has tab state', () => {
    const notification = service.teamNotification(
      'message',
      'request',
      { _id: 'user-1' },
      {
        team: { _id: 'team-1' },
        url: '/teams/view/team-1?tab=members#requests'
      }
    );

    expect(notification.link).toBe('/teams/view/team-1');
    expect(notification.linkParams).toEqual({ activeTab: 'members' });
  });

  it('continues stripping legacy matrix parameters from stored links', () => {
    const notification = service.teamNotification(
      'message',
      'message',
      { _id: 'user-1' },
      {
        team: { _id: 'team-1' },
        url: '/teams/view/team-1;activeTab=taskTab?tab=tasks'
      }
    );

    expect(notification.link).toBe('/teams/view/team-1');
  });
});
