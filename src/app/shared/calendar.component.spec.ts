import { vi } from 'vitest';
import { ElementRef } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';

import { PlanetCalendarComponent } from './calendar.component';
import { styleVariables } from './utils';

describe('PlanetCalendarComponent read-only behavior', () => {
  const createComponent = () => {
    const dialog = { open: vi.fn() };
    const authService = { checkAuthenticationStatus: vi.fn(() => of(undefined)) };
    const component = new PlanetCalendarComponent(
      { documentElement: { lang: 'en' } } as any,
      'en',
      dialog as any,
      {} as any,
      authService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      new ElementRef(document.createElement('div')),
      { runOutsideAngular: (fn: () => void) => fn() } as any
    );
    component.editable = false;

    return { authService, component, dialog };
  };

  it('does not open add-event flows when read-only', () => {
    const { authService, component, dialog } = createComponent();

    (component.calendarOptions.select as (event: any) => void)({ start: new Date() });
    component.openAddEventDialog({ start: new Date() });

    expect(authService.checkAuthenticationStatus).not.toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('uses the latest editable value when a date range is selected', () => {
    const { authService, component, dialog } = createComponent();
    const selection = { start: new Date('2026-01-01'), end: new Date('2026-01-02') };

    component.editable = true;
    (component.calendarOptions.select as (event: any) => void)(selection);

    expect(authService.checkAuthenticationStatus).toHaveBeenCalledOnce();
    expect(dialog.open).toHaveBeenCalledOnce();
  });

  it('does not authenticate from a stale add-event button after becoming read-only', () => {
    const { authService, component, dialog } = createComponent();
    component.editable = true;
    vi.spyOn(component, 'getMeetups').mockImplementation(() => undefined);
    vi.spyOn(component, 'getTasks').mockImplementation(() => undefined);
    component.ngOnInit();

    component.editable = false;
    (component.buttons as any).addEventButton.click({ start: new Date() });

    expect(authService.checkAuthenticationStatus).not.toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
  });
});

describe('PlanetCalendarComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  const createComponent = (
    couchService: any = {},
    meetupService: any = { canEditMeetup: () => true },
    messageService: any = { showMessage: vi.fn(), showAlert: vi.fn() },
    loadingService: any = { start: vi.fn(), stop: vi.fn() },
    tasksService: any = {},
    notificationsService: any = { notifyMeetupChange: vi.fn(() => of({ ok: true })) },
    dialog: any = {},
    element = document.createElement('div')
  ) => new PlanetCalendarComponent(
    document,
    'en',
    dialog,
    couchService,
    {} as any,
    tasksService,
    {} as any,
    messageService,
    loadingService,
    new ElementRef(element),
    { runOutsideAngular: (fn: () => void) => fn() } as any,
    meetupService,
    notificationsService
  );

  const authorized = { canEditMeetup: () => true };
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

  it('re-measures the calendar once its container reports a width', () => {
    const updateSize = vi.fn();
    let notify: (entries: any[]) => void;
    let runFrame: FrameRequestCallback;
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: (entries: any[]) => void) {
        notify = callback;
      }
      observe() {}
      disconnect() {}
    });
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      runFrame = callback;
      return 1;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const component = createComponent();
    component.calendar = { getApi: () => ({ updateSize }) };

    component.ngAfterViewInit();
    notify([ { contentRect: { width: 0 } } ]);
    notify([ { contentRect: { width: 800 } } ]);
    notify([ { contentRect: { width: 400 } } ]);
    runFrame(0);

    expect(updateSize).toHaveBeenCalledOnce();

    notify([ { contentRect: { width: 400 } } ]);

    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);

    notify([ { contentRect: { width: 200 } } ]);

    component.ngOnDestroy();

    expect(cancelAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it('survives a resize reported before the calendar has an api', () => {
    let notify: (entries: any[]) => void;
    let runFrame: FrameRequestCallback;
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: (entries: any[]) => void) {
        notify = callback;
      }
      observe() {}
      disconnect() {}
    });
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      runFrame = callback;
      return 1;
    }));
    const component = createComponent();
    component.calendar = { getApi: () => null };

    component.ngAfterViewInit();

    expect(() => {
      notify([ { contentRect: { width: 800 } } ]);
      runFrame(0);
    }).not.toThrow();
    component.ngOnDestroy();
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

  it('sets editable from the shared authorization and recurring status', () => {
    const allowed = createComponent({}, { canEditMeetup: () => true });
    const denied = createComponent({}, { canEditMeetup: () => false });

    expect(allowed.eventObject({ title: 'Event', createdBy: 'other', recurring: 'none' }, new Date()).editable).toBe(true);
    expect(denied.eventObject({ title: 'Event', createdBy: 'other', recurring: 'none' }, new Date()).editable).toBe(false);
    expect(allowed.eventObject({ title: 'Event', createdBy: 'admin', recurring: 'daily' }, new Date()).editable).toBe(false);
  });

  it('asks the shared predicate with this calendar team and read-only context', () => {
    const meetupService = { canEditMeetup: vi.fn(() => true) };
    const component = createComponent({}, meetupService);
    component.leaderOfTeamId = 'team-1';
    component.editable = false;
    const teamMeetup = { title: 'Event', recurring: 'none', link: { teams: 'team-1' } };

    component.eventObject(teamMeetup, new Date());

    expect(meetupService.canEditMeetup).toHaveBeenCalledWith(teamMeetup, { leaderOfTeamId: 'team-1', readOnly: true });
  });

  it('disables event resizing, which the drop handler cannot persist', () => {
    expect(createComponent().calendarOptions.eventDurationEditable).toBe(false);
  });

  it('shifts both meetup dates by whole calendar days', () => {
    const couchService = writingCouchService();
    const component = createComponent(couchService, authorized);

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
    const component = createComponent(couchService, authorized);
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
    const component = createComponent(couchService, authorized, undefined, undefined, tasksService);
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
    const component = createComponent(couchService, authorized);
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
    const component = createComponent(couchService, authorized, undefined, loadingService);

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
      findAll: vi.fn(() => throwError(new Error('offline')))
    };
    const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
    const component = createComponent(couchService, authorized, messageService);
    const info = dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup } });

    component.eventDrop(info);

    expect(messageService.showMessage).toHaveBeenCalled();
    expect(info.revert).not.toHaveBeenCalled();
    expect(messageService.showAlert).not.toHaveBeenCalled();
  });

  it('leaves a meetup without an end date without one', () => {
    const couchService = writingCouchService();
    const component = createComponent(couchService, authorized);
    const { endDate, ...openEnded } = meetup;

    component.eventDrop(dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup: openEnded } }));

    expect(couchService.updateDocument.mock.calls[0][1]).not.toHaveProperty('endDate');
  });

  it('notifies shelf users once after a successful reschedule', () => {
    const couchService = writingCouchService();
    const notificationsService = { notifyMeetupChange: vi.fn(() => of({ ok: true })) };
    const component = createComponent(couchService, authorized, undefined, undefined, undefined, notificationsService);

    component.eventDrop(dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup } }));

    expect(notificationsService.notifyMeetupChange).toHaveBeenCalledTimes(1);
    expect(notificationsService.notifyMeetupChange).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'm1', startDate: new Date(2026, 7, 12).getTime() }),
      'm1'
    );
  });

  it('does not notify when the meetup write fails', () => {
    const couchService = { updateDocument: vi.fn(() => throwError(new Error('conflict'))), findAll: vi.fn(() => of([])) };
    const notificationsService = { notifyMeetupChange: vi.fn(() => of({ ok: true })) };
    const component = createComponent(couchService, authorized, undefined, undefined, undefined, notificationsService);

    component.eventDrop(dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup } }));

    expect(notificationsService.notifyMeetupChange).not.toHaveBeenCalled();
  });

  it('keeps a stored reschedule when notifying fails', () => {
    const couchService = writingCouchService();
    const notificationsService = { notifyMeetupChange: vi.fn(() => throwError(new Error('offline'))) };
    const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
    const component = createComponent(couchService, authorized, messageService, undefined, undefined, notificationsService);
    const info = dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup } });

    component.eventDrop(info);

    expect(messageService.showMessage).toHaveBeenCalled();
    expect(info.revert).not.toHaveBeenCalled();
    expect(messageService.showAlert).not.toHaveBeenCalled();
  });

  it('reverts a task drop on a calendar the user cannot edit', () => {
    const tasksService = { addTask: vi.fn(() => of({ ok: true })) };
    const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
    const component = createComponent({}, authorized, messageService, undefined, tasksService);
    component.editable = false;
    const info = dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup: { _id: 't1', isTask: true } } });

    component.eventDrop(info);

    expect(info.revert).toHaveBeenCalled();
    expect(tasksService.addTask).not.toHaveBeenCalled();
    expect(messageService.showAlert).toHaveBeenCalled();
  });

  it('reverts an unauthorized meetup drop without writing', () => {
    const couchService = writingCouchService();
    const component = createComponent(couchService, { canEditMeetup: () => false });
    const info = dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup } });

    component.eventDrop(info);

    expect(info.revert).toHaveBeenCalled();
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('reverts a drop that has no new start instead of writing an epoch date', () => {
    const couchService = writingCouchService();
    const component = createComponent(couchService, authorized);
    const info = dropInfo({ start: null, extendedProps: { meetup } });

    component.eventDrop(info);

    expect(info.revert).toHaveBeenCalled();
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('reverts and alerts when persisting a meetup drop fails', () => {
    const couchService = { updateDocument: vi.fn(() => throwError(new Error('conflict'))), findAll: vi.fn(() => of([])) };
    const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
    const loadingService = { start: vi.fn(), stop: vi.fn() };
    const component = createComponent(couchService, authorized, messageService, loadingService);
    const info = dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup } });

    component.eventDrop(info);

    expect(info.revert).toHaveBeenCalled();
    expect(messageService.showAlert).toHaveBeenCalled();
    expect(messageService.showMessage).not.toHaveBeenCalled();
    expect(loadingService.stop).toHaveBeenCalled();
  });

  it('reverts and alerts when persisting a task drop fails', () => {
    const tasksService = { addTask: vi.fn(() => throwError(new Error('conflict'))) };
    const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
    const component = createComponent({ findAll: vi.fn(() => of([])) }, authorized, messageService, undefined, tasksService);
    const info = dropInfo({ start: new Date(2026, 7, 12), extendedProps: { meetup: { _id: 't1', isTask: true } } });

    component.eventDrop(info);

    expect(info.revert).toHaveBeenCalled();
    expect(messageService.showAlert).toHaveBeenCalled();
  });
  it('passes matching team-leader context into the meetup dialog', () => {
    const dialog = { open: vi.fn() };
    const component = createComponent({}, undefined, undefined, undefined, undefined, undefined, dialog);
    component.leaderOfTeamId = 'team-1';
    const linkedMeetup = { _id: 'm1', link: { teams: 'team-1' } };

    component.eventClick({ event: { extendedProps: { meetup: linkedMeetup } } });

    expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: expect.objectContaining({ leaderOfTeamId: 'team-1', meetup: linkedMeetup })
    }));
  });
});
