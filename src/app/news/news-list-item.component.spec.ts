import { of } from 'rxjs';
import { vi } from 'vitest';
import { DeviceType } from '../shared/device-info.service';
import { NewsListItemComponent } from './news-list-item.component';

describe('NewsListItemComponent notifications', () => {
  const setup = (currentUser: any) => {
    const notificationsService = {
      sendNotificationToUser: vi.fn().mockReturnValue(of({}))
    };
    const component = new NewsListItemComponent(
      { url: '/news' } as any,
      { get: () => currentUser } as any,
      { datePlaceholder: 'now' } as any,
      {} as any,
      notificationsService as any,
      { configuration: { code: 'nation-n' } } as any,
      {} as any,
      {} as any,
      {} as any,
      { watchDeviceType: () => of(DeviceType.DESKTOP) } as any
    );
    return { component, notificationsService };
  };

  it('notifies a same-named author on another planet', () => {
    const { component, notificationsService } = setup({
      _id: 'org.couchdb.user:alex',
      name: 'alex',
      planetCode: 'nation-n'
    });

    component.sendNewsNotifications({
      _id: 'news-1',
      createdOn: 'community-c',
      user: { _id: 'org.couchdb.user:alex', name: 'alex' },
      viewableBy: 'community'
    });

    expect(notificationsService.sendNotificationToUser).toHaveBeenCalledWith(expect.objectContaining({
      user: 'org.couchdb.user:alex',
      userPlanetCode: 'community-c',
      type: 'replyMessage'
    }));
  });

  it('does not notify the author when the composite identity matches', () => {
    const { component, notificationsService } = setup({
      _id: 'org.couchdb.user:alex',
      name: 'alex',
      planetCode: 'nation-n'
    });

    component.sendNewsNotifications({
      _id: 'news-1',
      createdOn: 'nation-n',
      user: {
        _id: 'org.couchdb.user:alex',
        name: 'alex',
        planetCode: 'nation-n'
      },
      viewableBy: 'nation'
    });

    expect(notificationsService.sendNotificationToUser).not.toHaveBeenCalled();
  });

  it('does not notify an associated parent account for its own home-planet post', () => {
    const { component, notificationsService } = setup({
      _id: 'org.couchdb.user:alex@community-c',
      name: 'alex@community-c',
      planetCode: 'community-c',
      requestId: 'community-registration-request-1'
    });

    component.sendNewsNotifications({
      _id: 'news-1',
      createdOn: 'community-c',
      user: {
        _id: 'org.couchdb.user:alex',
        name: 'alex',
        planetCode: 'community-c'
      },
      viewableBy: 'community'
    });

    expect(notificationsService.sendNotificationToUser).not.toHaveBeenCalled();
  });
});
