import { of } from 'rxjs';
import { vi } from 'vitest';
import { NotificationsService } from './notifications.service';

describe('NotificationsService reply notifications', () => {
  afterEach(() => vi.restoreAllMocks());

  const createService = (couchOverrides: any = {}, userOverrides: any = {}) => {
    const couchService = {
      findAll: vi.fn().mockReturnValue(of([])),
      bulkDocs: vi.fn().mockReturnValue(of([])),
      updateDocument: vi.fn().mockReturnValue(of({})),
      ...couchOverrides
    };
    const userService = {
      get: vi.fn().mockReturnValue({ name: 'learner1', ...userOverrides }),
      setNotificationStateChange: vi.fn()
    };
    const planetMessageService = {
      showAlert: vi.fn()
    };
    const service = new NotificationsService(
      userService as any,
      couchService as any,
      planetMessageService as any
    );
    return { service, couchService, userService };
  };

  it('retrieves unread replyTo IDs for the current user', () => {
    const mockNotifications = [
      { _id: 'n1', type: 'replyMessage', replyTo: 'voice-123', status: 'unread' },
      { _id: 'n2', type: 'replyMessage', replyTo: 'voice-456', status: 'unread' }
    ];
    const { service } = createService({
      findAll: vi.fn().mockReturnValue(of(mockNotifications))
    });

    let result: string[] = [];
    service.getUnreadReplyIds$().subscribe(ids => {
      result = ids;
    });

    expect(result).toEqual(['voice-123', 'voice-456']);
  });

  it('marks matching unread notifications as read when viewing a thread', () => {
    const mockNotifications = [
      { _id: 'n1', type: 'replyMessage', replyTo: 'voice-123', status: 'unread' }
    ];
    const bulkDocsSpy = vi.fn().mockReturnValue(of([]));
    const { service, userService } = createService({
      findAll: vi.fn().mockReturnValue(of(mockNotifications)),
      bulkDocs: bulkDocsSpy
    });

    service.markReplyNotificationsAsRead('voice-123');

    expect(bulkDocsSpy).toHaveBeenCalledWith('notifications', [
      { _id: 'n1', type: 'replyMessage', replyTo: 'voice-123', status: 'read' }
    ]);
    expect(userService.setNotificationStateChange).toHaveBeenCalled();
  });
});
