import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';

import { NotificationsComponent } from './notifications.component';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { NotificationsService } from './notifications.service';
import { ChallengesService } from '../shared/challenges/challenges.service';

describe('NotificationsComponent', () => {
  let component: NotificationsComponent;
  let fixture: ComponentFixture<NotificationsComponent>;
  let mockCouchService: any;
  let mockUserService: any;
  let mockNotificationsService: any;
  let mockChallengesService: any;
  let notificationStateChange$: Subject<void>;

  const sampleNotifications = [
    {
      _id: 'notif_1',
      _rev: '1-abc',
      status: 'unread',
      message: 'New assignment uploaded',
      time: 1700000000000,
      link: '/courses',
      linkParams: {}
    },
    {
      _id: 'notif_2',
      _rev: '1-def',
      status: 'read',
      message: 'Course completed successfully',
      time: 1699000000000,
      link: null
    }
  ];

  beforeEach(async () => {
    notificationStateChange$ = new Subject<void>();

    mockCouchService = {
      findAll: vi.fn().mockReturnValue(of(sampleNotifications)),
      put: vi.fn().mockReturnValue(of({ id: 'notif_1', rev: '2-xyz' }))
    };

    mockUserService = {
      get: vi.fn().mockReturnValue({ name: 'test_user', isUserAdmin: false }),
      notificationStateChange$: notificationStateChange$.asObservable(),
      setNotificationStateChange: vi.fn()
    };

    mockNotificationsService = {
      setNotificationsAsRead: vi.fn()
    };

    mockChallengesService = {
      getChallengeForNotification: vi.fn().mockReturnValue(null),
      getActiveChallenge: vi.fn().mockReturnValue(null),
      openChallengeDialog: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ NotificationsComponent ],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: CouchService, useValue: mockCouchService },
        { provide: UserService, useValue: mockUserService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ChallengesService, useValue: mockChallengesService },
        { provide: MatDialog, useValue: { open: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
  });

  it('should create component and load notifications', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(mockCouchService.findAll).toHaveBeenCalled();
    expect(component.notifications.data.length).toBe(2);
    expect(component.anyUnread).toBe(true);
  });

  it('should render distinct unread indicator dot with aria-label on unread notifications', () => {
    fixture.detectChanges();

    const unreadDots = fixture.debugElement.queryAll(By.css('.km-unread-dot'));
    expect(unreadDots.length).toBe(1);

    const dotElement = unreadDots[0].nativeElement;
    expect(dotElement.getAttribute('aria-label')).toBe('Unread notification');
    expect(dotElement.getAttribute('role')).toBe('status');

    const rows = fixture.debugElement.queryAll(By.css('mat-row'));
    expect(rows.length).toBe(2);
    expect(rows[0].nativeElement.classList.contains('unread-row')).toBe(true);
    expect(rows[1].nativeElement.classList.contains('unread-row')).toBe(false);
  });

  it('should mark an unread notification as read when clicked', () => {
    fixture.detectChanges();

    const unreadNotif = component.notifications.data[0];
    component.readNotification(unreadNotif);

    expect(mockCouchService.put).toHaveBeenCalledWith(
      'notifications/notif_1',
      expect.objectContaining({ status: 'read' })
    );
    expect(mockUserService.setNotificationStateChange).toHaveBeenCalled();
  });

  it('should filter notifications by status', () => {
    fixture.detectChanges();

    component.onFilterChange('unread');
    expect(component.filter.status).toBe('unread');
    expect(component.notifications.filter).toBe(' ');

    component.onFilterChange('all');
    expect(component.filter.status).toBe('all');
    expect(component.notifications.filter).toBe('');
  });

  it('should call setNotificationsAsRead when Mark all as Read is triggered', () => {
    fixture.detectChanges();
    component.readAllNotification();
    expect(mockNotificationsService.setNotificationsAsRead).toHaveBeenCalledWith(component.notifications.data);
  });
});
