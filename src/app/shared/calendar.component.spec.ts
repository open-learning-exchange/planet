import { of, throwError } from 'rxjs';

import { PlanetCalendarComponent } from './calendar.component';
import { styleVariables } from './utils';

describe('PlanetCalendarComponent', () => {
  const createComponent = (
    couchService: any = {},
    userService: any = { get: () => ({ name: 'admin', isUserAdmin: true, _id: 'org.couchdb.user:admin' }) },
    messageService: any = { showMessage: vi.fn(), showAlert: vi.fn() },
    loadingService: any = { start: vi.fn(), stop: vi.fn() }
  ) => new PlanetCalendarComponent(
    document,
    'en',
    {} as any,
    couchService,
    {} as any,
    {} as any,
    {} as any,
    messageService,
    loadingService,
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

  it('sets editable based on user authorization and recurring status', () => {
    const adminComponent = createComponent({}, { get: () => ({ name: 'admin', isUserAdmin: true, _id: 'admin' }) });
    const userComponent = createComponent({}, { get: () => ({ name: 'user', isUserAdmin: false, _id: 'user' }) });

    expect(adminComponent.eventObject({ title: 'Event', createdBy: 'other', recurring: 'none' }, new Date()).editable).toBe(true);
    expect(userComponent.eventObject({ title: 'Event', createdBy: 'other', recurring: 'none' }, new Date()).editable).toBe(false);
    expect(adminComponent.eventObject({ title: 'Event', createdBy: 'admin', recurring: 'daily' }, new Date()).editable).toBe(false);
  });

  it('updates document on authorized eventDrop and reverts when unauthorized', () => {
    const couchService = { updateDocument: vi.fn(() => of({ ok: true })), findAll: vi.fn(() => of([])) };
    const adminComponent = createComponent(couchService, { get: () => ({ name: 'admin', isUserAdmin: true, _id: 'admin' }) });
    const userComponent = createComponent(couchService, { get: () => ({ name: 'user', isUserAdmin: false, _id: 'user' }) });
    const revert = vi.fn();

    const oldStart = new Date(2026, 7, 10);
    const newStart = new Date(2026, 7, 12);
    const meetup = {
      _id: 'm1',
      title: 'Meetup',
      createdBy: 'admin',
      recurring: 'none',
      startDate: oldStart.getTime(),
      endDate: oldStart.getTime()
    };

    // Unauthorized revert
    userComponent.eventDrop({ event: { extendedProps: { meetup } }, revert });
    expect(revert).toHaveBeenCalled();

    // Authorized update
    adminComponent.eventDrop({
      event: { start: newStart, extendedProps: { meetup } },
      oldEvent: { start: oldStart },
      revert: vi.fn()
    });
    expect(couchService.updateDocument).toHaveBeenCalledWith('meetups', expect.objectContaining({
      _id: 'm1',
      startDate: newStart.getTime(),
      endDate: newStart.getTime()
    }));
  });
});


