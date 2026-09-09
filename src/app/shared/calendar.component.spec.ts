import { of, Subject, throwError } from 'rxjs';

import { PlanetCalendarComponent } from './calendar.component';
import { styleVariables } from './utils';

describe('PlanetCalendarComponent', () => {
  const createComponent = (
    couchService: any = {},
    userService: any = { get: () => ({ name: 'admin', isUserAdmin: true, _id: 'org.couchdb.user:admin' }) },
    messageService: any = { showMessage: vi.fn(), showAlert: vi.fn() },
    loadingService: any = { start: vi.fn(), stop: vi.fn() },
    tasksService: any = {}
  ) => new PlanetCalendarComponent(
    document,
    'en',
    {} as any,
    couchService,
    {} as any,
    tasksService,
    {} as any,
    messageService,
    loadingService,
    userService
  );

  const adminUser = { get: () => ({ name: 'admin', isUserAdmin: true, _id: 'admin' }) };
  const meetup = {
    _id: 'm1',
    title: 'Meetup',
    createdBy: 'admin',
    recurring: 'none',
    startDate: new Date(2026, 7, 10).getTime(),
    endDate: new Date(2026, 7, 10).getTime()
  };
  const dropInfo = (event: any, delta: any = { days: 2, milliseconds: 0 }) => ({
    event: { setExtendedProp: vi.fn(), ...event },
    delta,
    revert: vi.fn()
  });
  // Echoes back what CouchDB returns for a write: the stored doc carrying the new revision
  const writingCouchService = () => ({
    updateDocument: vi.fn((db: string, doc: any) => of({ ok: true, rev: '2-new', doc: { ...doc, _rev: '2-new' } })),
    findAll: vi.fn(() => of([]))
  });

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

  it('disables event resizing, which the drop handler cannot persist', () => {
    expect(createComponent().calendarOptions.eventDurationEditable).toBe(false);
  });

  it('shifts both meetup dates by whole calendar days', () => {
    const couchService = writingCouchService();
    const component = createComponent(couchService, adminUser);

    component.eventDrop(dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup } }));

    expect(couchService.updateDocument).toHaveBeenCalledWith('meetups', expect.objectContaining({
      _id: 'm1',
      startDate: new Date(2026, 7, 12).getTime(),
      endDate: new Date(2026, 7, 12).getTime()
    }));
  });

  // Diverges from millisecond arithmetic only when the suite runs in a timezone that observes the
  // transition these dates cross, e.g. TZ=America/New_York npx vitest run
  it('preserves a multi-day span dragged across a daylight saving change', () => {
    const couchService = writingCouchService();
    const component = createComponent(couchService, adminUser);
    // Nov 3 - Nov 7 2026 sits after the US fall transition, so a 4 day drag back crosses it
    const startDate = new Date(2026, 10, 3);
    const endDate = new Date(2026, 10, 7);
    const expectedStart = new Date(2026, 10, 3);
    const expectedEnd = new Date(2026, 10, 7);
    expectedStart.setDate(expectedStart.getDate() - 4);
    expectedEnd.setDate(expectedEnd.getDate() - 4);

    const multiDay = { ...meetup, startDate: startDate.getTime(), endDate: endDate.getTime() };
    component.eventDrop(dropInfo(
      { start: new Date(2026, 9, 30), extendedProps: { meetup: multiDay } },
      { days: -4, milliseconds: 0 }
    ));

    const updated = couchService.updateDocument.mock.calls[0][1];
    expect(updated.startDate).toBe(expectedStart.getTime());
    expect(updated.endDate).toBe(expectedEnd.getTime());
    expect(new Date(updated.endDate).getHours()).toBe(0);
  });

  it('routes a task drop through the tasks service so task listeners refresh', () => {
    const couchService = writingCouchService();
    const tasksService = { addTask: vi.fn((doc: any) => of({ ok: true, doc: { ...doc, _rev: '2-new' } })) };
    const component = createComponent(couchService, adminUser, undefined, undefined, tasksService);
    const deadline = new Date(2026, 7, 12, 15, 30);
    const info = dropInfo({
      start: deadline,
      extendedProps: { meetup: { _id: 't1', title: 'Task', isTask: true, deadline: new Date(2026, 7, 10, 15, 30).getTime() } }
    });

    component.eventDrop(info);

    expect(tasksService.addTask).toHaveBeenCalledWith(expect.objectContaining({ _id: 't1', deadline: deadline.getTime() }));
    expect(couchService.updateDocument).not.toHaveBeenCalled();
    // isTask has to survive so a second drag still takes the task branch
    expect(info.event.setExtendedProp).toHaveBeenCalledWith('meetup', expect.objectContaining({ _rev: '2-new', isTask: true }));
  });

  it('carries the stored revision back onto the event so a second drag does not conflict', () => {
    const couchService = writingCouchService();
    const component = createComponent(couchService, adminUser);
    const info = dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup: { ...meetup, _rev: '1-old' } } });

    component.eventDrop(info);

    expect(info.event.setExtendedProp).toHaveBeenCalledWith('meetup', expect.objectContaining({
      _id: 'm1',
      _rev: '2-new',
      startDate: new Date(2026, 7, 12).getTime()
    }));
  });

  it('keeps the loading indicator up until the refetch settles', () => {
    const meetupSubject = new Subject<any[]>();
    const couchService = {
      updateDocument: vi.fn((db: string, doc: any) => of({ ok: true, rev: '2-new', doc })),
      findAll: vi.fn(() => meetupSubject)
    };
    const loadingService = { start: vi.fn(), stop: vi.fn() };
    const component = createComponent(couchService, adminUser, undefined, loadingService);

    component.eventDrop(dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup } }));

    expect(loadingService.start).toHaveBeenCalled();
    expect(loadingService.stop).not.toHaveBeenCalled();

    meetupSubject.next([]);
    meetupSubject.complete();

    expect(loadingService.stop).toHaveBeenCalled();
  });

  it('reports success even if the refetch after a write fails', () => {
    const couchService = {
      updateDocument: vi.fn((db: string, doc: any) => of({ ok: true, rev: '2-new', doc })),
      findAll: vi.fn(() => throwError(() => new Error('offline')))
    };
    const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
    const component = createComponent(couchService, adminUser, messageService);
    const info = dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup } });

    component.eventDrop(info);

    expect(messageService.showMessage).toHaveBeenCalled();
    expect(info.revert).not.toHaveBeenCalled();
    expect(messageService.showAlert).not.toHaveBeenCalled();
  });

  it('reverts a task drop on a calendar the user cannot edit', () => {
    const tasksService = { addTask: vi.fn(() => of({ ok: true })) };
    const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
    const component = createComponent({}, adminUser, messageService, undefined, tasksService);
    component.editable = false;
    const info = dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup: { _id: 't1', isTask: true } } });

    component.eventDrop(info);

    expect(info.revert).toHaveBeenCalled();
    expect(tasksService.addTask).not.toHaveBeenCalled();
    expect(messageService.showAlert).toHaveBeenCalled();
  });

  it('reverts an unauthorized meetup drop without writing', () => {
    const couchService = writingCouchService();
    const component = createComponent(couchService, { get: () => ({ name: 'user', isUserAdmin: false, _id: 'user' }) });
    const info = dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup } });

    component.eventDrop(info);

    expect(info.revert).toHaveBeenCalled();
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('reverts a drop that has no new start instead of writing an epoch date', () => {
    const couchService = writingCouchService();
    const component = createComponent(couchService, adminUser);
    const info = dropInfo({ start: null, extendedProps: { meetup } });

    component.eventDrop(info);

    expect(info.revert).toHaveBeenCalled();
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('reverts and alerts when persisting a meetup drop fails', () => {
    const couchService = { updateDocument: vi.fn(() => throwError(() => new Error('conflict'))), findAll: vi.fn(() => of([])) };
    const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
    const loadingService = { start: vi.fn(), stop: vi.fn() };
    const component = createComponent(couchService, adminUser, messageService, loadingService);
    const info = dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup } });

    component.eventDrop(info);

    expect(info.revert).toHaveBeenCalled();
    expect(messageService.showAlert).toHaveBeenCalled();
    expect(messageService.showMessage).not.toHaveBeenCalled();
    expect(loadingService.stop).toHaveBeenCalled();
  });

  it('reverts and alerts when persisting a task drop fails', () => {
    const tasksService = { addTask: vi.fn(() => throwError(() => new Error('conflict'))) };
    const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
    const component = createComponent({ findAll: vi.fn(() => of([])) }, adminUser, messageService, undefined, tasksService);
    const info = dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup: { _id: 't1', isTask: true } } });

    component.eventDrop(info);

    expect(info.revert).toHaveBeenCalled();
    expect(messageService.showAlert).toHaveBeenCalled();
  });
});
