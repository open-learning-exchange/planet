import { of, throwError } from 'rxjs';

import { PlanetCalendarComponent } from './calendar.component';
import { styleVariables } from './utils';

describe('PlanetCalendarComponent', () => {
  const createComponent = (
    couchService: any = {},
    userService: any = { get: () => ({ name: 'admin', isUserAdmin: true, _id: 'org.couchdb.user:admin' }) },
    messageService: any = { showMessage: vi.fn(), showAlert: vi.fn() }
  ) => new PlanetCalendarComponent(
    document,
    'en',
    {} as any,
    couchService,
    {} as any,
    {} as any,
    {} as any,
    messageService,
    {} as any,
    userService
  );

  it('preserves the time stored in a task deadline', () => {
    const component = createComponent();
    const deadline = new Date(2026, 7, 7, 15, 30).getTime();

    const event = component.eventObject({ title: 'Task', isTask: true }, deadline, deadline);

    expect(event.start.getTime()).toBe(deadline);
    expect(event.end).toBeUndefined();
    expect(event.allDay).toBe(false);
  });

  it('advances an all-day exclusive end by a local calendar day', () => {
    const component = createComponent();
    const startDate = new Date(2026, 9, 31);
    const endDate = new Date(2026, 10, 1);
    const expectedEnd = new Date(endDate);
    expectedEnd.setHours(0, 0, 0, 0);
    expectedEnd.setDate(expectedEnd.getDate() + 1);

    const event = component.eventObject({ title: 'Meetup' }, startDate, endDate);

    expect(event.end?.getTime()).toBe(expectedEnd.getTime());
    expect(event.end?.getHours()).toBe(0);
  });

  it('omits the end of a timed meetup when no end time is provided', () => {
    const component = createComponent();
    const date = new Date(2026, 7, 7);

    const event = component.eventObject({ title: 'Meetup', startTime: '09:30', endTime: '' }, date, date);

    expect(event.start.getHours()).toBe(9);
    expect(event.start.getMinutes()).toBe(30);
    expect(event.end).toBeUndefined();
    expect(event.allDay).toBe(false);
  });

  it('preserves a later end date for a multi-day timed meetup without an end time', () => {
    const component = createComponent();
    const startDate = new Date(2026, 7, 7);
    const endDate = new Date(2026, 7, 9);

    const event = component.eventObject({ title: 'Meetup', startTime: '09:30', endTime: '' }, startDate, endDate);

    expect(event.end?.getTime()).toBe(endDate.getTime());
    expect(event.end?.getHours()).toBe(0);
  });

  it('uses the task event colors for matching legend swatches', () => {
    const deadline = new Date(2026, 7, 7, 15, 30).getTime();
    const couchService = {
      findAll: () => of([
        { title: 'Open', deadline, completed: false },
        { title: 'Completed', deadline, completed: true }
      ])
    };
    const component = createComponent(couchService);

    component.getTasks();

    expect(component.tasks[0].backgroundColor).toBe(component.eventLegend[1].color);
    expect(component.tasks[1].backgroundColor).toBe(component.eventLegend[2].color);
    expect(component.tasks[0].textColor).toBe(styleVariables.accentText);
    expect(component.tasks[1].textColor).toBe(styleVariables.accentText);
  });

  it('sets editable to true for creator or admin on non-recurring meetups', () => {
    const adminUser = { name: 'admin', isUserAdmin: true, _id: 'org.couchdb.user:admin' };
    const component = createComponent({}, { get: () => adminUser });

    const event = component.eventObject({ title: 'Meetup', createdBy: 'otherUser', recurring: 'none' }, new Date(), new Date());
    expect(event.editable).toBe(true);
  });

  it('sets editable to false for non-creator, non-admin users on meetups', () => {
    const regularUser = { name: 'learner', isUserAdmin: false, _id: 'org.couchdb.user:learner' };
    const component = createComponent({}, { get: () => regularUser });

    const event = component.eventObject({ title: 'Meetup', createdBy: 'admin', recurring: 'none' }, new Date(), new Date());
    expect(event.editable).toBe(false);
  });

  it('sets editable to false for recurring meetups even if user is admin', () => {
    const adminUser = { name: 'admin', isUserAdmin: true, _id: 'org.couchdb.user:admin' };
    const component = createComponent({}, { get: () => adminUser });

    const event = component.eventObject({ title: 'Recurring Meetup', createdBy: 'admin', recurring: 'weekly' }, new Date(), new Date());
    expect(event.editable).toBe(false);
  });

  describe('eventDrop', () => {
    it('reverts and alerts when unauthorized user drops a meetup', () => {
      const regularUser = { name: 'learner', isUserAdmin: false, _id: 'org.couchdb.user:learner' };
      const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
      const revert = vi.fn();
      const component = createComponent({}, { get: () => regularUser }, messageService);

      const info = {
        event: {
          extendedProps: {
            meetup: { _id: 'm1', title: 'Meetup', createdBy: 'teacher', startDate: 1000 }
          }
        },
        revert
      };

      component.eventDrop(info);

      expect(revert).toHaveBeenCalled();
      expect(messageService.showAlert).toHaveBeenCalled();
    });

    it('reverts and alerts when a recurring meetup is dropped', () => {
      const adminUser = { name: 'admin', isUserAdmin: true, _id: 'org.couchdb.user:admin' };
      const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
      const revert = vi.fn();
      const component = createComponent({}, { get: () => adminUser }, messageService);

      const info = {
        event: {
          extendedProps: {
            meetup: { _id: 'm1', title: 'Daily Meetup', createdBy: 'admin', recurring: 'daily', startDate: 1000 }
          }
        },
        revert
      };

      component.eventDrop(info);

      expect(revert).toHaveBeenCalled();
      expect(messageService.showAlert).toHaveBeenCalled();
    });

    it('persists rescheduled single meetup when authorized', () => {
      const adminUser = { name: 'admin', isUserAdmin: true, _id: 'org.couchdb.user:admin' };
      const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
      let updatedDoc: any = null;
      const couchService = {
        updateDocument: vi.fn((db: string, doc: any) => {
          updatedDoc = doc;
          return of({ ok: true });
        }),
        findAll: vi.fn(() => of([]))
      };
      const component = createComponent(couchService, { get: () => adminUser }, messageService);

      const oldStart = new Date(2026, 7, 10, 10, 0);
      const newStart = new Date(2026, 7, 12, 10, 0);
      const deltaMs = newStart.getTime() - oldStart.getTime();

      const originalMeetup = {
        _id: 'm1',
        title: 'Team Meetup',
        createdBy: 'admin',
        recurring: 'none',
        startDate: oldStart.getTime(),
        endDate: oldStart.getTime()
      };

      const info = {
        event: {
          start: newStart,
          oldEvent: { start: oldStart },
          extendedProps: { meetup: originalMeetup }
        },
        oldEvent: { start: oldStart },
        revert: vi.fn()
      };

      component.eventDrop(info);

      expect(couchService.updateDocument).toHaveBeenCalled();
      expect(updatedDoc._id).toBe('m1');
      expect(updatedDoc.startDate).toBe(originalMeetup.startDate + deltaMs);
      expect(updatedDoc.endDate).toBe(originalMeetup.endDate + deltaMs);
      expect(messageService.showMessage).toHaveBeenCalled();
    });

    it('persists rescheduled task deadline when editable', () => {
      const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
      let updatedDoc: any = null;
      const couchService = {
        updateDocument: vi.fn((db: string, doc: any) => {
          updatedDoc = doc;
          return of({ ok: true });
        }),
        findAll: vi.fn(() => of([]))
      };
      const component = createComponent(couchService, undefined, messageService);
      component.editable = true;

      const newDeadline = new Date(2026, 7, 20, 15, 0);
      const originalTask = {
        _id: 't1',
        title: 'Submit Paper',
        isTask: true,
        deadline: new Date(2026, 7, 15, 15, 0).getTime()
      };

      const info = {
        event: {
          start: newDeadline,
          extendedProps: { meetup: originalTask }
        },
        revert: vi.fn()
      };

      component.eventDrop(info);

      expect(couchService.updateDocument).toHaveBeenCalledWith('tasks', expect.objectContaining({
        _id: 't1',
        deadline: newDeadline.getTime()
      }));
      expect(messageService.showMessage).toHaveBeenCalled();
    });

    it('reverts when updateDocument fails with an error', () => {
      const adminUser = { name: 'admin', isUserAdmin: true, _id: 'org.couchdb.user:admin' };
      const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
      const revert = vi.fn();
      const couchService = {
        updateDocument: vi.fn(() => throwError(() => new Error('CouchDB error')))
      };
      const component = createComponent(couchService, { get: () => adminUser }, messageService);

      const info = {
        event: {
          start: new Date(2026, 7, 12),
          extendedProps: {
            meetup: { _id: 'm1', title: 'Meetup', createdBy: 'admin', recurring: 'none', startDate: 1000 }
          }
        },
        oldEvent: { start: new Date(2026, 7, 10) },
        revert
      };

      component.eventDrop(info);

      expect(revert).toHaveBeenCalled();
      expect(messageService.showAlert).toHaveBeenCalled();
    });
  });
});

