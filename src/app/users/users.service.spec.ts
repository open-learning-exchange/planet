import { NEVER, of } from 'rxjs';
import { vi } from 'vitest';
import { UsersService } from './users.service';

describe('UsersService notifications', () => {
  it('routes role notifications through the recipient planet and stable CouchDB ID', () => {
    const notificationsService = {
      sendNotificationToUser: vi.fn().mockReturnValue(of({}))
    };
    const service = new UsersService(
      { datePlaceholder: 'now' } as any,
      {} as any,
      { couchStateListener: () => NEVER } as any,
      {} as any,
      notificationsService as any
    );

    service.sendNotifications({
      _id: 'alex@community-c',
      couchId: 'org.couchdb.user:alex',
      planetCode: 'community-c'
    }).subscribe();

    expect(notificationsService.sendNotificationToUser).toHaveBeenCalledWith({
      user: 'org.couchdb.user:alex',
      userPlanetCode: 'community-c',
      message: 'You were assigned a new role',
      link: '/myDashboard',
      type: 'newRole',
      priority: 1,
      status: 'unread',
      time: 'now'
    });
  });
});
